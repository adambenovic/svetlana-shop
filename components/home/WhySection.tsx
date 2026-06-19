import styles from './WhySection.module.css'

interface WhyItem {
  icon: string
  title: string
  body: string
}

const ITEMS: WhyItem[] = [
  {
    icon: '🖐️',
    title: 'Ručná výroba',
    body: 'Každá lampa je vyrobená ručne na Slovensku. Žiadne sériové kopírovanie — každý kus je originál.',
  },
  {
    icon: '🎨',
    title: 'Jedinečné farby',
    body: 'Vyše 30 farieb a kombinácií. Namixujte si lampu presne podľa vašej predstavy cez náš konfigurátor.',
  },
  {
    icon: '🚚',
    title: 'Rýchle doručenie',
    body: 'Odosielame do 5 pracovných dní. Doručenie cez Packeta výdajne miesta po celej SR a ČR.',
  },
]

export function WhySection() {
  return (
    <section className={styles.section}>
      <div className="page-width">
        <h2 className={styles.heading}>Prečo Svetlana Lampe?</h2>
        <div className={styles.grid}>
          {ITEMS.map(item => (
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
