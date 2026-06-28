import fs from "node:fs";
import path from "node:path";

const outDir = new URL(".", import.meta.url);

function pdfObject(id, body) {
  return `${id} 0 obj\n${body}\nendobj\n`;
}

function writeScannedStylePdf() {
  const objects = [
    pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    pdfObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    pdfObject(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << >> /Contents 4 0 R >>"),
  ];

  const drawingCommands = [
    "0.96 0.96 0.99 rg",
    "0 0 612 792 re f",
    "0.45 0.39 0.74 RG",
    "3 w",
    "72 650 468 70 re S",
    "72 540 468 70 re S",
    "72 430 468 70 re S",
    "0.75 0.75 0.82 RG",
    "1 w",
    "100 682 m 500 682 l S",
    "100 572 m 430 572 l S",
    "100 462 m 470 462 l S",
    "120 630 70 18 re f",
    "120 520 110 18 re f",
    "120 410 95 18 re f",
  ].join("\n");

  objects.push(pdfObject(4, `<< /Length ${Buffer.byteLength(drawingCommands)} >>\nstream\n${drawingCommands}\nendstream`));

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  fs.writeFileSync(new URL("dummy-scanned-ocr-needed.pdf", outDir), pdf);
}

function writeTextPdf() {
  const clinicalText = "Bucharest Endometriosis Clinic. MRI pelvis May 2026 shows suspected rectosigmoid involvement. Patient had surgery in May 2022. Pathology report is unavailable.";
  const stream = `BT\n/F1 14 Tf\n72 720 Td\n(${clinicalText.replace(/[()\\]/g, "\\$&")}) Tj\nET`;
  const objects = [
    pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    pdfObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    pdfObject(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>"),
    pdfObject(4, `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`),
    pdfObject(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += object;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  fs.writeFileSync(new URL("dummy-text-mri-report.pdf", outDir), pdf);
}

function dicomElement(group, element, vr, value) {
  const valueBuffer = Buffer.from(value.padEnd(value.length + (value.length % 2), " "), "ascii");
  const header = Buffer.alloc(8);
  header.writeUInt16LE(group, 0);
  header.writeUInt16LE(element, 2);
  header.write(vr, 4, 2, "ascii");
  header.writeUInt16LE(valueBuffer.length, 6);
  return Buffer.concat([header, valueBuffer]);
}

function writeDummyDicom() {
  const preamble = Buffer.alloc(128, 0);
  const magic = Buffer.from("DICM", "ascii");
  const elements = [
    dicomElement(0x0002, 0x0010, "UI", "1.2.840.10008.1.2.1"),
    dicomElement(0x0010, 0x0010, "PN", "ENDO^DUMMY"),
    dicomElement(0x0008, 0x0020, "DA", "20260628"),
    dicomElement(0x0008, 0x0060, "CS", "MR"),
    dicomElement(0x0008, 0x1030, "LO", "Dummy pelvis MRI for EndoLab testing"),
    dicomElement(0x0008, 0x103e, "LO", "Sagittal T2 dummy series"),
    dicomElement(0x0008, 0x0070, "LO", "EndoLab Test Generator"),
    dicomElement(0x0028, 0x0010, "US", "512"),
    dicomElement(0x0028, 0x0011, "US", "512"),
  ];

  fs.writeFileSync(new URL("dummy-pelvis-mri.dcm", outDir), Buffer.concat([preamble, magic, ...elements]));
}

writeScannedStylePdf();
writeTextPdf();
writeDummyDicom();

console.log(`Created ${path.join(fileURLToPath(outDir), "dummy-scanned-ocr-needed.pdf")}`);
console.log(`Created ${path.join(fileURLToPath(outDir), "dummy-text-mri-report.pdf")}`);
console.log(`Created ${path.join(fileURLToPath(outDir), "dummy-pelvis-mri.dcm")}`);

function fileURLToPath(url) {
  return decodeURIComponent(url.pathname);
}
