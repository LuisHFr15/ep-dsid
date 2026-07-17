export type NetworkAccessStatus = "approved" | "pending" | string

export type RequestNetworkAccessResult = {
  status: NetworkAccessStatus
}

export type NetworkAccessRequest = {
  userId: string
  requestedAt: string
}

export type NetworkAccessDecision = "approve" | "reject"

/**
 * A documentação atual do Hub apresenta respostas diferentes
 * para a rota de decisão. Mantemos o retorno flexível até o
 * contrato de resposta ser estabilizado.
 */
export type DecideNetworkAccessResult = unknown