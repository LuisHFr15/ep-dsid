import { ipcMain } from "electron"
import { AppError } from "../domain/errors/app-error.js"

type UseCaseMap = Record<string, (...args: unknown[]) => Promise<unknown>>

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

export function registerIpcHandlers(useCases: UseCaseMap): void {
  for (const [channel, handler] of Object.entries(useCases)) {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        const result = await handler(...args)
        return wrapResponse(result)
      } catch (err) {
        return wrapError(err)
      }
    })
  }
}
