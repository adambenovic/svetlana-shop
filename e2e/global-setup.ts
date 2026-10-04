import { writeFileSync } from 'fs'
import { join } from 'path'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const SECRET = process.env.PAYLOAD_SECRET ?? 'change-this-in-production'
export const FIXTURE_STATE_FILE = join(__dirname, '.fixture-state.json')

async function waitForServer(baseUrl: string, maxMs = 30_000): Promise<void> {
  const deadline = Date.now() + maxMs
  while (Date.now() < deadline) {
    try {
      await fetch(baseUrl)
      return
    } catch {
      await new Promise(r => setTimeout(r, 1000))
    }
  }
  throw new Error(`Server at ${baseUrl} not ready after ${maxMs}ms`)
}

export default async function globalSetup() {
  await waitForServer(BASE_URL)

  // Fixture products only exist on dev servers (the endpoint answers 403 in
  // production). No spec depends on them — cart/checkout specs seed the cart in
  // localStorage and mock /api/cart/price — so a deployed site is tested as-is.
  const url = `${BASE_URL}/api/test-fixtures?action=seed&secret=${encodeURIComponent(SECRET)}`
  const res = await fetch(url).catch(() => null)
  if (!res?.ok) {
    console.warn(`[fixtures] Seeding skipped (${res?.status ?? 'unreachable'}) — running against the site as deployed`)
    return
  }
  const data = (await res.json()) as { ok: boolean; ids: (string | number)[] }
  writeFileSync(FIXTURE_STATE_FILE, JSON.stringify(data))
  console.log(`[fixtures] Seeded ${data.ids.length} product(s): ${data.ids.join(', ')}`)
}
