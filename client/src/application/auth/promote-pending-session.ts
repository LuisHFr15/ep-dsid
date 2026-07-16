import { basename, resolve } from "node:path"
import { SessionStore } from "../../domain/auth/session-store.js"

export type PromotePendingSessionOutput = {
  promoted: boolean
  userId: string
  user: string
}

export class PromotePendingSession {
  constructor(
    private readonly pendingSessionStore: SessionStore,
    private readonly activeSessionStore: SessionStore,
    private readonly clientDataRoot: string
  ) {}

  async execute(): Promise<PromotePendingSessionOutput> {
    const existingSession =
      await this.activeSessionStore.load()

    /*
     * Torna client:init idempotente.
     * Nas próximas execuções a sessão já estará no diretório definitivo.
     */
    if (existingSession) {
      return {
        promoted: false,
        userId: existingSession.userId,
        user: existingSession.user
      }
    }

    const pendingSession =
      await this.pendingSessionStore.load()

    if (!pendingSession) {
      throw new Error(
        [
          "Nenhuma sessão ativa ou provisória foi encontrada.",
          "Execute auth:login antes de client:init."
        ].join(" ")
      )
    }

    validateClientDataRoot(
      this.clientDataRoot,
      pendingSession.userId
    )

    await this.activeSessionStore.save(pendingSession)

    /*
     * Somente apaga a pending session depois da sessão definitiva
     * ter sido salva com sucesso.
     */
    await this.pendingSessionStore.clear()

    return {
      promoted: true,
      userId: pendingSession.userId,
      user: pendingSession.user
    }
  }
}

function validateClientDataRoot(
  clientDataRoot: string,
  expectedUserId: string
): void {
  const directoryName =
    basename(resolve(clientDataRoot))

  if (directoryName !== expectedUserId) {
    throw new Error(
      [
        "CLIENT_DATA_DIR não corresponde ao usuário autenticado.",
        `Esperado um diretório terminado em: ${expectedUserId}`,
        `Recebido: ${clientDataRoot}`
      ].join("\n")
    )
  }
}