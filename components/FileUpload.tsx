// fileBuffer is ArrayBuffer; get xml
import PizZip from 'pizzip'
// ...read buffer
const zip = new PizZip(buffer);
const documentXml = zip.file("word/document.xml").async("string"); // await needed

// Use regex on documentXml for placeholders
const placeholderRegex = /\[([^\]]+)\]/g;
const detected = new Map();
let match;
while ((match = placeholderRegex.exec(documentXml)) !== null) {
  const raw = match[0]; // e.g. "[name]"
  const keyInner = match[1].trim(); // e.g. "name" or "Company Name" or "_____________"
  const index = match.index;

  // Filter out blank-only underscores
  if (/^_+$/.test(keyInner) || keyInner.length <= 1) continue;

  // Infer context by looking backwards a chunk of XML/text
  const before = documentXml.slice(Math.max(0, index - 400), index).toLowerCase();
  let context: 'company' | 'investor' | null = null;
  if (before.includes('company') && !before.includes('investor')) context = 'company';
  if (before.includes('investor') && !before.includes('company')) context = 'investor';

  // Normalize ambiguous keys
  let normalizedKey = keyInner;
  if (normalizedKey.toLowerCase() === 'name') {
    normalizedKey = context === 'investor' ? 'Investor Name' : (context === 'company' ? 'Company Name' : 'Name');
  }
  if (normalizedKey.toLowerCase() === 'title') {
    normalizedKey = context === 'investor' ? 'Investor Title' : (context === 'company' ? 'Company Title' : 'Title');
  }

  // store
  detected.set(normalizedKey, {
     key: normalizedKey,
     originalFormat: raw,
     position: index,
     context,
  });
}
