/* eslint-disable @typescript-eslint/no-explicit-any */

'use client'

import { useState } from 'react'
import mammoth from 'mammoth'
import { filter } from 'jszip'

interface FileUploadProps {
  onFileUploaded: (content: string, detected: Map<any, any>, buffer: ArrayBuffer) => void
}

export default function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)

    const buffer = await file.arrayBuffer()

    // Extract plain text from .docx
    const { value: text } = await mammoth.extractRawText({ arrayBuffer: buffer })

    // Detect placeholders like [Company Name]
    const regex = /\[[^\]]+\]/g
    const matches = text.match(regex) || []
    const unique = [...new Set(matches.map(m => m.trim()))]
    const filtered = unique.filter(p => !/^\[_+\]$/.test(p))

    const detected = new Map()
    filtered.forEach((m, i) => {
      detected.set(m.replace(/\[|\]/g, ''), {
        key: m.replace(/\[|\]/g, ''),
        originalFormat: m,
        index: i,
        prefix: m.includes('$') ? '$' : ''
      })
    })

    onFileUploaded(text, detected, buffer)
    setIsUploading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-12 text-center bg-white dark:bg-gray-950">
      <h2 className="text-2xl font-semibold mb-4">Upload a Legal Document</h2>
      <input
        type="file"
        accept=".docx"
        onChange={handleFileChange}
        className="mb-4 cursor-pointer"
      />
      {isUploading && (
        <p className="text-gray-500 dark:text-gray-400">Processing document...</p>
      )}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Supported format: .docx
      </p>
    </div>
  )
}
