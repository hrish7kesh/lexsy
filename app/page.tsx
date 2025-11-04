'use client'
import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import DocumentProcessor from '@/components/DocumentProcessor'
import DocumentViewer from '@/components/DocumentViewer'
import { PlaceholderInfo, PlaceholderData } from '@/types/placeholders'

export default function HomePage() {
  const [documentContent, setDocumentContent] = useState<string>('')
  const [placeholders, setPlaceholders] = useState<Map<string, PlaceholderInfo>>(new Map())
  const [templateFilename, setTemplateFilename] = useState<string>('')
  const [completedContent, setCompletedContent] = useState<string>('')
  const [filledData, setFilledData] = useState<Map<string, PlaceholderData>>(new Map())

  const handleFileUploaded = (previewText: string, detected: Map<string, PlaceholderInfo>, tplFilename: string) => {
    setDocumentContent(previewText)
    setPlaceholders(detected)
    setTemplateFilename(tplFilename)
  }

  const handleDocumentCompleted = (content: string, filled: Map<string, PlaceholderData>, buffer: ArrayBuffer) => {
    setCompletedContent(content)
    setFilledData(filled)
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
          templateFilename={templateFilename}
          onDocumentCompleted={handleDocumentCompleted}
        />
      ) : (
        <DocumentViewer completedContent={completedContent} filledData={filledData} fileBuffer={new ArrayBuffer(0)} />
      )}
    </main>
  )
}
