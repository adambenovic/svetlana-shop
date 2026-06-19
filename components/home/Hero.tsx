import Link from 'next/link'
import styles from './Hero.module.css'

interface HeroProps {
  locale: string
}

export function Hero({ locale }: HeroProps) {
  const prefix = locale === 'sk' ? '' : `/${locale}`

  return (
    <section className={styles.hero}>
      <div className={`page-width ${styles.inner}`}>
        <h1 className={styles.title}>
          Rozsvieťte<br />svoj svet
        </h1>
        <p className={styles.sub}>
          Farebné stolové lampy navrhnuté na rozžiarenie každej miestnosti
        </p>
        <div className={styles.actions}>
          <Link href={`${prefix}/configurator`} className={styles.btnPrimary}>
            Vytvoriť si lampu
          </Link>
          <Link href={`${prefix}/gallery`} className={styles.btnSecondary}>
            Galéria
          </Link>
        </div>
      </div>
    </section>
  )
}
