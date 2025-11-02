"use client";
import { useState } from "react";

export default function Home() {
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [chatStarted, setChatStarted] = useState(false);
  const [filledFile, setFilledFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Handle file upload and placeholder detection
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);
    setPlaceholders(data.placeholders || []);
    setChatStarted(false);
    setAnswers({});
    setFilledFile(null);
  }

  // Start chat
  function startChat() {
    if (placeholders.length > 0) setChatStarted(true);
  }

  // Handle user input during chat
  function handleAnswer(answer: string) {
    const currentPlaceholder = placeholders[currentIndex];
    const newAnswers = { ...answers, [currentPlaceholder]: answer };
    setAnswers(newAnswers);

    if (currentIndex + 1 < placeholders.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      generateFilledDocument(newAnswers);
    }
  }

  // Generate filled document
  async function generateFilledDocument(data: Record<string, string>) {
    setLoading(true);
    const res = await fetch("/api/fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapping: data }),
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setFilledFile(url);
    setLoading(false);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">🧾 Legal Document Placeholder Assistant</h1>

      <input
        type="file"
        accept=".docx"
        onChange={handleUpload}
        className="border p-3 rounded mb-6 cursor-pointer bg-gray-800 text-gray-200"
      />

      {loading && <p>Processing...</p>}

      {/* Step 1: Detected placeholders */}
      {!chatStarted && placeholders.length > 0 && (
        <div className="transition-all duration-300 transform hover:scale-[1.01] mb-6">
          <div className="text-left bg-gray-800 text-white p-4 rounded-lg w-full max-w-xl shadow-lg">
            <h2 className="font-semibold mb-3 text-lg text-blue-300">Detected Placeholders:</h2>
            <ul className="list-disc pl-6 space-y-1">
              {placeholders.map((p, i) => (
                <li key={i} className="text-gray-100">{p}</li>
              ))}
            </ul>
          </div>
          <button
            onClick={startChat}
            className="mt-4 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-semibold"
          >
            Start Filling Chat 💬
          </button>
        </div>
      )}

      {/* Step 2: Chat UI */}
      {chatStarted && currentIndex < placeholders.length && (
        <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg">
          <p className="text-lg text-blue-300 mb-3">
            {`Let's fill the document!`}
          </p>
          <p className="mb-4">{`What should go in ${placeholders[currentIndex]}?`}</p>
          <ChatInput onSubmit={handleAnswer} />
        </div>
      )}

      {/* Step 3: Download */}
      {filledFile && (
        <div className="mt-6">
          <a
            href={filledFile}
            download="filled_document.docx"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-semibold"
          >
            Download Filled Document 📄
          </a>
        </div>
      )}
    </main>
  );
}

function ChatInput({ onSubmit }: { onSubmit: (answer: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) {
          onSubmit(value.trim());
          setValue("");
        }
      }}
      className="flex gap-2"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type your answer..."
        className="flex-grow p-2 rounded bg-gray-700 text-white border border-gray-600"
      />
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-semibold"
      >
        Send
      </button>
    </form>
  );
}
