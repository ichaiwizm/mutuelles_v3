// Simple wrapper around keytar for storing platform credentials
// Use dynamic import and loose typing to avoid build-time native deps
let keytar: any = null

async function kt(): Promise<any> {
  if (!keytar) keytar = await import('keytar')
  return keytar
}

const SERVICE = 'broker-automation'

export async function setCredential(platform: string, username: string, password: string) {
  const k = await kt()
  await k.setPassword(`${SERVICE}:${platform}`, username, password)
}

export async function getCredential(platform: string, username: string): Promise<string | null> {
  const k = await kt()
  return k.getPassword(`${SERVICE}:${platform}`, username)
}

export async function deleteCredential(platform: string, username: string) {
  const k = await kt()
  return k.deletePassword(`${SERVICE}:${platform}`, username)
}
