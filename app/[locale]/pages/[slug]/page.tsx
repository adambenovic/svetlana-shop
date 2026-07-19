import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { lexicalToHtml } from '@/lib/lexical-to-html'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { alternatesFor, absoluteUrl, openGraphFor } from '@/components/layout/seo'
import styles from './page.module.css'

// Utility/help pages that carry no SEO value — keep them out of the index.
const NOINDEX_SLUGS = new Set(['cookie-preferences', 'lamp-manual', 'declaration-of-conformity'])

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}): Promise<Metadata> {
  const { slug, locale } = await params
  const alternates = alternatesFor({ pathname: '/pages/[slug]', params: { slug } }, locale)
  const robots = NOINDEX_SLUGS.has(slug) ? { index: false, follow: true } : undefined
  const payload = await getPayload({ config })
  try {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      locale,
      limit: 1,
    })
    const title = typeof docs[0]?.title === 'string' ? docs[0].title : ''
    return {
      title,
      alternates,
      robots,
      openGraph: openGraphFor({ locale, href: { pathname: '/pages/[slug]', params: { slug } }, title }),
    }
  } catch {
    return { alternates, robots }
  }
}

export default async function PageRoute({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  const payload = await getPayload({ config })
  let docs: Array<Record<string, unknown>> = []
  try {
    const result = await payload.find({
      collection: 'pages',
      where: { slug: { equals: slug } },
      locale,
      limit: 1,
    })
    docs = result.docs as Array<Record<string, unknown>>
  } catch {
    notFound()
  }

  if (!docs[0]) notFound()
  const page = docs[0]
  const title = typeof page.title === 'string' ? page.title : ''
  const rawHtml = typeof page.bodyHtml === 'string' ? page.bodyHtml : ''
  const html = rawHtml || lexicalToHtml(page.body)

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
        item: absoluteUrl(locale, { pathname: '/pages/[slug]', params: { slug } }),
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
