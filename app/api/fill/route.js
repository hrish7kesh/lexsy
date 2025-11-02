import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";

export async function POST(req) {
  try {
    const { mapping } = await req.json();
    const templatePath = path.join(process.cwd(), "uploads");
    const files = await fs.readdir(templatePath);
    if (files.length === 0) return NextResponse.json({ error: "No template file found" });

    // Use the most recently uploaded file
    const latestFile = path.join(templatePath, files[files.length - 1]);
    const content = await fs.readFile(latestFile, "binary");

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

    // Clean mapping keys (remove brackets)
    const cleanData = {};
    for (const [key, val] of Object.entries(mapping)) {
      const newKey = key.replace(/\[|\]/g, "").trim();
      cleanData[newKey] = val;
    }

    doc.setData(cleanData);

    try {
      doc.render();
    } catch (error) {
      console.error("Render error:", error);
      return NextResponse.json({ error: "Failed to fill template" }, { status: 500 });
    }

    const buffer = doc.getZip().generate({ type: "nodebuffer" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": "attachment; filename=filled_document.docx",
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error generating filled document" }, { status: 500 });
  }
}
