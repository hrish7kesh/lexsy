export interface PlaceholderInfo {
  key: string
  originalFormat: string
  index?: number
  prefix?: string
  context?: string
  position?: number
  type?: string
}

export interface PlaceholderData {
  info: PlaceholderInfo
  value: string
}
