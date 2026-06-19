import { existsSync, unlinkSync } from 'fs'
import { FIXTURE_STATE_FILE } from './global-setup'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'
const SECRET = process.env.PAYLOAD_SECRET ?? 'change-this-in-production'

export default async function globalTeardown() {
  try {
    const url = `${BASE_URL}/api/test-fixtures?action=clean&secret=${encodeURIComponent(SECRET)}`
    const res = await fetch(url)
    if (res.ok) {
      const data = (await res.json()) as { ok: boolean; deleted: number }
      console.log(`[fixtures] Cleaned ${data.deleted} fixture product(s)`)
    } else {
      console.warn(`[fixtures] Teardown warning (${res.status}): ${await res.text()}`)
    }
  } catch (err) {
    console.warn('[fixtures] Teardown skipped (server may be down):', String(err))
  }

  if (existsSync(FIXTURE_STATE_FILE)) {
    unlinkSync(FIXTURE_STATE_FILE)
  }
}
