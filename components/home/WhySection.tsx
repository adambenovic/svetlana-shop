import { getTranslations } from 'next-intl/server'
import styles from './WhySection.module.css'

const ICONS = ['🖐️', '🎨', '🚚']

export async function WhySection({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'why' })

  const items = [
    { icon: ICONS[0], title: t('item1_title'), body: t('item1_body') },
    { icon: ICONS[1], title: t('item2_title'), body: t('item2_body') },
    { icon: ICONS[2], title: t('item3_title'), body: t('item3_body') },
  ]

  return (
    <section className={styles.section}>
      <div className="page-width">
        <h2 className={styles.heading}>{t('heading')}</h2>
        <div className={styles.grid}>
          {items.map(item => (
            <div key={item.title} className={styles.card}>
              <span className={styles.icon}>{item.icon}</span>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardBody}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
