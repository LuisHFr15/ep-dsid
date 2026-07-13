import { describe, it, expect } from "vitest";
import { nextBackoffMs } from "./backoff";

describe("nextBackoffMs", () => {
  it("starts at the base delay", () => {
    expect(nextBackoffMs(0)).toBe(1000);
  });

  it("grows exponentially", () => {
    expect(nextBackoffMs(1)).toBe(2000);
    expect(nextBackoffMs(2)).toBe(4000);
    expect(nextBackoffMs(3)).toBe(8000);
  });

  it("caps at the maximum", () => {
    expect(nextBackoffMs(10)).toBe(30000);
    expect(nextBackoffMs(100)).toBe(30000);
  });

  it("treats negative attempts as zero", () => {
    expect(nextBackoffMs(-5)).toBe(1000);
  });
});
