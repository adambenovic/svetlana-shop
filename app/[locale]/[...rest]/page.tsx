import { notFound } from 'next/navigation'

// Catch-all for URLs under a valid locale that match no route (/en/foo,
// /galeria/x/y): render the localized not-found page inside the [locale]
// layout (header, footer, translated copy) instead of the bare root 404.
export default function UnmatchedRoute() {
  notFound()
}
