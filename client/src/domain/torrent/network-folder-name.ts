const WINDOWS_RESERVED_NAMES = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9"
])

export function buildNetworkFolderName(
  networkTitle: string,
  networkId: string
): string {
  const readableTitle = sanitizeFolderSegment(networkTitle)
  const shortNetworkId = networkId.slice(0, 8)

  return `${readableTitle}--${shortNetworkId}`
}

export function sanitizeFolderSegment(value: string): string {
  const sanitized = value
    .normalize("NFKC")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
    .replace(/\s+/g, " ")
    .replace(/[. ]+$/g, "")
    .trim()

  const fallback = sanitized.length > 0 ? sanitized : "Rede"

  if (WINDOWS_RESERVED_NAMES.has(fallback.toUpperCase())) {
    return `${fallback}-rede`
  }

  return fallback
}
