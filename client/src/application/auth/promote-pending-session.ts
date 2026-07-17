import { basename, resolve } from "node:path"

import { Session } from "../../domain/auth/session.js"
import { SessionStore } from "../../domain/auth/session-store.js"

export type PromotePendingSessionResult = {
  promoted: boolean
  user: string
  userId: string
}

export class PromotePendingSession {
  constructor(
    private readonly pendingSessionStore: SessionStore,
    private readonly sessionStore: SessionStore,
    private readonly clientDataRoot: string
  ) {}

  async execute(): Promise<PromotePendingSessionResult> {
    const activeSession =
      await this.sessionStore.load()

    const pendingSession =
      await this.pendingSessionStore.load()

    if (pendingSession) {
      this.assertClientDataRootMatches(
        pendingSession
      )

      /*
       * Existe uma sessão recém-criada pelo auth:login.
       *
       * Ela sempre substitui a sessão ativa, pois pode conter
       * um JWT renovado.
       */
      await this.sessionStore.save(
        pendingSession
      )

      /*
       * A pending session só é removida depois que a sessão
       * definitiva foi salva com sucesso.
       */
      await this.pendingSessionStore.clear()

      return {
        promoted: true,
        user: pendingSession.user,
        userId: pendingSession.userId
      }
    }

    if (activeSession) {
      this.assertClientDataRootMatches(
        activeSession
      )

      return {
        promoted: false,
        user: activeSession.user,
        userId: activeSession.userId
      }
    }

    throw new Error(
      [
        "Nenhuma sessão foi encontrada.",
        "",
        "Faça login primeiro:",
        "npm.cmd --prefix client run dev -- auth:login <user> <password>"
      ].join("\n")
    )
  }

  private assertClientDataRootMatches(
    session: Session
  ): void {
    const resolvedRoot =
      resolve(this.clientDataRoot)

    const directoryUserId =
      basename(resolvedRoot)

    if (
      directoryUserId !== session.userId
    ) {
      throw new Error(
        [
          "CLIENT_DATA_DIR não corresponde ao usuário autenticado.",
          `Usuário autenticado: ${session.user}`,
          `User ID esperado: ${session.userId}`,
          `Diretório configurado: ${resolvedRoot}`,
          "",
          "Configure novamente:",
          `$env:CLIENT_DATA_DIR = ".client-data\\${session.userId}"`
        ].join("\n")
      )
    }
  }
}