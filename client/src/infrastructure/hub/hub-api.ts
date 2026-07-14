import {
  AuthenticateUserRequest,
  AuthenticateUserResponse,
  CreateNetworkRequest,
  CreateNetworkResponse,
  HubApiConfig,
  HubHealthResponse,
  ListNetworksResponse,
  RegisterUserRequest,
  RegisterUserResponse,
  AnnounceFileRequest,
  AnnounceFileResponse,
  GetCurrentFileResponse,
  ListActivePeersResponse,
  SendHeartbeatRequest,
  SendHeartbeatResponse,
  ListVersionsResponse,
  PromoteVersionResponse,
  PublishVersionRequest,
  PublishVersionResponse
} from "./hub-types.js"

type RequestOptions = {
  method: "GET" | "POST"
  path: string
  jwt?: string
  body?: unknown
}

export class HubApi {
  private readonly hubBaseUrl: string

  constructor(config: HubApiConfig) {
    this.hubBaseUrl = config.hubBaseUrl.replace(/\/$/, "")
  }

  async health(): Promise<HubHealthResponse> {
    return this.requestJson<HubHealthResponse>({
      method: "GET",
      path: "/health"
    })
  }

  async registerUser(input: RegisterUserRequest): Promise<RegisterUserResponse> {
    return this.requestJson<RegisterUserResponse>({
      method: "POST",
      path: "/register/",
      body: input
    })
  }

  async authenticateUser(input: AuthenticateUserRequest): Promise<AuthenticateUserResponse> {
    return this.requestJson<AuthenticateUserResponse>({
      method: "POST",
      path: "/auth/",
      body: input
    })
  }

  async listNetworks(jwt: string): Promise<ListNetworksResponse> {
    return this.requestJson<ListNetworksResponse>({
      method: "GET",
      path: "/networks/",
      jwt
    })
  }

  async createNetwork(jwt: string, input: CreateNetworkRequest): Promise<CreateNetworkResponse> {
    return this.requestJson<CreateNetworkResponse>({
      method: "POST",
      path: "/networks/",
      jwt,
      body: input
    })
  }

  private async requestJson<T>(options: RequestOptions): Promise<T> {
    const headers: Record<string, string> = {
      Accept: "application/json"
    }

    if (options.body !== undefined) {
      headers["Content-Type"] = "application/json"
    }

    if (options.jwt) {
      headers.Authorization = `Bearer ${options.jwt}`
    }

    const response = await fetch(`${this.hubBaseUrl}${options.path}`, {
      method: options.method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    })

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      const detail = body ? ` - ${body}` : ""

      throw new Error(`${options.method} ${options.path} falhou com status ${response.status}${detail}`)
    }

    return response.json() as Promise<T>
  }

    async announceFile(jwt: string, input: AnnounceFileRequest): Promise<AnnounceFileResponse> {
    return this.requestJson<AnnounceFileResponse>({
      method: "POST",
      path: `/networks/${input.networkId}/files/`,
      jwt,
      body: {
        filename: input.filename,
        infoHash: input.infoHash,
        magnet: input.magnet,
        size: input.size
      }
    })
  }

  async getCurrentFile(jwt: string, networkId: string): Promise<GetCurrentFileResponse> {
    return this.requestJson<GetCurrentFileResponse>({
      method: "GET",
      path: `/networks/${networkId}/file/`,
      jwt
    })
  }

  async listVersions(jwt: string, networkId: string): Promise<ListVersionsResponse> {
    return this.requestJson<ListVersionsResponse>({
      method: "GET",
      path: `/networks/${networkId}/versions/`,
      jwt
    })
  }

  async publishVersion(jwt: string, input: PublishVersionRequest): Promise<PublishVersionResponse> {
    const body: {
      filename: string
      infoHash: string
      magnet: string
      size: number
      parentVersionId?: string
    } = {
      filename: input.filename,
      infoHash: input.infoHash,
      magnet: input.magnet,
      size: input.size
    }

    if (input.parentVersionId) {
      body.parentVersionId = input.parentVersionId
    }

    return this.requestJson<PublishVersionResponse>({
      method: "POST",
      path: `/networks/${input.networkId}/versions/`,
      jwt,
      body
    })
  }

  async promoteVersion(jwt: string, networkId: string, versionId: string): Promise<PromoteVersionResponse> {
    return this.requestJson<PromoteVersionResponse>({
      method: "POST",
      path: `/networks/${networkId}/versions/${versionId}/promote/`,
      jwt
    })
  }

  async sendHeartbeat(jwt: string, input: SendHeartbeatRequest): Promise<SendHeartbeatResponse> {
    return this.requestJson<SendHeartbeatResponse>({
      method: "POST",
      path: "/heartbeat",
      jwt,
      body: {
        networkId: input.networkId,
        peerId: input.peerId
      }
    })
  }

  async listActivePeers(jwt: string, networkId: string): Promise<ListActivePeersResponse> {
    return this.requestJson<ListActivePeersResponse>({
      method: "GET",
      path: `/networks/${networkId}/peers/`,
      jwt
    })
  }
}