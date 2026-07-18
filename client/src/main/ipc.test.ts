import { describe, it, expect } from "vitest"
import { AppError, AuthError } from "../domain/errors/app-error.js"

function wrapResponse(result: unknown) {
  return { ok: true, data: result }
}

function wrapError(err: unknown) {
  if (err instanceof AppError) {
    return { ok: false, error: { code: err.code, message: err.message } }
  }
  const message = err instanceof Error ? err.message : String(err)
  return { ok: false, error: { code: "INTERNAL", message } }
}

describe("IPC envelope", () => {
  it("wraps a successful result", () => {
    expect(wrapResponse({ jwt: "abc" })).toEqual({ ok: true, data: { jwt: "abc" } })
  })

  it("wraps an AppError with its code and message", () => {
    const err = new AuthError("credenciais inválidas")
    expect(wrapError(err)).toEqual({ ok: false, error: { code: "AUTH_ERROR", message: "credenciais inválidas" } })
  })

  it("wraps an unknown error as INTERNAL", () => {
    expect(wrapError(new Error("boom"))).toEqual({ ok: false, error: { code: "INTERNAL", message: "boom" } })
  })
})
