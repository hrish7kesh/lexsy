import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { readFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const uploadDir = path.join(process.cwd(), "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, file.name);
    await fs.writeFile(filePath, buffer);

    const docBuffer = readFileSync(filePath);
    const { value: text } = await mammoth.extractRawText({ buffer: docBuffer });
    let placeholders = [...new Set(text.match(/\[[^\]]+\]/g))] || [];
    placeholders = placeholders.filter(p => !/^\[_+\]$/.test(p.trim()) && p.trim().length > 2);

    return NextResponse.json({ placeholders });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error processing document" }, { status: 500 });
  }
}
