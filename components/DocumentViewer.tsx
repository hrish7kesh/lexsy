/* eslint-disable @typescript-eslint/no-explicit-any */

'use client'

import { saveAs } from 'file-saver'

interface DocumentViewerProps {
  completedContent: string
  filledData: Map<any, any>
  fileBuffer: ArrayBuffer
}

export default function DocumentViewer({ completedContent, filledData }: DocumentViewerProps) {
  const handleDownload = async () => {
    const blob = new Blob([completedContent], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    saveAs(blob, 'filled_document.docx')
  }

  return (
    <div className="flex flex-col items-center bg-white dark:bg-gray-950 rounded-xl shadow-lg p-8 w-full max-w-3xl">
      <h2 className="text-2xl font-semibold mb-4">✅ Document Completed</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        All placeholders have been filled. You can now download your completed document.
      </p>
      <button
        onClick={handleDownload}
        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
      >
        Download .docx
      </button>
      <div className="mt-6 w-full bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-left max-h-80 overflow-y-auto text-sm text-gray-800 dark:text-gray-300 whitespace-pre-wrap">
        {completedContent.slice(0, 2000)}
        {completedContent.length > 2000 && '...'}
      </div>
    </div>
  )
}
