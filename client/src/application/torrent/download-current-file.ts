import { NetworkWorkspace } from "../../domain/client/client-home.js"
import { TorrentEngine } from "../../domain/torrent/torrent-engine.js"
import { RegisterLocalResource } from "../library/register-local-resource.js"

export type DownloadCurrentFileInput = {
  overwrite?: boolean
}

export type DownloadCurrentFileResult = {
  networkId: string
  networkTitle: string
  filename: string
  size: number
  sourcePath: string
  destinationPath: string
  versionId: string
  transferId: string
}

type RefreshNetworkWorkspacePort = {
  execute(): Promise<NetworkWorkspace>
}

type GetWorkspaceStatusPort = {
  execute(): Promise<{
    configured: boolean
    rootDirectory: string | null
    directoryExists: boolean
  }>
}

export class DownloadCurrentFile {
  constructor(
    private readonly refreshNetworkWorkspace: RefreshNetworkWorkspacePort,
    private readonly getWorkspaceStatus: GetWorkspaceStatusPort,
    private readonly torrentEngine: TorrentEngine,
    private readonly registerLocalResource: RegisterLocalResource
  ) { }

  async execute(
    input: DownloadCurrentFileInput = {}
  ): Promise<DownloadCurrentFileResult> {
    const workspaceStatus =
      await this.getWorkspaceStatus.execute()

    if (
      !workspaceStatus.configured ||
      !workspaceStatus.directoryExists ||
      !workspaceStatus.rootDirectory
    ) {
      throw new Error(
        "Configure uma workspace válida antes de baixar um arquivo."
      )
    }

    const currentNetwork =
      await this.refreshNetworkWorkspace.execute()

    const currentFile =
      currentNetwork.currentFile

    if (!currentFile) {
      throw new Error(
        "A rede selecionada não possui um arquivo atual disponível."
      )
    }

    const filename =
      currentFile.filename

    if (!filename) {
      throw new Error(
        "O arquivo atual da rede não possui filename."
      )
    }

    if (!currentFile.magnet) {
      throw new Error(
        "O arquivo atual não possui um magnet para download."
      )
    }

    const infoHash =
      currentFile.infoHash

    if (!infoHash) {
      throw new Error(
        "O arquivo atual da rede não possui infoHash."
      )
    }

    const downloaded =
      await this.torrentEngine.downloadFile({
        networkId:
          currentNetwork.network.id,
        networkTitle:
          currentNetwork.network.title,
        filename,
        sourceMagnet:
          currentFile.magnet,
        destinationWorkspaceRoot:
          workspaceStatus.rootDirectory,
        overwrite:
          input.overwrite ?? true
      })

    /*
     * MVP 8B:
     * baixar não cria nem promove uma nova versão.
     * O Hub continua apontando para a origem publicada.
     */
    await this.registerLocalResource.execute({
      networkId:
        currentNetwork.network.id,
      networkTitle:
        currentNetwork.network.title,
      filename:
        downloaded.resource.filename,
      localPath:
        downloaded.resource.filePath,
      size:
        downloaded.resource.size,
      versionId:
        currentFile.versionId,
      lamportTs:
        currentFile.lamportTs,
      infoHash:
        infoHash,
      magnet:
        currentFile.magnet,
      source: "downloaded"
    })

    return {
      networkId:
        currentNetwork.network.id,
      networkTitle:
        currentNetwork.network.title,
      filename:
        downloaded.resource.filename,
      size:
        downloaded.resource.size,
      sourcePath:
        downloaded.transfer.sourcePath,
      destinationPath:
        downloaded.resource.filePath,
      versionId:
        currentFile.versionId,
      transferId:
        downloaded.transfer.id
    }
  }
}
