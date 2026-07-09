export function startInterval(
  task: () => Promise<unknown>,
  intervalMs: number,
  onError: (err: unknown) => void = () => {},
): () => void {
  const timer = setInterval(() => {
    task().catch(onError);
  }, intervalMs);

  return () => clearInterval(timer);
}
