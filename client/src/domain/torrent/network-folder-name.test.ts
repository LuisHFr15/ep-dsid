import { describe, it, expect } from "vitest"
import { sanitizeFilename } from "./network-folder-name.js"

describe("sanitizeFilename", () => {
  it("keeps a normal filename intact", () => {
    expect(sanitizeFilename("relatorio.pdf")).toBe("relatorio.pdf")
  })

  it("strips directory components from a traversal attempt", () => {
    const result = sanitizeFilename("../../../.bashrc")
    expect(result).not.toContain("/")
    expect(result).not.toContain("..")
    expect(result).toBe(".bashrc".replace(/[<>:"/\\|?* -]/g, "-"))
  })

  it("drops any path prefix and keeps only the basename", () => {
    const result = sanitizeFilename("/etc/passwd")
    expect(result).toBe("passwd")
  })

  it("handles windows-style separators", () => {
    expect(sanitizeFilename("..\\..\\secret.txt")).toBe("secret.txt")
  })

  it("falls back to a safe name for empty or dot-only input", () => {
    expect(sanitizeFilename("")).toBe("arquivo")
    expect(sanitizeFilename("..")).toBe("arquivo")
    expect(sanitizeFilename(".")).toBe("arquivo")
    expect(sanitizeFilename("/")).toBe("arquivo")
  })
})
