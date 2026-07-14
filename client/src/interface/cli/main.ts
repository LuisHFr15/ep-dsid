import { AccessMode, UpdateMode } from "../../domain/network/network.js"
import { buildClientContainer } from "../../main/container.js"

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]

  const container = buildClientContainer()

  switch (command) {
    case "health": {
      const result = await container.checkHealth.execute()
      printJson("[health] Hub respondeu:", result)
      return
    }

    case "auth:register": {
      const user = requireArg(args, 1, "user")
      const password = requireArg(args, 2, "password")

      const result = await container.registerUser.execute({
        user,
        password
      })

      printJson("[auth:register] Usuário registrado:", result)
      return
    }

    case "auth:login": {
      const user = requireArg(args, 1, "user")
      const password = requireArg(args, 2, "password")

      const result = await container.login.execute({
        user,
        password
      })

      console.log("[auth:login] Login realizado com sucesso.")
      console.log(`Usuário: ${result.user}`)
      console.log("Sessão salva em client/.client-session.json")
      return
    }

    case "auth:logout": {
      await container.logout.execute()
      console.log("[auth:logout] Sessão local removida.")
      return
    }

    case "auth:whoami": {
      const session = await container.getCurrentSession.execute()

      if (!session) {
        console.log("[auth:whoami] Nenhuma sessão local encontrada.")
        return
      }

      console.log("[auth:whoami] Sessão atual:")
      console.log(`Usuário: ${session.user}`)
      console.log(`JWT: ${maskJwt(session.jwt)}`)
      return
    }

    case "networks:list": {
      const result = await container.listNetworks.execute()
      printJson("[networks:list] Networks:", result)
      return
    }

    case "networks:create": {
      const title = requireArg(args, 1, "title")
      const description = requireArg(args, 2, "description")
      const accessMode = parseAccessMode(requireArg(args, 3, "accessMode"))
      const updateMode = parseUpdateMode(requireArg(args, 4, "updateMode"))
      const tags = parseTags(args[5])

      const result = await container.createNetwork.execute({
        title,
        description,
        accessMode,
        updateMode,
        tags
      })

      printJson("[networks:create] Network criada:", result)
      return
    }

      case "network:file:publish": {
      const networkId = requireArg(args, 1, "networkId")
      const filename = requireArg(args, 2, "filename")
      const infoHash = requireArg(args, 3, "infoHash")
      const magnet = requireArg(args, 4, "magnet")
      const size = parseNumberArg(requireArg(args, 5, "size"), "size")

      const result = await container.announceFile.execute({
        networkId,
        filename,
        infoHash,
        magnet,
        size
      })

      printJson("[network:file:publish] Arquivo anunciado:", result)
      return
    }

    case "network:file:get": {
      const networkId = requireArg(args, 1, "networkId")

      const result = await container.getCurrentFile.execute({
        networkId
      })

      printJson("[network:file:get] Arquivo atual:", result)
      return
    }

    case "heartbeat:once": {
      const networkId = requireArg(args, 1, "networkId")
      const peerId = requireArg(args, 2, "peerId")

      const result = await container.sendHeartbeat.execute({
        networkId,
        peerId
      })

      printJson("[heartbeat:once] Heartbeat enviado:", result)
      return
    }

    case "network:peers": {
      const networkId = requireArg(args, 1, "networkId")

      const result = await container.listActivePeers.execute({
        networkId
      })

      printJson("[network:peers] Peers ativos:", result)
      return
    }

        case "network:versions:list": {
      const networkId = requireArg(args, 1, "networkId")

      const result = await container.listVersions.execute({
        networkId
      })

      printJson("[network:versions:list] Versões:", result)
      return
    }

    case "network:version:publish": {
      const networkId = requireArg(args, 1, "networkId")
      const filename = requireArg(args, 2, "filename")
      const infoHash = requireArg(args, 3, "infoHash")
      const magnet = requireArg(args, 4, "magnet")
      const size = parseNumberArg(requireArg(args, 5, "size"), "size")
      const parentVersionId = args[6]

      const result = await container.publishVersion.execute({
        networkId,
        filename,
        infoHash,
        magnet,
        size,
        parentVersionId
      })

      printJson("[network:version:publish] Versão publicada:", result)
      return
    }

    case "network:version:promote": {
      const networkId = requireArg(args, 1, "networkId")
      const versionId = requireArg(args, 2, "versionId")

      const result = await container.promoteVersion.execute({
        networkId,
        versionId
      })

      printJson("[network:version:promote] Versão promovida:", result)
      return
    }

    case "heartbeat:start": {
      const networkId = requireArg(args, 1, "networkId")
      const peerId = requireArg(args, 2, "peerId")
      const intervalMs = args[3] ? parseNumberArg(args[3], "intervalMs") : 10000

      await container.startHeartbeat.execute({
        networkId,
        peerId,
        intervalMs
      })

      return
    }

    case undefined: {
      printHelp()
      return
    }

    default: {
      throw new Error(`Comando desconhecido: ${command}`)
    }
  }
}

function requireArg(args: string[], index: number, name: string): string {
  const value = args[index]

  if (!value) {
    throw new Error(`Argumento obrigatório ausente: ${name}`)
  }

  return value
}

function parseNumberArg(value: string, name: string): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    throw new Error(`Argumento ${name} inválido. Esperado número, recebido: ${value}`)
  }

  return parsed
}

function parseTags(tagsCsv: string | undefined): string[] {
  if (!tagsCsv) {
    return []
  }

  return tagsCsv
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

function parseAccessMode(value: string): AccessMode {
  if (value === "public" || value === "private") {
    return value
  }

  throw new Error("accessMode inválido. Use: public ou private")
}

function parseUpdateMode(value: string): UpdateMode {
  if (value === "centralized" || value === "collaborative") {
    return value
  }

  throw new Error("updateMode inválido. Use: centralized ou collaborative")
}

function maskJwt(jwt: string): string {
  if (jwt.length <= 16) {
    return jwt
  }

  return `${jwt.slice(0, 8)}...${jwt.slice(-8)}`
}

function printJson(title: string, value: unknown): void {
  console.log(title)
  console.log(JSON.stringify(value, null, 2))
}

function printHelp(): void {
  console.log("Uso:")
  console.log("  npm run dev -- health")
  console.log("")
  console.log("Auth:")
  console.log("  npm run dev -- auth:register <user> <password>")
  console.log("  npm run dev -- auth:login <user> <password>")
  console.log("  npm run dev -- auth:logout")
  console.log("  npm run dev -- auth:whoami")
  console.log("")
  console.log("Networks:")
  console.log("  npm run dev -- networks:list")
  console.log("  npm run dev -- networks:create <title> <description> <accessMode> <updateMode> [tagsCsv]")
  console.log("")
  console.log("Files:")
  console.log("  npm run dev -- network:file:publish <networkId> <filename> <infoHash> <magnet> <size>")
  console.log("  npm run dev -- network:file:get <networkId>")
  console.log("")
  console.log("Presence:")
  console.log("  npm run dev -- heartbeat:once <networkId> <peerId>")
  console.log("  npm run dev -- network:peers <networkId>")
  console.log("")
  console.log("Versions:")
  console.log("  npm run dev -- network:versions:list <networkId>")
  console.log("  npm run dev -- network:version:publish <networkId> <filename> <infoHash> <magnet> <size> [parentVersionId]")
  console.log("  npm run dev -- network:version:promote <networkId> <versionId>")
  console.log("")
  console.log("Heartbeat contínuo:")
  console.log("  npm run dev -- heartbeat:start <networkId> <peerId> [intervalMs]")
}

main().catch((error) => {
  console.error("[erro]", error.message)
  process.exit(1)
})