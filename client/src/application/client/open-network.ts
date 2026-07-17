import { GetCurrentNetwork } from "./get-current-network.js"
import { SelectNetwork } from "./select-network.js"
import { NetworkWorkspace } from "../../domain/client/client-home.js"

export type OpenNetworkInput = {
  networkRef: string
}

export class OpenNetwork {
  constructor(
    private readonly selectNetwork: SelectNetwork,
    private readonly getCurrentNetwork: GetCurrentNetwork
  ) {}

  async execute(input: OpenNetworkInput): Promise<NetworkWorkspace> {
    await this.selectNetwork.execute({
      networkRef: input.networkRef
    })

    return this.getCurrentNetwork.execute()
  }
}