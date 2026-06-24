const buckets = new Map<string, { count: number; resetAt: number }>();

export function enforceRateLimit(request: Request, options: { limit: number; windowMs: number; key: string }) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const client = forwarded || request.headers.get("x-real-ip") || "local";
  const bucketKey = `${options.key}:${client}`;
  const now = Date.now();
  const current = buckets.get(bucketKey);

  if (!current || current.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  current.count += 1;
  if (current.count > options.limit) {
    return {
      retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  return null;
}

export function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function isAllowedClinicalFile(file: File) {
  const allowedTypes = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/dicom",
    "application/octet-stream",
  ]);
  return file.size <= 20 * 1024 * 1024 && allowedTypes.has(file.type || "application/octet-stream");
}
