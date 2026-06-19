import { writeFileSync } from 'fs'
import { join } from 'path'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const SECRET = process.env.PAYLOAD_SECRET ?? 'change-this-in-production'
export const FIXTURE_STATE_FILE = join(__dirname, '.fixture-state.json')

async function waitForServer(baseUrl: string, maxMs = 30_000): Promise<void> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    try {
      await fetch(`${baseUrl}/api/test-fixtures?action=status&secret=${encodeURIComponent(SECRET)}`)
      return
    } catch {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  throw new Error(`Server at ${baseUrl} not ready after ${maxMs}ms`)
}

export default async function globalSetup() {
  await waitForServer(BASE_URL)

  const url = `${BASE_URL}/api/test-fixtures?action=seed&secret=${encodeURIComponent(SECRET)}`
  const res = await fetch(url)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Fixture seed failed (${res.status}): ${text}`)
  }
  const data = (await res.json()) as { ok: boolean; ids: (string | number)[] }
  writeFileSync(FIXTURE_STATE_FILE, JSON.stringify(data))
  console.log(`[fixtures] Seeded ${data.ids.length} product(s): ${data.ids.join(', ')}`)
}
