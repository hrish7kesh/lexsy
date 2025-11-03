import { PlaceholderInfo, PlaceholderData } from '@/types/placeholder'

'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import DocumentProcessor from '@/components/DocumentProcessor'
import DocumentViewer from '@/components/DocumentViewer'

export default function HomePage() {
  const [documentContent, setDocumentContent] = useState('')
  const [placeholders, setPlaceholders] = useState(new Map())
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [completedContent, setCompletedContent] = useState('')
  const [filledData, setFilledData] = useState(new Map())

  const handleFileUploaded = (
  content: string,
  detected: Map<string, PlaceholderInfo>,
  buffer: ArrayBuffer
) => {
  setDocumentContent(content)
  setPlaceholders(detected)
  setFileBuffer(buffer)
}

const handleDocumentCompleted = (
  content: string,
  filled: Map<string, PlaceholderData>,
  buffer: ArrayBuffer
) => {
  setCompletedContent(content)
  setFilledData(filled)
  setFileBuffer(buffer)
}


  return (
    <main className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white flex flex-col items-center p-6">
      <h1 className="text-3xl font-semibold mb-8">🧾 Legal Document Assistant</h1>
      {!documentContent ? (
        <FileUpload onFileUploaded={handleFileUploaded} />
      ) : !completedContent ? (
        <DocumentProcessor
          documentContent={documentContent}
          placeholders={placeholders}
          fileBuffer={fileBuffer!}
          onDocumentCompleted={handleDocumentCompleted}
        />
      ) : (
        <DocumentViewer
          completedContent={completedContent}
          filledData={filledData}
          fileBuffer={fileBuffer!}
        />
      )}
    </main>
  )
}
