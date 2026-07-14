import { HealthStatus } from "../../domain/health/health-status.js"
import { AccessMode, Network, UpdateMode } from "../../domain/network/network.js"
import {
  AnnounceFileResult,
  FileVersionsResult,
  NetworkFile,
  PromoteVersionResult,
  PublishVersionResult
} from "../../domain/file/network-file.js"
import { ActivePeersResult, HeartbeatResult } from "../../domain/presence/peer.js"

export type HubHealthResponse = HealthStatus

export type HubApiConfig = {
  hubBaseUrl: string
}

export type RegisterUserRequest = {
  user: string
  password: string
}

export type RegisterUserResponse = {
  id: string
  username: string
  createdAt: string
}

export type AuthenticateUserRequest = {
  user: string
  password: string
}

export type AuthenticateUserResponse = {
  jwt: string
}

export type CreateNetworkRequest = {
  title: string
  description: string
  tags: string[]
  accessMode: AccessMode
  updateMode: UpdateMode
}

export type CreateNetworkResponse = Network

export type ListNetworksResponse = Network[]

export type AnnounceFileRequest = {
  networkId: string
  filename: string
  infoHash: string
  magnet: string
  size: number
}

export type AnnounceFileResponse = AnnounceFileResult

export type GetCurrentFileResponse = NetworkFile

export type SendHeartbeatRequest = {
  networkId: string
  peerId: string
}

export type SendHeartbeatResponse = HeartbeatResult

export type ListActivePeersResponse = ActivePeersResult

export type ListVersionsResponse = FileVersionsResult

export type PublishVersionRequest = {
  networkId: string
  filename: string
  infoHash: string
  magnet: string
  size: number
  parentVersionId?: string
}

export type PublishVersionResponse = PublishVersionResult

export type PromoteVersionResponse = PromoteVersionResult