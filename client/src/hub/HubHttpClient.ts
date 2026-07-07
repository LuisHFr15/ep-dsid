export type HealthResponse = {
  ok?: boolean
  status?: string
  service?: string
  [key: string]: unknown
}

export type HubFileSummary = {
  file_id?: string
  id?: string
  name?: string
  title?: string
  description?: string
  active_peers?: number
  fallback_active?: boolean
  [key: string]: unknown
}

export type HubFileDetails = {
  file_id?: string
  id?: string
  name?: string
  title?: string
  description?: string
  active_peers?: number
  fallback_active?: boolean
  versions?: unknown[]
  peers?: unknown[]
  [key: string]: unknown
}

export type AnnounceFileInput = {
  name: string
  size: number
  info_hash: string
  peer_id: string
}

export type AnnounceFileResponse = {
  file_id?: string
  version_id?: string
  id?: string
  status?: string
  [key: string]: unknown
}

export type HubHttpClientConfig = {
  hubBaseUrl: string
}

export class HubHttpClient {
  private readonly hubBaseUrl: string

  constructor(config: HubHttpClientConfig) {
    this.hubBaseUrl = config.hubBaseUrl.replace(/\/$/, "")
  }

  async health(): Promise<HealthResponse> {
    return this.getJson<HealthResponse>("/health")
  }

  async listFiles(): Promise<HubFileSummary[]> {
    return this.getJson<HubFileSummary[]>("/files")
  }

  async getFile(fileId: string): Promise<HubFileDetails> {
    const encodedFileId = encodeURIComponent(fileId)
    return this.getJson<HubFileDetails>(`/files/${encodedFileId}`)
  }

  async announceFile(input: AnnounceFileInput): Promise<AnnounceFileResponse> {
    return this.postJson<AnnounceFileResponse>("/announce", input)
  }

  private async getJson<T>(path: string): Promise<T> {
    const response = await fetch(`${this.hubBaseUrl}${path}`)

    if (!response.ok) {
      const body = await response.text().catch(() => "")
      const detail = body ? ` - ${body}` : ""

      throw new Error(`GET ${path} falhou com status ${response.status}${detail}`)
    }

    return response.json() as Promise<T>
  }

  private async postJson<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(`${this.hubBaseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "")
      const detail = responseBody ? ` - ${responseBody}` : ""

      throw new Error(`POST ${path} falhou com status ${response.status}${detail}`)
    }

    return response.json() as Promise<T>
  }
}