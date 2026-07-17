import { NetworkWorkspace } from "../../domain/client/client-home.js"
import { TorrentEngine } from "../../domain/torrent/torrent-engine.js"
import { RegisterLocalResource } from "../library/register-local-resource.js"

export type PublishLocalFileInput = {
  sourceFilePath: string
}

export type PublishLocalFileResult = {
  networkId: string
  networkTitle: string
  filename: string
  size: number
  infoHash: string
  magnet: string
  localPath: string
  versionId: string
  transferId: string
}

type GetCurrentNetworkPort = {
  execute(): Promise<NetworkWorkspace>
}

type GetWorkspaceStatusPort = {
  execute(): Promise<{
    configured: boolean
    rootDirectory: string | null
    directoryExists: boolean
  }>
}

type PublishSelectedNetworkVersionPort = {
  execute(input: {
    filename: string
    infoHash: string
    magnet: string
    size: number
    parentVersionRef?: string
  }): Promise<{
    versionId: string
  }>
}

type PromoteSelectedNetworkVersionPort = {
  execute(input: {
    versionRef: string
  }): Promise<unknown>
}

type RefreshNetworkWorkspacePort = {
  execute(): Promise<NetworkWorkspace>
}

export class PublishLocalFile {
  constructor(
    private readonly getCurrentNetwork: GetCurrentNetworkPort,
    private readonly getWorkspaceStatus: GetWorkspaceStatusPort,
    private readonly torrentEngine: TorrentEngine,
    private readonly publishSelectedNetworkVersion: PublishSelectedNetworkVersionPort,
    private readonly promoteSelectedNetworkVersion: PromoteSelectedNetworkVersionPort,
    private readonly refreshNetworkWorkspace: RefreshNetworkWorkspacePort,
    private readonly registerLocalResource: RegisterLocalResource
  ) {}

  async execute(
    input: PublishLocalFileInput
  ): Promise<PublishLocalFileResult> {
    const workspaceStatus =
      await this.getWorkspaceStatus.execute()

    if (
      !workspaceStatus.configured ||
      !workspaceStatus.directoryExists ||
      !workspaceStatus.rootDirectory
    ) {
      throw new Error(
        "Configure uma workspace válida antes de publicar um arquivo."
      )
    }

    const currentNetwork =
      await this.getCurrentNetwork.execute()

    const seeded =
      await this.torrentEngine.seedFile({
        networkId:
          currentNetwork.network.id,
        networkTitle:
          currentNetwork.network.title,
        sourceFilePath:
          input.sourceFilePath,
        destinationWorkspaceRoot:
          workspaceStatus.rootDirectory
      })

    const published =
      await this.publishSelectedNetworkVersion.execute({
        filename:
          seeded.resource.filename,
        infoHash:
          seeded.resource.infoHash,
        magnet:
          seeded.resource.magnet,
        size:
          seeded.resource.size,
        parentVersionRef:
          currentNetwork.currentFile
            ?.versionId
      })

    await this.refreshNetworkWorkspace.execute()

    await this.promoteSelectedNetworkVersion.execute({
      versionRef: published.versionId
    })

    await this.registerLocalResource.execute({
      networkId:
        currentNetwork.network.id,
      networkTitle:
        currentNetwork.network.title,
      filename:
        seeded.resource.filename,
      localPath:
        seeded.resource.filePath,
      size:
        seeded.resource.size,
      versionId:
        published.versionId,
      lamportTs: null,
      infoHash:
        seeded.resource.infoHash,
      magnet:
        seeded.resource.magnet,
      source: "published"
    })

    return {
      networkId:
        currentNetwork.network.id,
      networkTitle:
        currentNetwork.network.title,
      filename:
        seeded.resource.filename,
      size:
        seeded.resource.size,
      infoHash:
        seeded.resource.infoHash,
      magnet:
        seeded.resource.magnet,
      localPath:
        seeded.resource.filePath,
      versionId:
        published.versionId,
      transferId:
        seeded.transfer.id
    }
  }
}
