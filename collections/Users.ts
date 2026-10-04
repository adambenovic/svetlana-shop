import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Secure in production (served over HTTPS via Cloudflare; browsers also
    // accept Secure cookies on http://localhost). Lax keeps the admin usable
    // from links while blocking cross-site POSTs.
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
    // Payload defaults, kept explicit: lock the account for 10 min after 5 failed logins
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
  },
  admin: { useAsTitle: 'email' },
  fields: [],
}
