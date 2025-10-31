export type TaskCatalogItem = {
  platform: string
  product: string
  label: string
}

export const TASKS_CATALOG: TaskCatalogItem[] = [
  { platform: 'swisslife', product: 'sante-pro', label: 'Swisslife - Santé Pro' },
  { platform: 'alptis', product: 'sante-plus', label: 'Alptis - Santé Plus' },
]

