import { createClientCore } from "../core/createClientCore.js"

export async function runCliCommand(args: string[]): Promise<void> {
  const command = args[0]

  const hubBaseUrl = process.env.HUB_BASE_URL ?? "http://localhost:3000"

  const client = createClientCore({
    hubBaseUrl
  })

  if (!command) {
    printHelp()
    return
  }

  switch (command) {
    case "health": {
      const result = await client.health()

      console.log("[health] Hub respondeu:")
      console.log(JSON.stringify(result, null, 2))
      return
    }

    case "files:list": {
      const files = await client.listFiles()

      console.log(`[files:list] ${files.length} arquivo(s) encontrado(s):`)
      console.log(JSON.stringify(files, null, 2))
      return
    }

    case "files:get": {
      const fileId = args[1]

      if (!fileId) {
        throw new Error("Uso: files:get <file_id>")
      }

      const file = await client.getFile(fileId)

      console.log(`[files:get] Detalhes do arquivo ${fileId}:`)
      console.log(JSON.stringify(file, null, 2))
      return
    }

    case "files:publish": {
      const name = args[1]
      const sizeRaw = args[2]
      const infoHash = args[3]
      const peerId = args[4] ?? "peer-cli"

      if (!name || !sizeRaw || !infoHash) {
        throw new Error("Uso: files:publish <name> <size> <info_hash> [peer_id]")
      }

      const size = Number(sizeRaw)

      if (!Number.isFinite(size) || size < 0) {
        throw new Error(`Tamanho inválido: ${sizeRaw}`)
      }

      const result = await client.announceFile({
        name,
        size,
        info_hash: infoHash,
        peer_id: peerId
      })

      console.log("[files:publish] Arquivo anunciado:")
      console.log(JSON.stringify(result, null, 2))
      return
    }

    default: {
      throw new Error(`Comando desconhecido: ${command}`)
    }
  }
}

function printHelp(): void {
  console.log("Uso:")
  console.log("  npm run dev -- health")
  console.log("  npm run dev -- files:list")
  console.log("  npm run dev -- files:get <file_id>")
  console.log("  npm run dev -- files:publish <name> <size> <info_hash> [peer_id]")
  console.log("")
  console.log("Também é possível executar comandos de um arquivo:")
  console.log("  npm run commands -- commands/mvp1.txt")
  console.log("  npm run commands -- commands/mvp2.txt")
  console.log("  npm run commands -- commands/mvp3.txt")
}