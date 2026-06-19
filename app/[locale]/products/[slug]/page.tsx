import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getPayload } from 'payload'
import config from '@/payload.config'
import { Button } from '@/components/ui/Button'
import { getTranslations } from 'next-intl/server'
import styles from './page.module.css'

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  const t = await getTranslations({ locale, namespace: 'configurator' })
  const payload = await getPayload({ config })

  const { docs } = await payload.find({
    collection: 'products',
    where: { slug: { equals: slug }, status: { equals: 'published' } },
    locale,
    limit: 1,
  })

  if (!docs[0]) notFound()
  const product = docs[0]
  const prefix = locale === 'sk' ? '' : `/${locale}`

  return (
    <div className={`page-width ${styles.wrap}`}>
      <div className={styles.images}>
        {(product.images ?? []).map((img: { image: { url: string }; alt?: string }, i: number) => (
          <div key={i} className={styles.imageSlot}>
            <Image src={img.image?.url ?? ''} alt={img.alt ?? product.title} fill className={styles.img} sizes="(max-width: 768px) 100vw, 50vw" />
          </div>
        ))}
      </div>
      <div className={styles.info}>
        <h1 className={styles.title}>{product.title}</h1>
        <p className={styles.price}>
          {((product.basePrice as number) / 100).toFixed(2)} {product.currency}
        </p>
        {product.partsKey && (
          <Button as="a" href={`${prefix}/configurator?product=${product.partsKey}`} size="lg">
            {t('add_to_cart')}
          </Button>
        )}
      </div>
    </div>
  )
}

export async function generateStaticParams() {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'products',
    where: { status: { equals: 'published' } },
    limit: 1000,
  })
  const locales = ['sk', 'en', 'cs', 'de', 'es', 'fr', 'hu', 'it', 'pl', 'uk']
  return locales.flatMap(locale =>
    docs.map(p => ({ locale, slug: p.slug as string }))
  )
}
