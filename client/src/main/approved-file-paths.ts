import { resolve } from "node:path"

/*
 * Registro dos caminhos de arquivo que o usuário escolheu explicitamente pelo
 * diálogo nativo do sistema. Só o processo main escreve aqui (ao abrir o
 * diálogo); o handler de publicação consulta antes de semear. Isso impede que
 * um renderer comprometido publique um arquivo arbitrário do disco (ex:
 * ~/.ssh/id_rsa) passando um caminho que o usuário nunca aprovou.
 */
const approvedPaths = new Set<string>()

export function approveFilePath(filePath: string): void {
  approvedPaths.add(resolve(filePath))
}

export function isFilePathApproved(filePath: string): boolean {
  return approvedPaths.has(resolve(filePath))
}
