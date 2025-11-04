'use client'

import { useState } from 'react'
import type { PlaceholderInfo } from '@/types/placeholders'

interface FileUploadProps {
  onFileUploaded: (previewText: string, detected: Map<string, PlaceholderInfo>, templateFilename: string) => void
}

export default function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')

      // build map of placeholders
      const map = new Map<string, PlaceholderInfo>()
      (data.placeholders || []).forEach((p: any) => {
        map.set(p.key, {
          key: p.key,
          originalFormat: `{{${p.key}}}`,
          index: p.position,
          prefix: p.key.toLowerCase().includes('amount') || p.key.toLowerCase().includes('valuation') ? '$' : '',
          context: p.context || undefined,
        })
      })

      onFileUploaded(data.previewText || '', map, data.templateFilename)
    } catch (err: any) {
      console.error('Upload failed', err)
      setError(String(err?.message || err))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center bg-white dark:bg-gray-950">
      <h2 className="text-2xl font-semibold mb-4">Upload a Legal Document (.docx)</h2>
      <input type="file" accept=".docx" onChange={handleFileChange} className="mb-4 cursor-pointer" />
      {isUploading && <p className="text-gray-500 dark:text-gray-400">Normalizing document and extracting placeholders...</p>}
      {error && <p className="text-red-500 mt-2">{error}</p>}
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">The server will auto-normalize split runs and detect placeholders.</p>
    </div>
  )
}
