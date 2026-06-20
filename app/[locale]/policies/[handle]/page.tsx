import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { lexicalToHtml } from '@/lib/lexical-to-html'
import type { Metadata } from 'next'
import styles from './page.module.css'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}): Promise<Metadata> {
  const { handle, locale } = await params
  const payload = await getPayload({ config })
  try {
    const { docs } = await payload.find({
      collection: 'pages',
      where: { slug: { equals: handle } },
      locale,
      limit: 1,
    })
    const title = typeof docs[0]?.title === 'string' ? docs[0].title : ''
    return { title }
  } catch {
    return {}
  }
}

export default async function PolicyPage({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>
}) {
  const { handle, locale } = await params
  const payload = await getPayload({ config })
  let docs: Array<Record<string, unknown>> = []
  try {
    const result = await payload.find({
      collection: 'pages',
      where: { slug: { equals: handle } },
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
