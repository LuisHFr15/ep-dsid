import type {
  Network,
  FileVersion,
  FileVersionsResult,
  ActivePeer,
  HeartbeatResult,
  NetworkAccessRequest,
  Session
} from './types'

const BASE_URL: string =
  (window as any).electronAPI?.getHubUrl?.() ??
  (import.meta as any).env?.VITE_HUB_URL ??
  'http://localhost:3000'

async function request<T>(
  path: string,
  options: RequestInit = {},
  jwt?: string
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>)
  }
  if (jwt) headers['Authorization'] = `Bearer ${jwt}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function register(username: string, password: string) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ user: username, password })
  })
}

export async function login(username: string, password: string): Promise<Session> {
  const data = await request<{ token: string; userId: string; username: string }>(
    '/auth/login',
    { method: 'POST', body: JSON.stringify({ user: username, password }) }
  )
  return { userId: data.userId, username: data.username, jwt: data.token }
}

// ── Networks ─────────────────────────────────────────────────────────────────

export async function listNetworks(
  jwt: string,
  query?: { q?: string; tag?: string }
): Promise<Network[]> {
  const params = new URLSearchParams()
  if (query?.q) params.set('q', query.q)
  if (query?.tag) params.set('tag', query.tag)
  const qs = params.toString() ? `?${params}` : ''
  return request<Network[]>(`/networks${qs}`, {}, jwt)
}

export async function createNetwork(
  jwt: string,
  payload: {
    title: string
    description?: string
    tags?: string[]
    accessMode: 'public' | 'private'
    updateMode: 'centralized' | 'collaborative'
  }
): Promise<Network> {
  return request<Network>('/networks', { method: 'POST', body: JSON.stringify(payload) }, jwt)
}

export async function requestAccess(jwt: string, networkId: string) {
  return request(`/networks/${networkId}/access`, { method: 'POST' }, jwt)
}

export async function listAccessRequests(
  jwt: string,
  networkId: string
): Promise<NetworkAccessRequest[]> {
  return request<NetworkAccessRequest[]>(`/networks/${networkId}/access`, {}, jwt)
}

export async function decideAccess(
  jwt: string,
  networkId: string,
  userId: string,
  decision: 'approve' | 'reject'
) {
  return request(
    `/networks/${networkId}/access/${userId}`,
    { method: 'PATCH', body: JSON.stringify({ decision }) },
    jwt
  )
}

// ── Files ────────────────────────────────────────────────────────────────────

export async function announceFile(
  jwt: string,
  networkId: string,
  payload: { filename: string; infoHash: string; magnet: string; size: number }
): Promise<FileVersion> {
  return request<FileVersion>(
    `/networks/${networkId}/file`,
    { method: 'POST', body: JSON.stringify(payload) },
    jwt
  )
}

export async function getCurrentFile(
  jwt: string,
  networkId: string,
  versionId?: string
): Promise<FileVersion> {
  const qs = versionId ? `?versionId=${versionId}` : ''
  return request<FileVersion>(`/networks/${networkId}/file${qs}`, {}, jwt)
}

export async function listVersions(
  jwt: string,
  networkId: string
): Promise<FileVersionsResult> {
  return request<FileVersionsResult>(`/networks/${networkId}/file/versions`, {}, jwt)
}

export async function publishVersion(
  jwt: string,
  networkId: string,
  payload: {
    parentVersionId: string
    infoHash: string
    magnet: string
    filename: string
    size: number
  }
): Promise<FileVersion & { concurrent: boolean }> {
  return request(
    `/networks/${networkId}/file/versions`,
    { method: 'POST', body: JSON.stringify(payload) },
    jwt
  )
}

export async function promoteVersion(
  jwt: string,
  networkId: string,
  versionId: string
): Promise<FileVersion> {
  return request(
    `/networks/${networkId}/file/versions/${versionId}/promote`,
    { method: 'POST' },
    jwt
  )
}

// ── Presence ──────────────────────────────────────────────────────────────────

export async function sendHeartbeat(
  jwt: string,
  networkId: string,
  peerId: string
): Promise<HeartbeatResult> {
  return request<HeartbeatResult>(
    `/networks/${networkId}/heartbeat`,
    { method: 'POST', body: JSON.stringify({ networkId, peerId }) },
    jwt
  )
}

export async function listPeers(jwt: string, networkId: string): Promise<ActivePeer[]> {
  return request<ActivePeer[]>(`/networks/${networkId}/peers`, {}, jwt)
}
