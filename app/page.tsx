"use client";
import { useState } from "react";

export default function Home() {
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setLoading(true);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setLoading(false);
    setPlaceholders(data.placeholders || []);
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-black-900 text-white">
      <h1 className="text-3xl font-bold mb-6">🧾 Legal Document Placeholder Finder</h1>

      <input
        type="file"
        accept=".docx"
        onChange={handleUpload}
        className="border p-3 rounded mb-6 cursor-pointer"
      />

      {loading && <p>Processing file...</p>}

      {placeholders.length > 0 && (
        <div className="text-left bg-gray-100 p-4 rounded w-full max-w-xl">
          <h2 className="font-semibold mb-2">Detected Placeholders:</h2>
          <ul className="list-disc pl-6">
            {placeholders.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
