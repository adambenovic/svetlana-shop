import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { lexicalToHtml } from '@/lib/lexical-to-html'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { alternatesFor, absoluteUrl, openGraphFor } from '@/components/layout/seo'
import { isLegalHandle } from '../legal-pages'
import { htmlExcerpt, localizeInternalHrefs } from '../localize-html'
import styles from './page.module.css'

// Only the six legal documents live here (contract C-i); anything else is a 404
// instead of an empty 200 page.

/** The page's title + body HTML for a locale; null when not seeded yet. Cached per request (metadata + page). */
const loadPolicy = cache(async (handle: string, locale: string) => {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: handle } },
    locale,
    limit: 1,
  })
  const page = docs[0] as Record<string, unknown> | undefined
  if (!page) return null
  const title = typeof page.title === 'string' ? page.title : ''
  const rawHtml = typeof page.bodyHtml === 'string' ? page.bodyHtml : ''
  return { title, html: rawHtml || lexicalToHtml(page.body) }
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}): Promise<Metadata> {
  const { handle, locale } = await params
  if (!isLegalHandle(handle)) return {}
  const alternates = alternatesFor({ pathname: '/policies/[handle]', params: { handle } }, locale)
  const robots = { index: true, follow: true }
  try {
    const page = await loadPolicy(handle, locale)
    const title = page?.title ?? ''
    const description = page?.html ? htmlExcerpt(page.html) || undefined : undefined
    return {
      title,
      description,
      alternates,
      robots,
      openGraph: openGraphFor({ locale, href: { pathname: '/policies/[handle]', params: { handle } }, title, description }),
    }
  } catch {
    return { alternates, robots }
  }
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}) {
  const { handle, locale } = await params
  if (!isLegalHandle(handle)) notFound()

  let page: Awaited<ReturnType<typeof loadPolicy>> = null
  try {
    page = await loadPolicy(handle, locale)
  } catch {
    notFound()
  }

  if (!page) {
    return (
      <div className={`page-width ${styles.wrap}`}>
        <h1 className={styles.title} style={{ textTransform: 'capitalize' }}>
          {handle.replace(/-/g, ' ')}
        </h1>
        <p className={styles.empty}>—</p>
      </div>
    )
  }
  const { title } = page
  const html = page.html ? localizeInternalHrefs(page.html, locale) : ''

  const tHeader = await getTranslations({ locale, namespace: 'sections.header' })
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: tHeader('menu_home'), item: absoluteUrl(locale, '/') },
      {
        '@type': 'ListItem',
        position: 2,
        name: title,
        item: absoluteUrl(locale, { pathname: '/policies/[handle]', params: { handle } }),
      },
    ],
  }

  return (
    <div className={`page-width ${styles.wrap}`}>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <h1 className={styles.title}>{title}</h1>
      {html ? (
        <div className={`prose ${styles.body}`} dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <p className={styles.empty}>—</p>
      )}
    </div>
  )
}

export const dynamic = 'force-dynamic'
