import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

// Locale-aware navigation APIs — always use these instead of next/link and
// next/navigation in localized UI so pathnames stay translated.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing)
