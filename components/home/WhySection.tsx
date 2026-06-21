import { getTranslations } from 'next-intl/server'
import styles from './WhySection.module.css'

function HandmadeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
      <path d="M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v6" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34L3 19" />
    </svg>
  )
}

function CertifiedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function ShippingIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  )
}

const ICONS = [HandmadeIcon, CertifiedIcon, ShippingIcon]

export async function WhySection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'why' })

  const items = [
    { Icon: ICONS[0], title: t('item1_title'), body: t('item1_body') },
    { Icon: ICONS[1], title: t('item2_title'), body: t('item2_body') },
    { Icon: ICONS[2], title: t('item3_title'), body: t('item3_body') },
  ]

  return (
    <section className={styles.section}>
      <div className="page-width">
        <h2 className={styles.heading}>{t('heading')}</h2>
        <div className={styles.grid}>
          {items.map(({ Icon, title, body }) => (
            <div key={title} className={styles.card}>
              <span className={styles.icon}><Icon /></span>
              <h3 className={styles.cardTitle}>{title}</h3>
              <p className={styles.cardBody}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
