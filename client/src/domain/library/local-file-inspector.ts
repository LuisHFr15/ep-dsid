export type LocalFileInspection = {
  exists: boolean
  isFile: boolean
  size: number | null
  modifiedAt: string | null
}

export interface LocalFileInspector {
  inspect(
    filePath: string
  ): Promise<LocalFileInspection>
}
