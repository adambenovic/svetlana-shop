import { getPathname } from '@/i18n/navigation'
import { isLegalHandle } from './legal-pages'

// Seeded page HTML (legal/<locale>/*.html) links to other pages with locale-less
// internal paths — /policies/<handle> or /pages/<slug>. Rewrite them to the
// visitor's localized URL (e.g. /de/richtlinien/refund-policy). Legal handles
// always point at the policies route, everything else at the pages route.
const INTERNAL_HREF = /href="\/(?:policies|pages)\/([a-z0-9-]+)\/?([?#][^"]*)?"/g

export function localizeInternalHrefs(html: string, locale: string): string {
  return html.replace(INTERNAL_HREF, (_m, slug: string, suffix?: string) => {
    const path = isLegalHandle(slug)
      ? getPathname({ href: { pathname: '/policies/[handle]', params: { handle: slug } }, locale })
      : getPathname({ href: { pathname: '/pages/[slug]', params: { slug } }, locale })
    return `href="${path}${suffix ?? ''}"`
  })
}

/** Plain-text excerpt for <meta name="description">: the first paragraphs (skipping
 *  an italic-only "last updated" line), whitespace-collapsed, cut at a word boundary. */
export function htmlExcerpt(html: string, max = 155): string {
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)]
    .map(m => m[1])
    .filter(p => !/^\s*<em>[\s\S]*<\/em>\s*$/.test(p))
  const text = decodeEntities(paragraphs.join(' ').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, ''))
    .replace(/\s+/g, ' ')
    .trim()
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:—–-]+$/, '')}…`
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}
