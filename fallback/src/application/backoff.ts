const BASE_MS = 1000;
const MAX_MS = 30000;

// Backoff exponencial com teto. attempts=0 -> BASE; cresce ate MAX_MS.
// Usado quando o consumo da fila falha em serie, para nao virar busy-loop.
export function nextBackoffMs(attempts: number): number {
  const n = Math.max(0, Math.floor(attempts));
  const delay = BASE_MS * 2 ** n;
  return Math.min(delay, MAX_MS);
}
