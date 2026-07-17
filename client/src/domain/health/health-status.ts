export type HealthStatus = {
  status?: string
  ok?: boolean
  service?: string
  [key: string]: unknown
}