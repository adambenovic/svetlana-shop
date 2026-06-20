# Store Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Next.js store with all missing production features: full footer, legal pages, locale/currency switcher, cookie consent, announcement bar, SEO basics, and cart drawer.

**Architecture:** Each subsystem is independent. Footer and locale switcher share translation keys. Legal pages use a new Payload `Pages` collection. Cart drawer extends the existing Zustand store. All UI components follow existing CSS module + `useTranslations` patterns.

**Tech Stack:** Next.js 15 App Router, Payload CMS 3, next-intl v4, Zustand, CSS Modules

## Global Constraints

- All 10 locales must have translations: sk, en, cs, de, es, fr, hu, it, pl, uk
- No new npm dependencies unless unavoidable — build from scratch
- All locale messages go in `messages/{locale}.json` under the appropriate namespace
- CSS uses existing CSS variables (`--color-text`, `--color-bg`, `--color-surface`, `--color-border`, `--color-accent`, `--color-text-muted`, `--transition`, `--radius`, `--font-heading`, `--font-body`)
- TypeScript strict — no `any` without justification
- After every task: `git add -A && git commit -m "..."` then `git push`
- Server: run at `http://localhost:3000`, Postgres via `docker compose up -d postgres`

---

### Task 1: Footer — full rebuild with nav columns, social, policy links

**Files:**
- Modify: `components/layout/Footer.tsx`
- Modify: `components/layout/Footer.module.css`
- Modify: `messages/sk.json`, `messages/en.json`, `messages/cs.json`, `messages/de.json`, `messages/es.json`, `messages/fr.json`, `messages/hu.json`, `messages/it.json`, `messages/pl.json`, `messages/uk.json`

**Interfaces:**
- Produces: `<Footer locale={locale} />` — takes locale prop for URL prefix

- [ ] **Step 1: Add locale messages to all 10 files**

Run this Python script to inject footer messages into all locale files:

```python
import json, os

translations = {
  'sk': {
    'brand_desc': 'Ručne navrhované 3D tlačené lampy z dielne Svetlana Lampe.',
    'shop_title': 'Obchod',
    'docs_title': 'Dokumenty',
    'newsletter_label': 'Newsletter',
    'newsletter_placeholder': 'Váš e-mail',
    'newsletter_submit': 'Prihlásiť',
    'newsletter_success': 'Ďakujeme za prihlásenie!',
    'newsletter_invalid': 'Zadajte platný e-mail.',
    'policy_privacy': 'Ochrana osobných údajov',
    'policy_shipping': 'Doprava a vrátenie',
    'policy_refund': 'Reklamácie',
    'policy_terms': 'Obchodné podmienky',
    'policy_legal': 'Právne upozornenie',
    'cookie_prefs': 'Nastavenia cookies',
  },
  'en': {
    'brand_desc': 'Handcrafted 3D-printed lamps from Svetlana Lampe studio.',
    'shop_title': 'Shop',
    'docs_title': 'Documents',
    'newsletter_label': 'Newsletter',
    'newsletter_placeholder': 'Your email',
    'newsletter_submit': 'Subscribe',
    'newsletter_success': 'Thank you for subscribing!',
    'newsletter_invalid': 'Please enter a valid email.',
    'policy_privacy': 'Privacy Policy',
    'policy_shipping': 'Shipping Policy',
    'policy_refund': 'Refund Policy',
    'policy_terms': 'Terms of Service',
    'policy_legal': 'Legal Notice',
    'cookie_prefs': 'Cookie Preferences',
  },
  'cs': {
    'brand_desc': 'Ručně navrhované 3D tištěné lampy ze studia Svetlana Lampe.',
    'shop_title': 'Obchod',
    'docs_title': 'Dokumenty',
    'newsletter_label': 'Newsletter',
    'newsletter_placeholder': 'Váš e-mail',
    'newsletter_submit': 'Přihlásit',
    'newsletter_success': 'Děkujeme za přihlášení!',
    'newsletter_invalid': 'Zadejte platný e-mail.',
    'policy_privacy': 'Ochrana osobních údajů',
    'policy_shipping': 'Doprava a vrácení',
    'policy_refund': 'Reklamace',
    'policy_terms': 'Obchodní podmínky',
    'policy_legal': 'Právní upozornění',
    'cookie_prefs': 'Nastavení cookies',
  },
  'de': {
    'brand_desc': 'Handgefertigte 3D-gedruckte Lampen aus dem Svetlana Lampe Atelier.',
    'shop_title': 'Shop',
    'docs_title': 'Dokumente',
    'newsletter_label': 'Newsletter',
    'newsletter_placeholder': 'Ihre E-Mail',
    'newsletter_submit': 'Anmelden',
    'newsletter_success': 'Vielen Dank für Ihre Anmeldung!',
    'newsletter_invalid': 'Bitte gültige E-Mail eingeben.',
    'policy_privacy': 'Datenschutz',
    'policy_shipping': 'Versand & Rückgabe',
    'policy_refund': 'Rückerstattung',
    'policy_terms': 'AGB',
    'policy_legal': 'Impressum',
    'cookie_prefs': 'Cookie-Einstellungen',
  },
  'es': {
    'brand_desc': 'Lámparas 3D artesanales del estudio Svetlana Lampe.',
    'shop_title': 'Tienda',
    'docs_title': 'Documentos',
    'newsletter_label': 'Newsletter',
    'newsletter_placeholder': 'Tu email',
    'newsletter_submit': 'Suscribirse',
    'newsletter_success': '¡Gracias por suscribirte!',
    'newsletter_invalid': 'Introduce un email válido.',
    'policy_privacy': 'Política de privacidad',
    'policy_shipping': 'Política de envíos',
    'policy_refund': 'Política de reembolso',
    'policy_terms': 'Términos de servicio',
    'policy_legal': 'Aviso legal',
    'cookie_prefs': 'Preferencias de cookies',
  },
  'fr': {
    'brand_desc': "Lampes 3D artisanales du studio Svetlana Lampe.",
    'shop_title': 'Boutique',
    'docs_title': 'Documents',
    'newsletter_label': 'Newsletter',
    'newsletter_placeholder': 'Votre email',
    'newsletter_submit': "S'abonner",
    'newsletter_success': 'Merci pour votre inscription!',
    'newsletter_invalid': 'Veuillez saisir un email valide.',
    'policy_privacy': 'Politique de confidentialité',
    'policy_shipping': "Politique d'expédition",
    'policy_refund': 'Politique de remboursement',
    'policy_terms': "Conditions d'utilisation",
    'policy_legal': 'Mentions légales',
    'cookie_prefs': 'Paramètres des cookies',
  },
  'hu': {
    'brand_desc': 'Kézzel tervezett 3D nyomtatott lámpák a Svetlana Lampe műhelyéből.',
    'shop_title': 'Bolt',
    'docs_title': 'Dokumentumok',
    'newsletter_label': 'Hírlevél',
    'newsletter_placeholder': 'E-mail cím',
    'newsletter_submit': 'Feliratkozás',
    'newsletter_success': 'Köszönjük a feliratkozást!',
    'newsletter_invalid': 'Kérjük, adjon meg érvényes e-mail címet.',
    'policy_privacy': 'Adatvédelmi irányelvek',
    'policy_shipping': 'Szállítási szabályzat',
    'policy_refund': 'Visszatérítési szabályzat',
    'policy_terms': 'Általános szerződési feltételek',
    'policy_legal': 'Jogi közlemény',
    'cookie_prefs': 'Cookie-beállítások',
  },
  'it': {
    'brand_desc': 'Lampade 3D artigianali dello studio Svetlana Lampe.',
    'shop_title': 'Negozio',
    'docs_title': 'Documenti',
    'newsletter_label': 'Newsletter',
    'newsletter_placeholder': 'La tua email',
    'newsletter_submit': 'Iscriviti',
    'newsletter_success': 'Grazie per esserti iscritto!',
    'newsletter_invalid': 'Inserisci un email valida.',
    'policy_privacy': 'Informativa sulla privacy',
    'policy_shipping': 'Politica di spedizione',
    'policy_refund': 'Politica di rimborso',
    'policy_terms': 'Termini di servizio',
    'policy_legal': 'Note legali',
    'cookie_prefs': 'Impostazioni cookie',
  },
  'pl': {
    'brand_desc': 'Ręcznie projektowane lampy drukowane w 3D ze studia Svetlana Lampe.',
    'shop_title': 'Sklep',
    'docs_title': 'Dokumenty',
    'newsletter_label': 'Newsletter',
    'newsletter_placeholder': 'Twój email',
    'newsletter_submit': 'Zapisz się',
    'newsletter_success': 'Dziękujemy za zapisanie się!',
    'newsletter_invalid': 'Podaj prawidłowy adres email.',
    'policy_privacy': 'Polityka prywatności',
    'policy_shipping': 'Polityka wysyłki',
    'policy_refund': 'Polityka zwrotów',
    'policy_terms': 'Warunki korzystania',
    'policy_legal': 'Informacja prawna',
    'cookie_prefs': 'Ustawienia plików cookie',
  },
  'uk': {
    'brand_desc': 'Ручно виготовлені 3D-друковані лампи від студії Svetlana Lampe.',
    'shop_title': 'Магазин',
    'docs_title': 'Документи',
    'newsletter_label': 'Розсилка',
    'newsletter_placeholder': 'Ваш email',
    'newsletter_submit': 'Підписатися',
    'newsletter_success': 'Дякуємо за підписку!',
    'newsletter_invalid': 'Введіть дійсний email.',
    'policy_privacy': 'Політика конфіденційності',
    'policy_shipping': 'Політика доставки',
    'policy_refund': 'Політика повернення',
    'policy_terms': 'Умови обслуговування',
    'policy_legal': 'Правова інформація',
    'cookie_prefs': 'Налаштування cookie',
  },
}

base = '/home/adamb/svetlana-shop/messages'
for locale, keys in translations.items():
    path = os.path.join(base, f'{locale}.json')
    with open(path) as f:
        d = json.load(f)
    d['sections']['footer'].update(keys)
    with open(path, 'w') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'Updated {locale}.json')
```

Run: `python3 /tmp/footer-messages.py` (save script first)

- [ ] **Step 2: Rebuild Footer.tsx**

```tsx
// components/layout/Footer.tsx
'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import styles from './Footer.module.css'

const SOCIAL = [
  { name: 'Instagram', href: 'https://www.instagram.com/svetlana.lampe/', icon: '📸' },
  { name: 'Facebook', href: 'https://www.facebook.com/svetlanalampe', icon: '📘' },
  { name: 'TikTok', href: 'https://www.tiktok.com/@svetlana.lampe', icon: '🎵' },
]

function NewsletterForm() {
  const t = useTranslations('sections.footer')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(t('newsletter_invalid'))
      return
    }
    setError('')
    setDone(true)
    // TODO: wire to email provider (Brevo) when ready
  }

  if (done) return <p className={styles.newsletterSuccess}>{t('newsletter_success')}</p>

  return (
    <form className={styles.newsletterForm} onSubmit={handleSubmit} noValidate>
      <input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setError('') }}
        placeholder={t('newsletter_placeholder')}
        className={styles.newsletterInput}
        aria-label={t('newsletter_label')}
      />
      <button type="submit" className={styles.newsletterBtn}>{t('newsletter_submit')}</button>
      {error && <p className={styles.newsletterError} role="alert">{error}</p>}
    </form>
  )
}

export function Footer({ locale }: { locale: string }) {
  const t = useTranslations('sections.footer')
  const prefix = locale === 'sk' ? '' : `/${locale}`
  const year = new Date().getFullYear()

  const shopLinks = [
    { label: t('menu_home' as never) || 'Domov', href: `${prefix}/` },
    { label: t('menu_configurator' as never) || 'Konfigurátor', href: `${prefix}/configurator` },
    { label: t('menu_gallery' as never) || 'Galéria', href: `${prefix}/gallery` },
  ]

  const docLinks = [
    { label: t('policy_privacy'), href: `${prefix}/policies/privacy-policy` },
    { label: t('policy_shipping'), href: `${prefix}/policies/shipping-policy` },
    { label: t('policy_refund'), href: `${prefix}/policies/refund-policy` },
    { label: t('policy_terms'), href: `${prefix}/policies/terms-of-service` },
    { label: t('policy_legal'), href: `${prefix}/pages/legal-notice` },
  ]

  return (
    <footer className={styles.footer}>
      <div className={`page-width ${styles.grid}`}>
        {/* Brand column */}
        <div className={styles.brand}>
          <span className={styles.brandName}>Svetlana Lampe</span>
          <p className={styles.brandDesc}>{t('brand_desc')}</p>
          <div className={styles.social}>
            {SOCIAL.map(s => (
              <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name} className={styles.socialLink}>
                {s.name}
              </a>
            ))}
          </div>
          <div className={styles.newsletter}>
            <p className={styles.newsletterLabel}>{t('newsletter_label')}</p>
            <NewsletterForm />
          </div>
        </div>

        {/* Shop links */}
        <div className={styles.col}>
          <p className={styles.colTitle}>{t('shop_title')}</p>
          <ul className={styles.linkList}>
            {shopLinks.map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
          </ul>
        </div>

        {/* Document links */}
        <div className={styles.col}>
          <p className={styles.colTitle}>{t('docs_title')}</p>
          <ul className={styles.linkList}>
            {docLinks.map(l => <li key={l.href}><Link href={l.href}>{l.label}</Link></li>)}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className={`page-width ${styles.bottom}`}>
        <p className={styles.copy}>{t('copyright', { year })}</p>
        <div className={styles.policyRow}>
          {docLinks.slice(0, 3).map(l => <Link key={l.href} href={l.href} className={styles.policyLink}>{l.label}</Link>)}
          <button className={styles.policyLink} onClick={() => window.dispatchEvent(new Event('reopenCookieBanner'))}>
            {t('cookie_prefs')}
          </button>
        </div>
      </div>
    </footer>
  )
}
```

- [ ] **Step 3: Rebuild Footer.module.css**

```css
/* components/layout/Footer.module.css */
.footer {
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  padding: 48px 0 0;
  margin-top: 80px;
}

.grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr;
  gap: 40px;
  padding-bottom: 40px;
}

@media (max-width: 768px) {
  .grid { grid-template-columns: 1fr; gap: 32px; }
}

.brand {}
.brandName { font-family: var(--font-heading); font-size: 18px; font-weight: 700; display: block; margin-bottom: 10px; }
.brandDesc { font-size: 14px; color: var(--color-text-muted); line-height: 1.6; margin-bottom: 16px; }

.social { display: flex; gap: 16px; margin-bottom: 24px; }
.socialLink { font-size: 13px; color: var(--color-text-muted); text-decoration: none; transition: color var(--transition); }
.socialLink:hover { color: var(--color-text); }

.newsletter {}
.newsletterLabel { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); margin-bottom: 8px; }
.newsletterForm { display: flex; gap: 8px; flex-wrap: wrap; }
.newsletterInput {
  flex: 1; min-width: 160px; padding: 8px 12px;
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  background: var(--color-bg); color: var(--color-text);
  font-family: var(--font-body); font-size: 14px;
}
.newsletterInput:focus { outline: 2px solid var(--color-accent); outline-offset: 1px; border-color: transparent; }
.newsletterBtn {
  padding: 8px 16px; background: var(--color-accent); color: #fff;
  border: none; border-radius: var(--radius-sm); cursor: pointer;
  font-family: var(--font-body); font-size: 14px; font-weight: 600;
  transition: opacity var(--transition);
}
.newsletterBtn:hover { opacity: 0.85; }
.newsletterError { width: 100%; font-size: 12px; color: #e53e3e; margin-top: 4px; }
.newsletterSuccess { font-size: 14px; color: var(--color-accent); }

.col {}
.colTitle { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-text-muted); margin-bottom: 16px; }
.linkList { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.linkList a { font-size: 14px; color: var(--color-text-muted); text-decoration: none; transition: color var(--transition); }
.linkList a:hover { color: var(--color-text); }

.bottom {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  padding: 16px 0; border-top: 1px solid var(--color-border);
}
.copy { font-size: 13px; color: var(--color-text-muted); }
.policyRow { display: flex; gap: 16px; flex-wrap: wrap; }
.policyLink { font-size: 12px; color: var(--color-text-muted); text-decoration: none; background: none; border: none; cursor: pointer; padding: 0; transition: color var(--transition); }
.policyLink:hover { color: var(--color-text); }
```

- [ ] **Step 4: Update locale layout to pass locale to Footer**

In `app/[locale]/layout.tsx`, change `<Footer />` to `<Footer locale={locale} />`.

Also update Footer import to accept the prop type (already done in step 2).

- [ ] **Step 5: Verify in browser**

Open `http://localhost:3000` — footer should show 3 columns, social links, newsletter form, policy link row at bottom.

Test newsletter form validation: empty submit → error. Invalid email → error. Valid email → success message.

- [ ] **Step 6: Commit**

```bash
cd /home/adamb/svetlana-shop
git add -A
git commit -m "feat: rebuild footer with nav columns, social, newsletter, policy links"
git push
```

---

### Task 2: Announcement bar

**Files:**
- Create: `components/layout/AnnouncementBar.tsx`
- Create: `components/layout/AnnouncementBar.module.css`
- Modify: `app/[locale]/layout.tsx`
- Modify: `messages/*.json` (all 10 locales)

**Interfaces:**
- Produces: `<AnnouncementBar />` — client component, reads from locale messages

- [ ] **Step 1: Add announcement messages to all locales**

```python
import json, os

translations = {
  'sk': {'text': '🎉 20 % zľava pre prvých 10 objednávok — použite kód', 'code': 'EARLYBIRD', 'dismiss': 'Zavrieť'},
  'en': {'text': '🎉 20% off for the first 10 orders — use code', 'code': 'EARLYBIRD', 'dismiss': 'Close'},
  'cs': {'text': '🎉 20 % sleva pro prvních 10 objednávek — použijte kód', 'code': 'EARLYBIRD', 'dismiss': 'Zavřít'},
  'de': {'text': '🎉 20 % Rabatt für die ersten 10 Bestellungen — Code verwenden:', 'code': 'EARLYBIRD', 'dismiss': 'Schließen'},
  'es': {'text': '🎉 20 % de descuento para los primeros 10 pedidos — usa el código', 'code': 'EARLYBIRD', 'dismiss': 'Cerrar'},
  'fr': {'text': '🎉 20 % de réduction pour les 10 premières commandes — code', 'code': 'EARLYBIRD', 'dismiss': 'Fermer'},
  'hu': {'text': '🎉 20% kedvezmény az első 10 rendelésre — kód:', 'code': 'EARLYBIRD', 'dismiss': 'Bezárás'},
  'it': {'text': '🎉 20% di sconto per i primi 10 ordini — usa il codice', 'code': 'EARLYBIRD', 'dismiss': 'Chiudi'},
  'pl': {'text': '🎉 20% zniżki na pierwsze 10 zamówień — użyj kodu', 'code': 'EARLYBIRD', 'dismiss': 'Zamknij'},
  'uk': {'text': '🎉 20% знижка для перших 10 замовлень — використайте код', 'code': 'EARLYBIRD', 'dismiss': 'Закрити'},
}

base = '/home/adamb/svetlana-shop/messages'
for locale, keys in translations.items():
    path = os.path.join(base, f'{locale}.json')
    with open(path) as f:
        d = json.load(f)
    d.setdefault('announcement', {}).update(keys)
    with open(path, 'w') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'Updated {locale}.json')
```

- [ ] **Step 2: Create AnnouncementBar.tsx**

```tsx
// components/layout/AnnouncementBar.tsx
'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import styles from './AnnouncementBar.module.css'

const SESSION_KEY = 'sv_announcement_dismissed'

export function AnnouncementBar() {
  const t = useTranslations('announcement')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!sessionStorage.getItem(SESSION_KEY)) setVisible(true)
  }, [])

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  function copyCode() {
    navigator.clipboard.writeText(t('code')).catch(() => {})
  }

  if (!visible) return null

  return (
    <div className={styles.bar} role="banner">
      <p className={styles.text}>
        {t('text')}{' '}
        <button className={styles.code} onClick={copyCode} title="Click to copy">
          {t('code')}
        </button>
      </p>
      <button className={styles.dismiss} onClick={dismiss} aria-label={t('dismiss')}>✕</button>
    </div>
  )
}
```

- [ ] **Step 3: Create AnnouncementBar.module.css**

```css
/* components/layout/AnnouncementBar.module.css */
.bar {
  background: var(--color-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px;
  position: relative;
}

.text { font-size: 14px; font-weight: 500; text-align: center; }

.code {
  background: rgba(255,255,255,0.2);
  border: 1px solid rgba(255,255,255,0.5);
  border-radius: 4px;
  color: #fff;
  cursor: pointer;
  font-family: monospace;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  transition: background var(--transition);
}
.code:hover { background: rgba(255,255,255,0.35); }

.dismiss {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  font-size: 16px;
  opacity: 0.7;
  padding: 0;
  line-height: 1;
}
.dismiss:hover { opacity: 1; }
```

- [ ] **Step 4: Add to locale layout**

In `app/[locale]/layout.tsx`, add `import { AnnouncementBar } from '@/components/layout/AnnouncementBar'` and place `<AnnouncementBar />` before `<Header locale={locale} />`.

- [ ] **Step 5: Verify**

Load `http://localhost:3000` — orange bar at very top with promo code. Click code → copies to clipboard. Click ✕ → hides. Refresh → still hidden. Open new tab → appears again.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add announcement bar with promo code and session dismiss" && git push
```

---

### Task 3: Locale switcher in Header and Footer

**Files:**
- Create: `components/ui/LocaleSwitcher.tsx`
- Create: `components/ui/LocaleSwitcher.module.css`
- Modify: `components/layout/Header.tsx`
- Modify: `components/layout/Footer.tsx`
- Modify: `messages/*.json` (all 10 locales — add locale names)

**Interfaces:**
- Produces: `<LocaleSwitcher currentLocale={string} currentPath={string} />` — renders a `<select>` that redirects to the same page in another locale

- [ ] **Step 1: Add locale name messages**

```python
import json, os

LOCALES = {
  'sk': 'Slovenčina', 'en': 'English', 'cs': 'Čeština',
  'de': 'Deutsch', 'es': 'Español', 'fr': 'Français',
  'hu': 'Magyar', 'it': 'Italiano', 'pl': 'Polski', 'uk': 'Українська',
}

base = '/home/adamb/svetlana-shop/messages'
for locale in LOCALES:
    path = os.path.join(base, f'{locale}.json')
    with open(path) as f:
        d = json.load(f)
    d.setdefault('locales', {}).update(LOCALES)
    with open(path, 'w') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'Updated {locale}.json')
```

- [ ] **Step 2: Create LocaleSwitcher.tsx**

```tsx
// components/ui/LocaleSwitcher.tsx
'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import styles from './LocaleSwitcher.module.css'

const LOCALES = ['sk','en','cs','de','es','fr','hu','it','pl','uk'] as const
const DEFAULT_LOCALE = 'sk'

export function LocaleSwitcher({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations('locales')
  const pathname = usePathname()
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value
    // Current path: for sk it's /path, for others it's /en/path etc.
    // Strip existing locale prefix
    let path = pathname
    if (currentLocale !== DEFAULT_LOCALE) {
      path = pathname.replace(new RegExp(`^/${currentLocale}`), '') || '/'
    }
    const newPath = next === DEFAULT_LOCALE ? path : `/${next}${path}`
    router.push(newPath)
  }

  return (
    <select
      value={currentLocale}
      onChange={handleChange}
      className={styles.select}
      aria-label="Language"
    >
      {LOCALES.map(l => (
        <option key={l} value={l}>{t(l)}</option>
      ))}
    </select>
  )
}
```

- [ ] **Step 3: Create LocaleSwitcher.module.css**

```css
/* components/ui/LocaleSwitcher.module.css */
.select {
  appearance: none;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: var(--font-body);
  font-size: 13px;
  padding: 4px 24px 4px 8px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  transition: border-color var(--transition), color var(--transition);
}
.select:hover { border-color: var(--color-accent); color: var(--color-text); }
.select:focus { outline: 2px solid var(--color-accent); outline-offset: 1px; }
```

- [ ] **Step 4: Add LocaleSwitcher to Header**

In `components/layout/Header.tsx`, add to the `actions` div after ThemeToggle:

```tsx
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
// ...inside actions div:
<LocaleSwitcher currentLocale={locale} />
```

- [ ] **Step 5: Add LocaleSwitcher to Footer brand column**

In `components/layout/Footer.tsx`, add below the social links:

```tsx
import { LocaleSwitcher } from '@/components/ui/LocaleSwitcher'
// ...inside brand column div, after social:
<div className={styles.localeRow}>
  <LocaleSwitcher currentLocale={locale} />
</div>
```

Add to Footer.module.css:
```css
.localeRow { margin-top: 16px; }
```

- [ ] **Step 6: Verify**

Load `http://localhost:3000` — dropdown in header shows current locale name. Switching to "English" navigates to `/en`. All pages stay on the same path. Footer also shows the switcher.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add locale switcher to header and footer" && git push
```

---

### Task 4: Cookie consent banner

**Files:**
- Create: `components/layout/CookieBanner.tsx`
- Create: `components/layout/CookieBanner.module.css`
- Modify: `app/[locale]/layout.tsx`
- Modify: `messages/*.json` (all 10 locales)

**Interfaces:**
- Produces: `<CookieBanner />` — client component, manages `sv_cookie_consent` in localStorage
- Exports: `hasCookieConsent(): boolean` from `lib/cookies.ts` for SSR checks

- [ ] **Step 1: Add cookie messages to all locales**

```python
import json, os

translations = {
  'sk': {
    'title': 'Používame cookies',
    'desc': 'Používame cookies na zlepšenie vášho zážitku. Môžete ich prijať alebo odmietnuť.',
    'accept': 'Prijať všetky',
    'decline': 'Odmietnuť',
    'necessary': 'Potrebné',
    'necessary_desc': 'Nevyhnutné pre fungovanie stránky.',
  },
  'en': {
    'title': 'We use cookies',
    'desc': 'We use cookies to improve your experience. You can accept or decline them.',
    'accept': 'Accept all',
    'decline': 'Decline',
    'necessary': 'Necessary',
    'necessary_desc': 'Required for the website to function.',
  },
  'cs': {
    'title': 'Používáme cookies',
    'desc': 'Používáme cookies pro zlepšení vašeho zážitku.',
    'accept': 'Přijmout vše',
    'decline': 'Odmítnout',
    'necessary': 'Nezbytné',
    'necessary_desc': 'Nezbytné pro fungování stránky.',
  },
  'de': {
    'title': 'Wir verwenden Cookies',
    'desc': 'Wir verwenden Cookies, um Ihr Erlebnis zu verbessern.',
    'accept': 'Alle akzeptieren',
    'decline': 'Ablehnen',
    'necessary': 'Notwendig',
    'necessary_desc': 'Für den Betrieb der Website erforderlich.',
  },
  'es': {
    'title': 'Usamos cookies',
    'desc': 'Usamos cookies para mejorar tu experiencia.',
    'accept': 'Aceptar todo',
    'decline': 'Rechazar',
    'necessary': 'Necesarias',
    'necessary_desc': 'Necesarias para el funcionamiento del sitio.',
  },
  'fr': {
    'title': 'Nous utilisons des cookies',
    'desc': 'Nous utilisons des cookies pour améliorer votre expérience.',
    'accept': 'Tout accepter',
    'decline': 'Refuser',
    'necessary': 'Nécessaires',
    'necessary_desc': 'Indispensables au fonctionnement du site.',
  },
  'hu': {
    'title': 'Cookie-kat használunk',
    'desc': 'Cookie-kat használunk a felhasználói élmény javítása érdekében.',
    'accept': 'Összes elfogadása',
    'decline': 'Elutasítás',
    'necessary': 'Szükséges',
    'necessary_desc': 'A weboldal működéséhez szükséges.',
  },
  'it': {
    'title': 'Usiamo i cookie',
    'desc': 'Usiamo i cookie per migliorare la tua esperienza.',
    'accept': 'Accetta tutto',
    'decline': 'Rifiuta',
    'necessary': 'Necessari',
    'necessary_desc': 'Necessari per il funzionamento del sito.',
  },
  'pl': {
    'title': 'Używamy plików cookie',
    'desc': 'Używamy plików cookie, aby poprawić Twoje doświadczenia.',
    'accept': 'Zaakceptuj wszystkie',
    'decline': 'Odrzuć',
    'necessary': 'Niezbędne',
    'necessary_desc': 'Wymagane do działania strony.',
  },
  'uk': {
    'title': 'Ми використовуємо файли cookie',
    'desc': 'Ми використовуємо файли cookie для покращення вашого досвіду.',
    'accept': 'Прийняти всі',
    'decline': 'Відхилити',
    'necessary': 'Необхідні',
    'necessary_desc': 'Необхідні для роботи сайту.',
  },
}

base = '/home/adamb/svetlana-shop/messages'
for locale, keys in translations.items():
    path = os.path.join(base, f'{locale}.json')
    with open(path) as f:
        d = json.load(f)
    d.setdefault('cookies', {}).update(keys)
    with open(path, 'w') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'Updated {locale}.json')
```

- [ ] **Step 2: Create CookieBanner.tsx**

```tsx
// components/layout/CookieBanner.tsx
'use client'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import styles from './CookieBanner.module.css'

const STORAGE_KEY = 'sv_cookie_consent'

export type ConsentValue = 'accepted' | 'declined' | null

export function getCookieConsent(): ConsentValue {
  if (typeof window === 'undefined') return null
  return (localStorage.getItem(STORAGE_KEY) as ConsentValue) ?? null
}

export function CookieBanner() {
  const t = useTranslations('cookies')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true)

    // "Cookie Preferences" footer button reopens the banner
    const handler = () => {
      localStorage.removeItem(STORAGE_KEY)
      setVisible(true)
    }
    window.addEventListener('reopenCookieBanner', handler)
    return () => window.removeEventListener('reopenCookieBanner', handler)
  }, [])

  function choose(value: 'accepted' | 'declined') {
    localStorage.setItem(STORAGE_KEY, value)
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={t('title')}>
      <div className={styles.banner}>
        <h2 className={styles.title}>{t('title')}</h2>
        <p className={styles.desc}>{t('desc')}</p>
        <div className={styles.necessary}>
          <span className={styles.necessaryLabel}>{t('necessary')}</span>
          <span className={styles.necessaryDesc}>{t('necessary_desc')}</span>
        </div>
        <div className={styles.actions}>
          <button className={styles.decline} onClick={() => choose('declined')}>{t('decline')}</button>
          <button className={styles.accept} onClick={() => choose('accepted')}>{t('accept')}</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create CookieBanner.module.css**

```css
/* components/layout/CookieBanner.module.css */
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
}

.banner {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  max-width: 520px;
  width: 100%;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
}

.title { font-family: var(--font-heading); font-size: 18px; font-weight: 700; margin-bottom: 10px; }
.desc { font-size: 14px; color: var(--color-text-muted); line-height: 1.6; margin-bottom: 16px; }

.necessary {
  background: var(--color-surface);
  border-radius: var(--radius-sm);
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.necessaryLabel { font-size: 13px; font-weight: 600; }
.necessaryDesc { font-size: 12px; color: var(--color-text-muted); }

.actions { display: flex; gap: 12px; justify-content: flex-end; }

.decline {
  padding: 10px 20px; background: none;
  border: 1px solid var(--color-border); border-radius: var(--radius-sm);
  color: var(--color-text-muted); cursor: pointer;
  font-family: var(--font-body); font-size: 14px;
  transition: border-color var(--transition);
}
.decline:hover { border-color: var(--color-text); }

.accept {
  padding: 10px 20px; background: var(--color-accent);
  border: none; border-radius: var(--radius-sm);
  color: #fff; cursor: pointer;
  font-family: var(--font-body); font-size: 14px; font-weight: 600;
  transition: opacity var(--transition);
}
.accept:hover { opacity: 0.85; }
```

- [ ] **Step 4: Add to locale layout**

In `app/[locale]/layout.tsx`:
```tsx
import { CookieBanner } from '@/components/layout/CookieBanner'
// Inside <body>, after CartHydration:
<CookieBanner />
```

- [ ] **Step 5: Verify**

First visit: overlay + banner appears. Click "Accept all" → banner closes, localStorage has `sv_cookie_consent=accepted`. Refresh → no banner. Footer "Cookie Preferences" button → banner reopens.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat: add GDPR cookie consent banner with accept/decline and reopen" && git push
```

---

### Task 5: Legal and policy pages

**Files:**
- Create: `collections/Pages.ts`
- Modify: `payload.config.ts`
- Create: `app/[locale]/policies/[handle]/page.tsx`
- Create: `app/[locale]/pages/[slug]/page.tsx`
- Create: `app/[locale]/not-found.tsx`
- Modify: `messages/*.json` (all 10 — add `not_found` keys)

**Interfaces:**
- Produces: `/policies/privacy-policy`, `/policies/shipping-policy`, `/policies/refund-policy`, `/policies/terms-of-service`, `/pages/legal-notice`, `/pages/contact`
- Produces: `Pages` Payload collection with `slug`, `title`, `body` (richtext), `locale`

- [ ] **Step 1: Create Pages collection**

```ts
// collections/Pages.ts
import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  admin: { useAsTitle: 'title' },
  localization: true,
  fields: [
    { name: 'title', type: 'text', required: true, localized: true },
    { name: 'slug', type: 'text', required: true, unique: true, admin: { description: 'URL slug, e.g. privacy-policy' } },
    { name: 'body', type: 'richText', localized: true },
  ],
}
```

- [ ] **Step 2: Add Pages collection to payload.config.ts**

```ts
import { Pages } from './collections/Pages'
// collections: [Products, Orders, Media, Users, Pages]
```

- [ ] **Step 3: Create policy page route**

```tsx
// app/[locale]/policies/[handle]/page.tsx
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@/payload.config'
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ handle: string; locale: string }> }): Promise<Metadata> {
  const { handle, locale } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'pages', where: { slug: { equals: handle } }, locale, limit: 1 })
  if (!docs[0]) return {}
  return { title: typeof docs[0].title === 'string' ? docs[0].title : '' }
}

export default async function PolicyPage({ params }: { params: Promise<{ handle: string; locale: string }> }) {
  const { handle, locale } = await params
  const payload = await getPayload({ config })
  const { docs } = await payload.find({ collection: 'pages', where: { slug: { equals: handle } }, locale, limit: 1 })
  if (!docs[0]) notFound()
  const page = docs[0]
  const title = typeof page.title === 'string' ? page.title : ''

  return (
    <div className="page-width" style={{ paddingTop: 48, paddingBottom: 80, maxWidth: 720 }}>
      <h1 style={{ marginBottom: 32 }}>{title}</h1>
      {page.body && (
        <div
          className="prose"
          dangerouslySetInnerHTML={{
            __html: richTextToHtml(page.body as unknown as RichTextNode[])
          }}
        />
      )}
    </div>
  )
}

// Minimal richtext → HTML converter for Payload lexical output
interface RichTextNode { type?: string; text?: string; children?: RichTextNode[]; tag?: string; format?: number }

function richTextToHtml(nodes: RichTextNode[]): string {
  return nodes.map(n => {
    if (n.type === 'paragraph') return `<p>${richTextToHtml(n.children ?? [])}</p>`
    if (n.type === 'heading') return `<${n.tag ?? 'h2'}>${richTextToHtml(n.children ?? [])}</${n.tag ?? 'h2'}>`
    if (n.type === 'list') return `<ul>${richTextToHtml(n.children ?? [])}</ul>`
    if (n.type === 'listitem') return `<li>${richTextToHtml(n.children ?? [])}</li>`
    if (n.text) {
      let t = n.text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      if (n.format && n.format & 1) t = `<strong>${t}</strong>`
      if (n.format && n.format & 2) t = `<em>${t}</em>`
      return t
    }
    return ''
  }).join('')
}
```

- [ ] **Step 4: Create /pages/[slug] route**

Create `app/[locale]/pages/[slug]/page.tsx` with identical content as step 3 but with `params.slug` instead of `params.handle`. Both routes fetch from the `pages` collection.

- [ ] **Step 5: Add basic prose CSS**

In `styles/globals.css`, add:
```css
.prose { font-size: 16px; line-height: 1.8; color: var(--color-text); }
.prose h2 { font-family: var(--font-heading); font-size: 22px; font-weight: 700; margin: 32px 0 12px; }
.prose p { margin-bottom: 16px; }
.prose ul { margin-bottom: 16px; padding-left: 24px; }
.prose li { margin-bottom: 8px; }
.prose strong { font-weight: 700; }
```

- [ ] **Step 6: Create not-found.tsx**

```python
import json, os

translations = {
  'sk': {'title': 'Stránka nenájdená', 'desc': 'Stránka, ktorú hľadáte, neexistuje.', 'back': 'Späť na úvodnú stránku'},
  'en': {'title': 'Page not found', 'desc': 'The page you are looking for does not exist.', 'back': 'Back to home'},
  'cs': {'title': 'Stránka nenalezena', 'desc': 'Stránka, kterou hledáte, neexistuje.', 'back': 'Zpět na úvod'},
  'de': {'title': 'Seite nicht gefunden', 'desc': 'Die gesuchte Seite existiert nicht.', 'back': 'Zurück zur Startseite'},
  'es': {'title': 'Página no encontrada', 'desc': 'La página que buscas no existe.', 'back': 'Volver al inicio'},
  'fr': {'title': 'Page non trouvée', 'desc': 'La page que vous cherchez n\'existe pas.', 'back': 'Retour à l\'accueil'},
  'hu': {'title': 'Az oldal nem található', 'desc': 'A keresett oldal nem létezik.', 'back': 'Vissza a főoldalra'},
  'it': {'title': 'Pagina non trovata', 'desc': 'La pagina che cerchi non esiste.', 'back': 'Torna alla home'},
  'pl': {'title': 'Strona nie znaleziona', 'desc': 'Strona, której szukasz, nie istnieje.', 'back': 'Wróć do strony głównej'},
  'uk': {'title': 'Сторінку не знайдено', 'desc': 'Сторінка, яку ви шукаєте, не існує.', 'back': 'Назад на головну'},
}
base = '/home/adamb/svetlana-shop/messages'
for locale, keys in translations.items():
    path = os.path.join(base, f'{locale}.json')
    with open(path) as f:
        d = json.load(f)
    d.setdefault('not_found', {}).update(keys)
    with open(path, 'w') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'Updated {locale}.json')
```

Then create `app/[locale]/not-found.tsx`:
```tsx
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'

export default async function NotFound() {
  const t = await getTranslations('not_found')
  return (
    <div className="page-width" style={{ paddingTop: 80, paddingBottom: 80, textAlign: 'center' }}>
      <h1 style={{ fontSize: 80, fontWeight: 700, opacity: 0.15, marginBottom: 0 }}>404</h1>
      <h2 style={{ marginBottom: 16 }}>{t('title')}</h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: 32 }}>{t('desc')}</p>
      <Link href="/" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>{t('back')}</Link>
    </div>
  )
}
```

- [ ] **Step 7: Seed initial page content via Payload admin**

Navigate to `http://localhost:3000/admin`. Create pages:
- slug: `privacy-policy` — title: "Ochrana osobných údajov" — body: minimal placeholder text
- slug: `shipping-policy` — title: "Doprava a vrátenie"
- slug: `refund-policy` — title: "Reklamácie"
- slug: `terms-of-service` — title: "Obchodné podmienky"
- slug: `legal-notice` — title: "Právne upozornenie"

(Content can be filled in later; the routes must work.)

- [ ] **Step 8: Verify**

Visit `http://localhost:3000/policies/privacy-policy` — renders page title and body. Visit `/en/policies/privacy-policy` — same in English. Visit `/gibberish` — shows 404 component.

- [ ] **Step 9: Commit**

```bash
git add -A && git commit -m "feat: add legal/policy pages via Payload Pages collection + custom 404" && git push
```

---

### Task 6: SEO — sitemap, robots.txt, OG meta

**Files:**
- Create: `app/sitemap.ts`
- Create: `app/robots.ts`
- Modify: `app/[locale]/layout.tsx` (add generateMetadata)

**Interfaces:**
- Produces: `/sitemap.xml` and `/robots.txt` via Next.js App Router file conventions

- [ ] **Step 1: Create app/sitemap.ts**

```ts
// app/sitemap.ts
import type { MetadataRoute } from 'next'
import { getPayload } from 'payload'
import config from '@/payload.config'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const LOCALES = ['sk','en','cs','de','es','fr','hu','it','pl','uk']
const DEFAULT_LOCALE = 'sk'

function url(locale: string, path: string) {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`
  return `${BASE_URL}${prefix}${path}`
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getPayload({ config })

  const [{ docs: products }, { docs: pages }] = await Promise.all([
    payload.find({ collection: 'products', where: { status: { equals: 'published' } }, limit: 200, select: { slug: true, updatedAt: true } }),
    payload.find({ collection: 'pages', limit: 200, select: { slug: true, updatedAt: true } }),
  ])

  const staticRoutes = ['/', '/configurator', '/gallery', '/cart']
  const entries: MetadataRoute.Sitemap = []

  for (const locale of LOCALES) {
    for (const route of staticRoutes) {
      entries.push({ url: url(locale, route), lastModified: new Date(), changeFrequency: 'weekly', priority: route === '/' ? 1 : 0.8 })
    }
    for (const p of products) {
      entries.push({ url: url(locale, `/products/${p.slug}`), lastModified: new Date(p.updatedAt as string), changeFrequency: 'monthly', priority: 0.7 })
    }
    for (const p of pages) {
      entries.push({ url: url(locale, `/pages/${p.slug}`), lastModified: new Date(p.updatedAt as string), changeFrequency: 'yearly', priority: 0.5 })
    }
  }

  return entries
}
```

- [ ] **Step 2: Create app/robots.ts**

```ts
// app/robots.ts
import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api/'] },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
```

- [ ] **Step 3: Add generateMetadata and OG tags to locale layout**

Replace the existing `app/[locale]/layout.tsx` export with:

```tsx
import type { Metadata } from 'next'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return {
    metadataBase: new URL(BASE_URL),
    title: { default: 'Svetlana Lampe', template: '%s | Svetlana Lampe' },
    description: 'Ručne navrhované 3D tlačené lampy',
    openGraph: {
      siteName: 'Svetlana Lampe',
      locale,
      type: 'website',
    },
    twitter: { card: 'summary_large_image' },
    robots: { index: true, follow: true },
  }
}
```

- [ ] **Step 4: Verify**

- `http://localhost:3000/sitemap.xml` → valid XML sitemap
- `http://localhost:3000/robots.txt` → valid robots.txt
- View source of any page → check `<meta property="og:site_name">` present

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: add sitemap.xml, robots.txt, and OG meta tags" && git push
```

---

### Task 7: Cart drawer

**Files:**
- Modify: `store/cart.ts` (add drawer state)
- Create: `components/cart/CartDrawer.tsx`
- Create: `components/cart/CartDrawer.module.css`
- Modify: `app/[locale]/layout.tsx` (add CartDrawer)
- Modify: `components/configurator/Configurator.tsx` (open drawer on add to cart)
- Modify: `messages/*.json` (all 10 — add cart drawer keys)

**Interfaces:**
- `useCart(s => s.drawerOpen)` — boolean
- `useCart(s => s.openDrawer)` — `() => void`
- `useCart(s => s.closeDrawer)` — `() => void`
- `addItem` already exists — also calls `openDrawer` after adding

- [ ] **Step 1: Add drawer state to cart store**

In `store/cart.ts`, add to the interface and implementation:

```ts
// Add to CartState interface:
drawerOpen: boolean
openDrawer: () => void
closeDrawer: () => void

// Add to persist implementation (inside the set/get factory):
drawerOpen: false,
openDrawer: () => set({ drawerOpen: true }),
closeDrawer: () => set({ drawerOpen: false }),

// Modify addItem to open drawer after adding:
addItem: (item) => {
  const id = `${item.productId}-${JSON.stringify(item.configuration)}`
  set(s => {
    const existing = s.items.find(i => i.id === id)
    if (existing) {
      return { items: s.items.map(i => i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i), drawerOpen: true }
    }
    return { items: [...s.items, { ...item, id }], drawerOpen: true }
  })
},
```

Note: `drawerOpen` must be excluded from persistence. Add `partialize` to the persist config:
```ts
{ name: 'svetlana-cart', skipHydration: true, partialize: (s) => ({ items: s.items }) }
```

- [ ] **Step 2: Add cart drawer messages**

```python
import json, os

translations = {
  'sk': {'title': 'Košík', 'empty': 'Váš košík je prázdny.', 'checkout': 'Pokračovať k objednávke', 'remove': 'Odstrániť', 'view_cart': 'Zobraziť košík', 'continue': 'Pokračovať v nákupe'},
  'en': {'title': 'Cart', 'empty': 'Your cart is empty.', 'checkout': 'Proceed to checkout', 'remove': 'Remove', 'view_cart': 'View cart', 'continue': 'Continue shopping'},
  'cs': {'title': 'Košík', 'empty': 'Váš košík je prázdný.', 'checkout': 'Pokračovat k objednávce', 'remove': 'Odebrat', 'view_cart': 'Zobrazit košík', 'continue': 'Pokračovat v nákupu'},
  'de': {'title': 'Warenkorb', 'empty': 'Ihr Warenkorb ist leer.', 'checkout': 'Zur Kasse', 'remove': 'Entfernen', 'view_cart': 'Warenkorb anzeigen', 'continue': 'Weiter einkaufen'},
  'es': {'title': 'Carrito', 'empty': 'Tu carrito está vacío.', 'checkout': 'Proceder al pago', 'remove': 'Eliminar', 'view_cart': 'Ver carrito', 'continue': 'Seguir comprando'},
  'fr': {'title': 'Panier', 'empty': 'Votre panier est vide.', 'checkout': 'Passer à la caisse', 'remove': 'Supprimer', 'view_cart': 'Voir le panier', 'continue': 'Continuer les achats'},
  'hu': {'title': 'Kosár', 'empty': 'A kosara üres.', 'checkout': 'Tovább a fizetéshez', 'remove': 'Eltávolítás', 'view_cart': 'Kosár megtekintése', 'continue': 'Vásárlás folytatása'},
  'it': {'title': 'Carrello', 'empty': 'Il tuo carrello è vuoto.', 'checkout': 'Procedi al checkout', 'remove': 'Rimuovi', 'view_cart': 'Vedi carrello', 'continue': 'Continua gli acquisti'},
  'pl': {'title': 'Koszyk', 'empty': 'Twój koszyk jest pusty.', 'checkout': 'Przejdź do kasy', 'remove': 'Usuń', 'view_cart': 'Zobacz koszyk', 'continue': 'Kontynuuj zakupy'},
  'uk': {'title': 'Кошик', 'empty': 'Ваш кошик порожній.', 'checkout': 'Перейти до оформлення', 'remove': 'Видалити', 'view_cart': 'Переглянути кошик', 'continue': 'Продовжити покупки'},
}

base = '/home/adamb/svetlana-shop/messages'
for locale, keys in translations.items():
    path = os.path.join(base, f'{locale}.json')
    with open(path) as f:
        d = json.load(f)
    d.setdefault('cart_drawer', {}).update(keys)
    with open(path, 'w') as f:
        json.dump(d, f, ensure_ascii=False, indent=2)
    print(f'Updated {locale}.json')
```

- [ ] **Step 3: Create CartDrawer.tsx**

```tsx
// components/cart/CartDrawer.tsx
'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCart } from '@/store/cart'
import { useEffect } from 'react'
import styles from './CartDrawer.module.css'

interface CartDrawerProps { locale: string }

export function CartDrawer({ locale }: CartDrawerProps) {
  const t = useTranslations('cart_drawer')
  const items = useCart(s => s.items)
  const total = useCart(s => s.total)
  const remove = useCart(s => s.removeItem)
  const close = useCart(s => s.closeDrawer)
  const open = useCart(s => s.drawerOpen)
  const prefix = locale === 'sk' ? '' : `/${locale}`

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [close])

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const currency = items[0]?.currency ?? 'EUR'

  return (
    <>
      <div className={styles.backdrop} onClick={close} aria-hidden />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={t('title')}>
        <div className={styles.header}>
          <h2 className={styles.title}>{t('title')} ({items.length})</h2>
          <button className={styles.close} onClick={close} aria-label="Close">✕</button>
        </div>

        <div className={styles.body}>
          {items.length === 0 ? (
            <p className={styles.empty}>{t('empty')}</p>
          ) : (
            <ul className={styles.list}>
              {items.map(item => (
                <li key={item.id} className={styles.item}>
                  <div className={styles.itemInfo}>
                    <p className={styles.itemTitle}>{item.title}</p>
                    <p className={styles.itemConfig}>
                      {Object.entries(item.configuration)
                        .filter(([, v]) => v)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ')}
                    </p>
                    <p className={styles.itemPrice}>
                      {(item.unitPrice / 100).toFixed(2)} {item.currency} × {item.quantity}
                    </p>
                  </div>
                  <button className={styles.remove} onClick={() => remove(item.id)} aria-label={t('remove')}>✕</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.total}>
              <span>{t('label_total' as never) || 'Total'}</span>
              <strong>{(total() / 100).toFixed(2)} {currency}</strong>
            </div>
            <Link href={`${prefix}/checkout`} className={styles.checkoutBtn} onClick={close}>
              {t('checkout')}
            </Link>
            <Link href={`${prefix}/cart`} className={styles.viewCart} onClick={close}>
              {t('view_cart')}
            </Link>
          </div>
        )}
      </aside>
    </>
  )
}
```

- [ ] **Step 4: Create CartDrawer.module.css**

```css
/* components/cart/CartDrawer.module.css */
.backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 200;
  animation: fadeIn 0.2s ease;
}

.drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: 400px; max-width: 100vw;
  background: var(--color-bg);
  border-left: 1px solid var(--color-border);
  z-index: 201;
  display: flex; flex-direction: column;
  animation: slideIn 0.25s ease;
}

@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }

.header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}
.title { font-family: var(--font-heading); font-size: 18px; font-weight: 700; }
.close { background: none; border: none; cursor: pointer; font-size: 18px; color: var(--color-text-muted); padding: 0; }
.close:hover { color: var(--color-text); }

.body { flex: 1; overflow-y: auto; padding: 16px 24px; }
.empty { color: var(--color-text-muted); font-size: 14px; text-align: center; padding: 32px 0; }

.list { list-style: none; display: flex; flex-direction: column; gap: 16px; }
.item { display: flex; gap: 12px; align-items: flex-start; padding-bottom: 16px; border-bottom: 1px solid var(--color-border); }
.itemInfo { flex: 1; min-width: 0; }
.itemTitle { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.itemConfig { font-size: 12px; color: var(--color-text-muted); margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.itemPrice { font-size: 13px; color: var(--color-accent); font-weight: 600; }
.remove { background: none; border: none; cursor: pointer; font-size: 14px; color: var(--color-text-muted); padding: 4px; flex-shrink: 0; }
.remove:hover { color: #e53e3e; }

.footer { padding: 16px 24px; border-top: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 10px; }
.total { display: flex; justify-content: space-between; font-size: 16px; margin-bottom: 4px; }
.checkoutBtn {
  display: block; text-align: center;
  background: var(--color-accent); color: #fff;
  padding: 14px; border-radius: var(--radius-sm);
  font-weight: 600; text-decoration: none; font-size: 15px;
  transition: opacity var(--transition);
}
.checkoutBtn:hover { opacity: 0.85; }
.viewCart { display: block; text-align: center; font-size: 13px; color: var(--color-text-muted); text-decoration: underline; }
.viewCart:hover { color: var(--color-text); }
```

- [ ] **Step 5: Add CartDrawer to locale layout**

```tsx
import { CartDrawer } from '@/components/cart/CartDrawer'
// Inside <body>:
<CartDrawer locale={locale} />
```

- [ ] **Step 6: Verify**

Open configurator. Add to cart → drawer slides in from right. Click backdrop → closes. Press Escape → closes. Shows item with config, price × qty, total. "Proceed to checkout" → navigates to checkout and closes drawer.

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "feat: add slide-in cart drawer, opens on add-to-cart" && git push
```

---

### Task 8: Final validation and E2E test updates

**Files:**
- Modify: `e2e/home.spec.ts` (add footer, announcement, locale switcher tests)
- Modify: `e2e/configurator.spec.ts` (add cart drawer test)

**Interfaces:** Uses existing Playwright helpers

- [ ] **Step 1: Add E2E tests for new features**

Add to `e2e/home.spec.ts`:

```ts
test('footer has policy links', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: /ochrana|privacy/i }).first()).toBeVisible()
})

test('announcement bar is visible and dismissible', async ({ page }) => {
  await page.goto('/')
  const bar = page.locator('[role="banner"]').first()
  await expect(bar).toBeVisible()
  await bar.getByRole('button').click()
  await expect(bar).not.toBeVisible()
})

test('locale switcher changes locale', async ({ page }) => {
  await page.goto('/')
  const select = page.getByRole('combobox', { name: /language/i })
  await select.selectOption('en')
  await expect(page).toHaveURL(/\/en/)
})

test('cookie banner appears on first visit', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: /accept/i }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})
```

Add to `e2e/configurator.spec.ts`:

```ts
test('add to cart opens cart drawer', async ({ page }) => {
  const status = await goToConfigurator(page)
  test.skip(status !== 200, 'No products in DB')
  await page.waitForSelector('[role="tab"]')
  await page.getByRole('button', { name: /pridať|add to cart/i }).click()
  await expect(page.getByRole('dialog', { name: /košík|cart/i })).toBeVisible()
})
```

- [ ] **Step 2: Run full test suite**

```bash
cd /home/adamb/svetlana-shop && npx playwright test --reporter=list
```

Expected: all tests pass (or known skips).

- [ ] **Step 3: Fix any failures**

If cookie banner dialog conflicts with other dialogs: scope the selector (`.getByRole('dialog', { name: /cookie/i })`).

If locale switcher test fails because of hydration timing: add `await page.waitForLoadState('networkidle')` before asserting URL.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: add E2E tests for footer, announcement bar, locale switcher, cookie banner, cart drawer" && git push
```

---

## Execution order

1. Task 1 — Footer rebuild
2. Task 2 — Announcement bar
3. Task 3 — Locale switcher
4. Task 4 — Cookie consent
5. Task 5 — Legal pages
6. Task 6 — SEO
7. Task 7 — Cart drawer
8. Task 8 — Validation
