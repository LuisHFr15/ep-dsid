type JwtPayload = {
  sub?: unknown
  username?: unknown
}

export type DecodedClientIdentity = {
  userId: string
  username?: string
}

/**
 * Apenas lê o payload do JWT.
 *
 * A assinatura não é validada aqui porque o client não possui o segredo do Hub.
 * O Hub continuará validando o token em todas as requisições protegidas.
 */
export function decodeClientIdentityFromJwt(
  jwt: string
): DecodedClientIdentity {
  const parts = jwt.split(".")

  if (parts.length !== 3) {
    throw new Error("JWT inválido: formato inesperado")
  }

  const payloadPart = parts[1]

  if (!payloadPart) {
    throw new Error("JWT inválido: payload ausente")
  }

  let payload: JwtPayload

  try {
    const json = Buffer
      .from(normalizeBase64Url(payloadPart), "base64")
      .toString("utf8")

    payload = JSON.parse(json) as JwtPayload
  } catch {
    throw new Error("JWT inválido: não foi possível ler o payload")
  }

  if (typeof payload.sub !== "string" || payload.sub.trim() === "") {
    throw new Error("JWT inválido: campo sub ausente")
  }

  return {
    userId: payload.sub,
    username:
      typeof payload.username === "string"
        ? payload.username
        : undefined
  }
}

function normalizeBase64Url(value: string): string {
  const normalized = value
    .replace(/-/g, "+")
    .replace(/_/g, "/")

  const paddingLength = (4 - normalized.length % 4) % 4

  return normalized + "=".repeat(paddingLength)
}