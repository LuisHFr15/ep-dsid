import { AccessMode, UpdateMode } from "../../domain/network/network.js"
import { ClientHomeOverview, NetworkWorkspace } from "../../domain/client/client-home.js"
import { PresenceRuntimeStatus } from "../../domain/presence-runtime/presence-runtime-state.js"
import { buildBootstrapContainer, buildClientContainer } from "../../main/container.js"
import { requireClientDataRoot } from "../../main/client-data-paths.js"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const command = args[0]

  switch (command) {
    case "health": {
      const bootstrapContainer = buildBootstrapContainer()
      const result = await bootstrapContainer.checkHealth.execute()
      printJson("[health] Hub respondeu:", result)
      return
    }

    case "auth:register": {
      const bootstrapContainer = buildBootstrapContainer()
      const user = requireArg(args, 1, "user")
      const password = requireArg(args, 2, "password")

      const result = await bootstrapContainer.registerUser.execute({
        user,
        password
      })

      printJson("[auth:register] Usuário registrado:", result)
      return
    }

    case "auth:login": {
      const bootstrapContainer = buildBootstrapContainer()
      const user = requireArg(args, 1, "user")
      const password = requireArg(args, 2, "password")

      const result = await bootstrapContainer.login.execute({
        user,
        password
      })

      console.log("")
      console.log("[auth:login] Login realizado com sucesso.")
      console.log(`Usuário: ${result.user}`)
      console.log(`User ID: ${result.userId}`)
      console.log("")
      console.log("Configure este terminal com:")
      console.log("")
      console.log(
        `$env:CLIENT_DATA_DIR = ".client-data\\${result.userId}"`
      )
      console.log("")
      console.log("Depois execute:")
      console.log("")
      console.log("npm.cmd --prefix client run dev -- client:init")
      return
    }

    case undefined: {
      printHelp()
      return
    }
  }

  const container = buildClientContainer(
    requireClientDataRoot()
  )

  switch (command) {

    case "auth:logout": {
      await container.logout.execute()

      console.log("[auth:logout] Dados locais do usuário removidos.")
      console.log("- sessão")
      console.log("- estado do client")
      console.log("- estado de presença")
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
      console.log(`User ID: ${session.userId}`)
      console.log(`JWT: ${maskJwt(session.jwt)}`)
      console.log(`Dados locais: ${container.clientDataRoot}`)
      return
    }

    case "workspace:configure": {
      const rootDirectory = requireArg(
        args,
        1,
        "rootDirectory"
      )

      const workspace =
        await container.configureWorkspace.execute({
          rootDirectory
        })

      console.log("")
      console.log(
        "[workspace:configure] Workspace configurada."
      )
      console.log(`Diretório: ${workspace.rootDirectory}`)
      console.log(`Configurada em: ${workspace.configuredAt}`)
      return
    }

    case "workspace:status": {
      const status =
        await container.getWorkspaceStatus.execute()

      console.log("")
      console.log("Workspace")
      console.log("=========")
      console.log(
        `Configurada: ${status.configured ? "sim" : "não"}`
      )
      console.log(
        `Diretório: ${status.rootDirectory ?? "-"}`
      )
      console.log(
        `Diretório existe: ${status.directoryExists ? "sim" : "não"}`
      )
      console.log(
        `Dados da instância: ${container.clientDataRoot}`
      )
      return
    }

    case "library:list": {
      const library =
        await container.listLocalLibrary.execute()

      console.log("")
      console.log("Biblioteca Local")
      console.log("================")
      console.log(`Workspace: ${library.rootDirectory}`)
      console.log(`Arquivos: ${library.files.length}`)
      console.log("")

      if (library.files.length === 0) {
        console.log("Nenhum arquivo local encontrado.")
        return
      }

      for (const file of library.files) {
        console.log(file.relativePath)
        console.log(`  tamanho: ${file.size} bytes`)
        console.log(`  modificado: ${file.modifiedAt}`)
      }

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

    case "client:init": {
      const promotion =
        await container.promotePendingSession.execute()

      if (promotion.promoted) {
        console.log(
          `[client:init] Sessão de ${promotion.user} promovida.`
        )
      } else {
        console.log(
          `[client:init] Sessão de ${promotion.user} já estava inicializada.`
        )
      }

      let workspaceStatus =
        await container.getWorkspaceStatus.execute()

      if (!workspaceStatus.configured) {
        console.log("")
        console.log(
          "Nenhuma pasta de trabalho foi configurada."
        )
        console.log("")

        const rootDirectory =
          await askWorkspaceDirectory()

        const workspace =
          await container.configureWorkspace.execute({
            rootDirectory
          })

        console.log("")
        console.log(
          "[client:init] Workspace configurada."
        )
        console.log(
          `Diretório: ${workspace.rootDirectory}`
        )

        workspaceStatus =
          await container.getWorkspaceStatus.execute()
      }

      if (!workspaceStatus.directoryExists) {
        throw new Error(
          [
            "A workspace configurada não existe.",
            `Diretório: ${workspaceStatus.rootDirectory}`,
            "",
            "Use workspace:configure para escolher outra pasta."
          ].join("\n")
        )
      }

      const state = await container.initializeClient.execute()

      console.log("")
      console.log("[client:init] Estado local inicializado.")
      console.log(`Usuário: ${promotion.user}`)
      console.log(`Dados locais: ${container.clientDataRoot}`)
      console.log(`Workspace: ${workspaceStatus.rootDirectory}`)
      console.log(`Networks carregadas: ${state.networks.length}`)
      console.log(`Network selecionada: ${state.selectedNetworkId ?? "nenhuma"}`)
      console.log(`Atualizado em: ${state.refreshedAt}`)
      return
    }

    case "client:refresh": {
      const state = await container.initializeClient.execute()

      console.log("[client:refresh] Estado local atualizado.")
      console.log(`Networks carregadas: ${state.networks.length}`)
      console.log(`Network selecionada: ${state.selectedNetworkId ?? "nenhuma"}`)
      console.log(`Atualizado em: ${state.refreshedAt}`)
      return
    }

    case "client:home": {
      const home = await container.getClientHome.execute()

      printHome(home)
      return
    }

    case "network:select": {
      const networkRef = requireArg(args, 1, "networkRef")

      const result = await container.selectNetwork.execute({
        networkRef
      })

      console.log("[network:select] Network selecionada.")
      console.log(`Título: ${result.selectedNetworkTitle}`)
      console.log(`ID: ${result.selectedNetworkId}`)
      return
    }

    case "network:current": {
      const workspace = await container.getCurrentNetwork.execute()

      printNetworkWorkspace(workspace)
      return
    }

    case "network:open": {
      const networkRef = requireArg(args, 1, "networkRef")

      const workspace = await container.openNetwork.execute({
        networkRef
      })

      printNetworkWorkspace(workspace)
      return
    }

    case "client:start": {
      const intervalMs = args[1] ? parseNumberArg(args[1], "intervalMs") : undefined

      await container.startPresenceRuntime.execute({
        intervalMs
      })

      return
    }

    case "client:status":
    case "presence:list": {
      const status = await container.getPresenceRuntimeStatus.execute()

      printPresenceRuntimeStatus(status)
      return
    }

    case "presence:online-all": {
      await container.setGlobalPresence.execute({
        online: true
      })

      const status = await container.getPresenceRuntimeStatus.execute()
      printPresenceRuntimeStatus(status)
      return
    }

    case "presence:offline-all": {
      await container.setGlobalPresence.execute({
        online: false
      })

      const status = await container.getPresenceRuntimeStatus.execute()
      printPresenceRuntimeStatus(status)
      return
    }

    case "presence:online": {
      const networkRef = requireArg(args, 1, "networkRef")

      await container.setNetworkPresence.execute({
        networkRef,
        online: true
      })

      const status = await container.getPresenceRuntimeStatus.execute()
      printPresenceRuntimeStatus(status)
      return
    }

    case "presence:offline": {
      const networkRef = requireArg(args, 1, "networkRef")

      await container.setNetworkPresence.execute({
        networkRef,
        online: false
      })

      const status = await container.getPresenceRuntimeStatus.execute()
      printPresenceRuntimeStatus(status)
      return
    }

    case "network:workspace": {
      const networkRef = args[1]

      if (networkRef) {
        await container.selectNetwork.execute({
          networkRef
        })
      }

      const workspace =
        await container.refreshNetworkWorkspace.execute()

      printNetworkWorkspace(workspace)
      return
    }

    case "network:refresh": {
      const workspace =
        await container.refreshNetworkWorkspace.execute()

      console.log("[network:refresh] Workspace atualizado.")
      printNetworkWorkspace(workspace)
      return
    }

    case "network:versions": {
      const workspace =
        await container.refreshNetworkWorkspace.execute()

      printSelectedNetworkVersions(workspace)
      return
    }

    case "network:publish-version": {
      const filename = requireArg(args, 1, "filename")
      const infoHash = requireArg(args, 2, "infoHash")
      const magnet = requireArg(args, 3, "magnet")
      const size = parseNumberArg(
        requireArg(args, 4, "size"),
        "size"
      )
      const parentVersionRef = args[5]

      const result =
        await container.publishSelectedNetworkVersion.execute({
          filename,
          infoHash,
          magnet,
          size,
          parentVersionRef
        })

      printJson(
        "[network:publish-version] Versão publicada:",
        result
      )

      await container.refreshNetworkWorkspace.execute()
      return
    }

    case "network:promote-version": {
      const versionRef = requireArg(
        args,
        1,
        "versionRef"
      )

      const result =
        await container.promoteSelectedNetworkVersion.execute({
          versionRef
        })

      printJson(
        "[network:promote-version] Versão promovida:",
        result
      )

      await container.refreshNetworkWorkspace.execute()
      return
    }

    case "network:create-private": {
      const title = requireArg(args, 1, "title")
      const description = requireArg(args, 2, "description")
      const tags = parseTags(args[3])
      const updateMode = args[4]
        ? parseUpdateMode(args[4])
        : "centralized"

      const result =
        await container.createPrivateNetwork.execute({
          title,
          description,
          tags,
          updateMode
        })

      printJson(
        "[network:create-private] Network privada criada:",
        result
      )
      return
    }

    case "network:request-access": {
      const networkRef = requireArg(
        args,
        1,
        "networkRef"
      )

      const result =
        await container.requestNetworkAccess.execute({
          networkRef
        })

      printJson(
        "[network:request-access] Solicitação enviada:",
        result
      )
      return
    }

    case "network:access-requests": {
      const networkRef = args[1]

      const overview =
        await container.listNetworkAccessRequests.execute({
          networkRef
        })

      printAccessRequests(overview)
      return
    }

    case "network:approve": {
      const requestRef = requireArg(
        args,
        1,
        "requestRef"
      )
      const networkRef = args[2]

      const result =
        await container.decideNetworkAccess.execute({
          requestRef,
          networkRef,
          decision: "approve"
        })

      printJson(
        "[network:approve] Pedido aprovado:",
        result
      )
      return
    }

    case "network:reject": {
      const requestRef = requireArg(
        args,
        1,
        "requestRef"
      )
      const networkRef = args[2]

      const result =
        await container.decideNetworkAccess.execute({
          requestRef,
          networkRef,
          decision: "reject"
        })

      printJson(
        "[network:reject] Pedido rejeitado:",
        result
      )
      return
    }

    default: {
      throw new Error(`Comando desconhecido: ${command}`)
    }
  }
}

async function askWorkspaceDirectory(): Promise<string> {
  const readline = createInterface({
    input,
    output
  })

  try {
    const answer = await readline.question(
      "Informe a pasta raiz dos arquivos do TorrentHub:\n> "
    )

    const directory = answer.trim()

    if (!directory) {
      throw new Error("Nenhum diretório foi informado")
    }

    return directory
  } finally {
    readline.close()
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

function printPresenceRuntimeStatus(status: PresenceRuntimeStatus): void {
  console.log("")
  console.log("Presence Runtime")
  console.log("================")
  console.log(`Usuário: ${status.user}`)
  console.log(`Global: ${status.globalOnline ? "online" : "offline"}`)
  console.log(`PeerId: ${status.peerId}`)
  console.log(`Intervalo: ${status.defaultHeartbeatIntervalMs}ms`)
  console.log(`Atualizado em: ${status.updatedAt}`)

  console.log("")
  console.log("Redes:")

  if (status.networks.length === 0) {
    console.log("  Nenhuma rede carregada.")
    return
  }

  for (const network of status.networks) {
    console.log(`[${network.index}] ${network.networkTitle}`)
    console.log(`    id: ${maskId(network.networkId)}`)
    console.log(`    presença: ${network.online ? "online" : "offline"}`)
    console.log(`    último heartbeat: ${network.lastHeartbeatAt ?? "-"}`)
    console.log(`    peers: ${network.lastActivePeers ?? "-"}`)
    console.log(
      `    fallback: ${network.lastShouldActivateFallback === null ? "-" : network.lastShouldActivateFallback ? "ativo" : "inativo"}`
    )

    if (network.lastError) {
      console.log(`    erro: ${network.lastError}`)
    }
  }

  console.log("")
  console.log("Comandos:")
  console.log("  presence:online-all")
  console.log("  presence:offline-all")
  console.log("  presence:online <rede-ou-indice>")
  console.log("  presence:offline <rede-ou-indice>")
}

function printHome(home: ClientHomeOverview): void {
  console.log("")
  console.log("Home")
  console.log("====")
  console.log(`Usuário: ${home.user}`)
  console.log(`Atualizado em: ${home.refreshedAt}`)

  console.log("")
  console.log("Minhas redes:")

  if (home.networks.length === 0) {
    console.log("  Nenhuma rede encontrada.")
  }

  for (const network of home.networks) {
    const selectedMarker = network.isSelected ? "*" : " "
    const fileName = network.currentFile?.filename ?? "nenhum arquivo publicado"
    const version = network.currentFile ? `v${network.currentFile.lamportTs}` : "-"
    const tags = network.tags.length > 0 ? network.tags.join(", ") : "sem tags"

    console.log(
      `[${network.index}]${selectedMarker} ${network.title}`
    )
    console.log(`    id: ${maskId(network.id)}`)
    console.log(`    descrição: ${network.description}`)
    console.log(`    tags: ${tags}`)
    console.log(`    modo: ${network.accessMode} / ${network.updateMode}`)
    console.log(`    arquivo atual: ${fileName}`)
    console.log(`    versão: ${version}`)
    console.log(`    versões: ${network.versionsCount}`)
    console.log(`    peers online: ${network.peersOnline}`)
  }

  console.log("")
  console.log("Arquivos disponíveis:")

  if (home.availableFiles.length === 0) {
    console.log("  Nenhum arquivo disponível.")
  }

  for (const file of home.availableFiles) {
    console.log(`[${file.index}] ${file.filename}`)
    console.log(`    rede: ${file.networkTitle}`)
    console.log(`    versão: v${file.lamportTs}`)
    console.log(`    versionId: ${maskId(file.versionId)}`)
  }

  console.log("")
  console.log("Dica:")
  console.log("  network:select <número-ou-nome>")
  console.log("  network:open <número-ou-nome>")
}

function printSelectedNetworkVersions(
  workspace: NetworkWorkspace
): void {
  console.log("")
  console.log(`Versões de ${workspace.network.title}`)
  console.log(
    "=".repeat(`Versões de ${workspace.network.title}`.length)
  )

  if (
    !workspace.versions ||
    workspace.versions.versions.length === 0
  ) {
    console.log("Nenhuma versão encontrada.")
    return
  }

  workspace.versions.versions.forEach((version, index) => {
    const currentMarker = version.isCurrent ? "*" : " "

    console.log(
      `[${index + 1}]${currentMarker} v${version.lamportTs} - ${version.filename}`
    )
    console.log(`    id: ${maskId(version.versionId)}`)
    console.log(
      `    pai: ${version.parentVersionId
        ? maskId(version.parentVersionId)
        : "nenhum"
      }`
    )
  })
}

function printNetworkWorkspace(workspace: NetworkWorkspace): void {
  console.log("")
  console.log("Network Workspace")
  console.log("=================")
  console.log(`Usuário: ${workspace.user}`)

  console.log("")
  console.log(`Rede: ${workspace.network.title}`)
  console.log(`ID: ${maskId(workspace.network.id)}`)
  console.log(`Descrição: ${workspace.network.description}`)
  console.log(`Modo: ${workspace.network.accessMode} / ${workspace.network.updateMode}`)
  console.log(`Selecionada: ${workspace.network.isSelected ? "sim" : "não"}`)

  console.log("")
  console.log("Arquivo atual:")

  if (!workspace.currentFile) {
    console.log("  Nenhum arquivo publicado nesta rede.")
  } else {
    console.log(`  Nome: ${workspace.currentFile.filename ?? "arquivo-sem-nome"}`)
    console.log(`  Versão: v${workspace.currentFile.lamportTs}`)
    console.log(`  fileId: ${maskId(workspace.currentFile.fileId)}`)
    console.log(`  versionId: ${maskId(workspace.currentFile.versionId)}`)
    console.log(`  infoHash: ${workspace.currentFile.infoHash ?? "-"}`)
  }

  console.log("")
  console.log("Versões:")

  if (!workspace.versions || workspace.versions.versions.length === 0) {
    console.log("  Nenhuma versão encontrada.")
  } else {
    for (const version of workspace.versions.versions) {
      const currentMarker = version.isCurrent ? "*" : " "
      console.log(
        `  ${currentMarker} v${version.lamportTs} - ${version.filename} - ${maskId(version.versionId)}`
      )
    }
  }

  console.log("")
  console.log("Peers ativos:")

  const activePeers = workspace.peers?.activePeers ?? []

  if (activePeers.length === 0) {
    console.log("  Nenhum peer ativo.")
  } else {
    for (const peer of activePeers) {
      console.log(`  ${JSON.stringify(peer)}`)
    }
  }
}

function maskId(id: string | undefined): string {
  if (!id) {
    return "-"
  }

  if (id.length <= 12) {
    return id
  }

  return `${id.slice(0, 8)}...${id.slice(-4)}`
}

function printAccessRequests(overview: {
  networkTitle: string
  requests: Array<{
    index: number
    userId: string
    requestedAt: string
  }>
}): void {
  console.log("")
  console.log(`Pedidos de acesso — ${overview.networkTitle}`)
  console.log("=".repeat(`Pedidos de acesso — ${overview.networkTitle}`.length))

  if (overview.requests.length === 0) {
    console.log("Nenhum pedido pendente.")
    return
  }

  for (const request of overview.requests) {
    console.log(`[${request.index}] ${maskId(request.userId)}`)
    console.log(`    solicitado em: ${request.requestedAt}`)
  }

  console.log("")
  console.log("Use:")
  console.log("  network:approve <número>")
  console.log("  network:reject <número>")
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
  console.log("Inicialização da instância:")
  console.log('  $env:CLIENT_DATA_DIR = ".client-data\\<userId>"')
  console.log("  npm run dev -- client:init")
  console.log("")
  console.log("Workspace local:")
  console.log("  npm run dev -- workspace:configure <diretório>")
  console.log("  npm run dev -- workspace:status")
  console.log("  npm run dev -- library:list")
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
  console.log("")
  console.log("Client home:")
  console.log("  npm run dev -- client:init")
  console.log("  npm run dev -- client:refresh")
  console.log("  npm run dev -- client:home")
  console.log("  npm run dev -- network:select <nome-ou-id-ou-indice>")
  console.log("  npm run dev -- network:current")
  console.log("  npm run dev -- network:open <nome-ou-id-ou-indice>")
  console.log("")
  console.log("Presence runtime:")
  console.log("  npm run dev -- client:start [intervalMs]")
  console.log("  npm run dev -- client:status")
  console.log("  npm run dev -- presence:list")
  console.log("  npm run dev -- presence:online-all")
  console.log("  npm run dev -- presence:offline-all")
  console.log("  npm run dev -- presence:online <rede-ou-id-ou-indice>")
  console.log("  npm run dev -- presence:offline <rede-ou-id-ou-indice>")
  console.log("")
  console.log("Network workspace:")
  console.log("  npm run dev -- network:workspace [rede]")
  console.log("  npm run dev -- network:refresh")
  console.log("  npm run dev -- network:versions")
  console.log("  npm run dev -- network:publish-version <filename> <infoHash> <magnet> <size> [parentVersionRef]")
  console.log("  npm run dev -- network:promote-version <versionRef>")

  console.log("")
  console.log("Collaboration:")
  console.log("  npm run dev -- network:create-private <title> <description> [tagsCsv] [updateMode]")
  console.log("  npm run dev -- network:request-access <rede>")
  console.log("  npm run dev -- network:access-requests [rede]")
  console.log("  npm run dev -- network:approve <pedido-ou-userId> [rede]")
  console.log("  npm run dev -- network:reject <pedido-ou-userId> [rede]")
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : String(error)

  console.error("[erro]", message)
  process.exitCode = 1
})
