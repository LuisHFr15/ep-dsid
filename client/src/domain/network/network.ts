export type AccessMode = "public" | "private"

export type UpdateMode = "centralized" | "collaborative"

export type Network = {
  id: string
  title: string
  description: string
  tags: string[]
  ownerId: string
  accessMode: AccessMode
  updateMode: UpdateMode
  activeFileId: string | null
  createdAt: string
}