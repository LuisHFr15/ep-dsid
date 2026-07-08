import { EvaluateFallback } from "../../application/presence/evaluate-fallback";

export function startFallbackScheduler(
  evaluate: EvaluateFallback,
  intervalMs: number,
  onError: (err: unknown) => void = () => {},
): () => void {
  const timer = setInterval(() => {
    evaluate.evaluateAll().catch(onError);
  }, intervalMs);

  return () => clearInterval(timer);
}
