import { extractCaseIntelligence } from "./document-extraction.ts";

export type DicomMetadata = {
  patientName?: string;
  studyDate?: string;
  modality?: string;
  studyDescription?: string;
  seriesDescription?: string;
  manufacturer?: string;
  rows?: number;
  columns?: number;
  transferSyntaxUid?: string;
};

export type DocumentExtractionResult = {
  text: string;
  status: "extracted" | "needs_ocr" | "unsupported" | "empty";
  warning?: string;
};

function decodePdfString(value: string) {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\([0-7]{3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)))
    .replace(/\s+/g, " ")
    .trim();
}

function decodePdfHex(value: string) {
  const hex = value.replace(/\s+/g, "");
  const bytes: number[] = [];
  for (let index = 0; index < hex.length - 1; index += 2) {
    bytes.push(parseInt(hex.slice(index, index + 2), 16));
  }
  return Buffer.from(bytes).toString("utf16le").replace(/\0/g, "").trim() || Buffer.from(bytes).toString("latin1").trim();
}

export function extractTextFromPdfBuffer(buffer: Buffer): DocumentExtractionResult {
  const raw = buffer.toString("latin1");
  const chunks: string[] = [];

  const literalMatches = raw.matchAll(/\((?:\\.|[^\\)]){2,}\)\s*T[jJ]/g);
  for (const match of literalMatches) {
    const literal = match[0].replace(/\)\s*T[jJ]$/, "").slice(1);
    if (literal) chunks.push(decodePdfString(literal));
  }

  const arrayMatches = raw.matchAll(/\[((?:\s*(?:\((?:\\.|[^\\)])*\)|<[\da-fA-F\s]+>)\s*)+)\]\s*TJ/g);
  for (const match of arrayMatches) {
    const arrayContent = match[1];
    const parts: string[] = [];
    for (const literal of arrayContent.matchAll(/\(((?:\\.|[^\\)])*)\)|<([\da-fA-F\s]+)>/g)) {
      if (literal[1]) parts.push(decodePdfString(literal[1]));
      if (literal[2]) parts.push(decodePdfHex(literal[2]));
    }
    if (parts.length) chunks.push(parts.join(" "));
  }

  const text = chunks.join("\n").replace(/[^\S\r\n]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

  if (text.length >= 20) {
    return { text, status: "extracted" };
  }

  return {
    text: "",
    status: "needs_ocr",
    warning: "No extractable PDF text was found. This is likely a scanned PDF and needs OCR.",
  };
}

function readAscii(buffer: Buffer, offset: number, length: number) {
  return buffer.subarray(offset, offset + length).toString("ascii");
}

function readTagValue(buffer: Buffer, group: number, element: number) {
  const littleEndianTag = Buffer.from([group & 0xff, group >> 8, element & 0xff, element >> 8]);
  const offset = buffer.indexOf(littleEndianTag);
  if (offset === -1 || offset + 12 >= buffer.length) return undefined;

  const vr = readAscii(buffer, offset + 4, 2);
  const usesLongLength = ["OB", "OD", "OF", "OL", "OW", "SQ", "UC", "UR", "UT", "UN"].includes(vr);
  const lengthOffset = usesLongLength ? offset + 8 : offset + 6;
  const valueOffset = usesLongLength ? offset + 12 : offset + 8;
  const length = usesLongLength ? buffer.readUInt32LE(lengthOffset) : buffer.readUInt16LE(lengthOffset);
  if (length <= 0 || length > 512 || valueOffset + length > buffer.length) return undefined;
  return buffer.subarray(valueOffset, valueOffset + length).toString("latin1").replace(/\0/g, "").trim();
}

function readNumberTag(buffer: Buffer, group: number, element: number) {
  const value = readTagValue(buffer, group, element);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseDicomMetadata(buffer: Buffer): DicomMetadata | null {
  const hasPreamble = buffer.length > 132 && buffer.subarray(128, 132).toString("ascii") === "DICM";
  const hasLikelyTags = buffer.indexOf(Buffer.from([0x08, 0x00, 0x60, 0x00])) !== -1;
  if (!hasPreamble && !hasLikelyTags) return null;

  return {
    patientName: readTagValue(buffer, 0x0010, 0x0010),
    studyDate: readTagValue(buffer, 0x0008, 0x0020),
    modality: readTagValue(buffer, 0x0008, 0x0060),
    studyDescription: readTagValue(buffer, 0x0008, 0x1030),
    seriesDescription: readTagValue(buffer, 0x0008, 0x103e),
    manufacturer: readTagValue(buffer, 0x0008, 0x0070),
    rows: readNumberTag(buffer, 0x0028, 0x0010),
    columns: readNumberTag(buffer, 0x0028, 0x0011),
    transferSyntaxUid: readTagValue(buffer, 0x0002, 0x0010),
  };
}

export function classifyUploadedDocument(file: File, buffer: Buffer) {
  const lowerName = file.name.toLowerCase();
  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    const pdf = extractTextFromPdfBuffer(buffer);
    const intelligence = pdf.text ? extractCaseIntelligence(pdf.text) : null;
    return {
      kind: "pdf" as const,
      extraction: pdf,
      intelligence,
      label: pdf.status === "extracted" ? `PDF text extracted from ${file.name}` : `PDF uploaded; OCR needed for ${file.name}`,
    };
  }
  if (file.type.startsWith("image/")) {
    return {
      kind: "image" as const,
      extraction: { text: "", status: "needs_ocr" as const, warning: "Image files require OCR before text can be structured." },
      intelligence: null,
      label: `Image uploaded; OCR needed for ${file.name}`,
    };
  }
  if (file.type === "application/dicom" || lowerName.endsWith(".dcm")) {
    const metadata = parseDicomMetadata(buffer);
    return {
      kind: "dicom" as const,
      metadata,
      extraction: { text: "", status: "unsupported" as const, warning: "DICOM pixel viewing requires a dedicated imaging viewer; EndoLab shows metadata and secure file access." },
      intelligence: null,
      label: metadata?.modality ? `DICOM ${metadata.modality} study uploaded: ${metadata.studyDescription ?? file.name}` : `DICOM study uploaded: ${file.name}`,
    };
  }
  return {
    kind: "other" as const,
    extraction: { text: "", status: "unsupported" as const, warning: "This file type is stored but not parsed." },
    intelligence: null,
    label: `Document uploaded: ${file.name}`,
  };
}
