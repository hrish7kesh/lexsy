/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const mapping = body.mapping || {}
    const templateFilename = body.template || null

    if (!templateFilename) {
      return NextResponse.json({ error: 'No template specified' }, { status: 400 })
    }

    const templatePath = path.join(UPLOAD_DIR, templateFilename)
    const exists = await fs.access(templatePath).then(() => true).catch(() => false)
    if (!exists) return NextResponse.json({ error: 'Template not found' }, { status: 404 })

    // Read binary as 'binary' string (docxtemplater expects binary)
    const content = await fs.readFile(templatePath, 'binary')

    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

    doc.setData(mapping)

    try {
      doc.render()
    } catch (e: any) {
      console.error('Docxtemplater render error:', e)
      // Return message (do not include large stack)
      return NextResponse.json({ error: 'Failed to render template: ' + (e?.message || String(e)) }, { status: 500 })
    }

    const filledBuffer = doc.getZip().generate({ type: 'nodebuffer' })

    return new NextResponse(filledBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename=filled_document.docx',
      },
    })
  } catch (err: any) {
    console.error('Fill error:', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
