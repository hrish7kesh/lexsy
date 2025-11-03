/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import PizZip from 'pizzip'
import mammoth from 'mammoth'

type Placeholder = {
  raw: string        // original like "[Company Name]"
  key: string        // normalized key e.g. "Company Name"
  position: number   // index in document.xml for rough ordering
  context?: 'company' | 'investor' | null
}

const UPLOAD_DIR = path.join(process.cwd(), 'uploads')

function isBlankUnderscore(s: string) {
  return /^_+$/.test(s.replace(/\s/g, ''))
}

// Normalize bracketed placeholders that may be split across runs:
// strategy:
// - extract the document.xml as string
// - find all <w:t>...</w:t> text nodes and treat them as sequential text runs
// - scan runs concatenating text to find '[' ... ']' spans across runs
// - when a bracket-span found, build the inner key and rewrite the first run's text to '{{Key}}' and empty subsequent runs in that span
// - skip spans that are only underscores
async function normalizeDocxAndExtractPlaceholders(buffer: Buffer) {
  const zip = new PizZip(buffer)
  const docXmlFile = zip.file('word/document.xml')
  if (!docXmlFile) throw new Error('word/document.xml not found in docx')

  const xml = await docXmlFile.async('string')

  // Regex to match each text node exactly including surrounding tags
  const wTRegex = /(<w:t[^>]*>)([\s\S]*?)(<\/w:t>)/gi
  const matches: {
    fullMatch: string
    openTag: string
    text: string
    closeTag: string
    indexInXml: number
  }[] = []

  let m
  while ((m = wTRegex.exec(xml)) !== null) {
    matches.push({
      fullMatch: m[0],
      openTag: m[1],
      text: m[2],
      closeTag: m[3],
      indexInXml: m.index,
    })
  }

  // Build a plain-text index to find bracket spans across runs
  // We'll scan matches sequentially
  const placeholdersFound: Placeholder[] = []
  const newTexts = matches.map(x => x.text) // mutable

  let i = 0
  while (i < matches.length) {
    const text = matches[i].text
    const openPos = text.indexOf('[')

    if (openPos === -1) {
      i++
      continue
    }

    // Found '[' inside run i — find closing ']' maybe across runs
    let spanText = text.substring(openPos + 1) // after '['
    let endRun = i
    let endOffsetInRun = -1
    let foundClose = text.indexOf(']') !== -1

    if (!foundClose) {
      // advance runs until we find a closing bracket
      let j = i + 1
      for (; j < matches.length; j++) {
        const t = matches[j].text
        const closePos = t.indexOf(']')
        if (closePos !== -1) {
          endRun = j
          endOffsetInRun = closePos
          // add intermediate texts
          for (let k = i + 1; k <= j; k++) {
            spanText += (matches[k].text || '')
          }
          foundClose = true
          break
        } else {
          spanText += t
        }
      }
    } else {
      endRun = i
      endOffsetInRun = text.indexOf(']')
      spanText = text.substring(openPos + 1, endOffsetInRun)
    }

    if (!foundClose) {
      // no closing bracket found -> skip this '[' occurrence to avoid corrupting XML
      // move to next run after i
      i++
      continue
    }

    // Clean the inner key
    let inner = spanText.replace(/\s+/g, ' ').trim()
    // If inner contains only underscores or is too short, skip it (these are visual blanks)
    if (inner.length === 0 || isBlankUnderscore(inner.replace(/[\u00A0]/g, ''))) {
      // blank placeholder -> we will remove brackets by replacing runs content to remove '[' and ']' so it doesn't appear as a placeholder
      // Replace the first run from '[' onward with content before '['
      const beforeBracket = matches[i].text.substring(0, openPos)
      newTexts[i] = beforeBracket
      // In endRun remove after ']' portion
      if (endRun === i) {
        newTexts[endRun] = matches[endRun].text.substring(endOffsetInRun + 1)
      } else {
        newTexts[endRun] = matches[endRun].text.substring(endOffsetInRun + 1)
        // clear intermediate runs between i+1 and endRun-1
        for (let k = i + 1; k < endRun; k++) newTexts[k] = ''
      }
      // move pointer after endRun
      i = endRun + 1
      continue
    }

    // Normalize ambiguous "name" / "title" to context-aware keys later
    // For now keep inner as-is (we will infer context below)
    const position = matches[i].indexInXml

    // Determine context: look back some characters in xml around matches[i]
    const beforeWindowStart = Math.max(0, matches[i].indexInXml - 400)
    const beforeText = xml.substring(beforeWindowStart, matches[i].indexInXml).toLowerCase()
    let context: 'company' | 'investor' | null = null
    if (beforeText.includes('investor')) context = 'investor'
    if (beforeText.includes('company') && !beforeText.includes('investor')) context = 'company'

    // Build normalized display key
    let displayKey = inner
    const lower = inner.toLowerCase()
    if (lower === 'name') {
      displayKey = context === 'investor' ? 'Investor Name' : (context === 'company' ? 'Company Name' : 'Name')
    } else if (lower === 'title') {
      displayKey = context === 'investor' ? 'Investor Title' : (context === 'company' ? 'Company Title' : 'Title')
    } else {
      displayKey = inner
    }

    // Replace bracketed runs: put the {{displayKey}} into the first run, empty the others
    // Preserve any text before '[' in first run, and text after ']' in last run
    const beforeBracket = matches[i].text.substring(0, openPos)
    const afterBracket = matches[endRun].text.substring((endOffsetInRun === -1 ? 0 : endOffsetInRun + 1))
    newTexts[i] = beforeBracket + `{{${displayKey}}}` + afterBracket

    for (let k = i + 1; k <= endRun; k++) {
      if (k !== i) newTexts[k] = ''
    }

    // Record placeholder
    placeholdersFound.push({
      raw: `[${inner}]`,
      key: displayKey,
      position,
      context,
    })

    // Continue scanning after endRun
    i = endRun + 1
  } // end while over matches

  // Now rebuild xml with updated texts
  let rebuiltXml = xml
  // We'll replace the original <w:t>...<\/w:t> sequences one by one
  // To avoid messing indexes, iterate matches from last to first and replace fullMatch with updated
  for (let idx = matches.length - 1; idx >= 0; idx--) {
    const mm = matches[idx]
    const newFull = `${mm.openTag}${escapeXml(newTexts[idx])}${mm.closeTag}`
    // Replace only the first occurrence of mm.fullMatch at mm.indexInXml
    // Use slice to avoid global replace
    rebuiltXml = rebuiltXml.slice(0, mm.indexInXml) + newFull + rebuiltXml.slice(mm.indexInXml + mm.fullMatch.length)
  }

  // Put rebuilt xml back in zip
  zip.file('word/document.xml', rebuiltXml)
  const newDocBuffer = zip.generate({ type: 'nodebuffer' })

  // Extract unique normalized placeholders (order by position)
  const uniqueMap = new Map<string, Placeholder>()
  for (const p of placeholdersFound) {
    if (!uniqueMap.has(p.key)) uniqueMap.set(p.key, p)
  }

  return { buffer: newDocBuffer as Buffer, placeholders: Array.from(uniqueMap.values()) }
}

// helper to escape XML special chars in text nodes
function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as any
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // create uploads dir
    await fs.mkdir(UPLOAD_DIR, { recursive: true })

    // Save original copy
    const ts = Date.now()
    const originalName = `uploaded-${ts}.docx`
    const originalPath = path.join(UPLOAD_DIR, originalName)
    await fs.writeFile(originalPath, buffer)

    // Normalize and extract placeholders
    const { buffer: normalizedBuffer, placeholders } = await normalizeDocxAndExtractPlaceholders(buffer)

    // Save normalized version
    const normalizedName = `normalized-${ts}.docx`
    const normalizedPath = path.join(UPLOAD_DIR, normalizedName)
    await fs.writeFile(normalizedPath, normalizedBuffer)

    // Also extract plain text (optional) using mammoth for metadata / previews
    let plainText = ''
    try {
      const { value } = await mammoth.extractRawText({ buffer: normalizedBuffer })
      plainText = value || ''
    } catch (e) {
      // ignore
    }

    // Return placeholders (array of keys), and the filename to use later when filling
    return NextResponse.json({
      placeholders: placeholders.map(p => ({ key: p.key, position: p.position, context: p.context || null })),
      templateFilename: normalizedName,
      originalFilename: originalName,
      previewText: plainText.slice(0, 2000),
    })
  } catch (err: any) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 })
  }
}
