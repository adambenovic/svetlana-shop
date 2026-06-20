import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { lexicalToHtml } from '@/lib/lexical-to-html'
import type { Metadata } from 'next'
import styles from './page.module.css'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}): Promise<Metadata> {
  const { slug, locale } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    locale,
    limit: 1,
  })
  const title = typeof docs[0]?.title === 'string' ? docs[0].title : ''
  return { title }
}

export default async function PageRoute({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'pages',
    where: { slug: { equals: slug } },
    locale,
    limit: 1,
  })

  if (!docs[0]) notFound()
  const page = docs[0]
  const title = typeof page.title === 'string' ? page.title : ''
  const html = lexicalToHtml(page.body)

  return (
    <div className={`page-width ${styles.wrap}`}>
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
