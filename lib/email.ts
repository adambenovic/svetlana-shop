import fs from 'fs'
import path from 'path'
import { lampConfigLines } from './lamp-config-display'
import { pageTitle, type LegalHandle } from '@/app/[locale]/policies/legal-pages'

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email'

// Seller identity — CRD Art. 6(1)(b)/(c) information repeated in the confirmation.
// Matches the legal pages (contact-information) and the invoice supplier block.
const TRADER = {
  name: 'BenoCode s.r.o.',
  brand: 'Svetlana Lampe',
  street: 'Rázusova 6',
  city: '949 01 Nitra',
  ico: '55 920 918',
  icDph: 'SK2122131110',
  email: 'contact@svetlanalampe.sk',
  phone: '+421 910 610 892',
  web: 'https://svetlanalampe.sk',
}

const LOCALES = ['sk', 'cs', 'de', 'pl', 'hu', 'uk', 'en', 'es', 'fr', 'it'] as const
export type EmailLocale = (typeof LOCALES)[number]

export function isEmailLocale(locale: unknown): locale is EmailLocale {
  return typeof locale === 'string' && (LOCALES as readonly string[]).includes(locale)
}

interface Strings {
  subject: string; thanks: string; intro: string
  order: string; orderDate: string; item: string; qty: string; price: string
  subtotal: string; discount: string; shipping: string; free: string; total: string
  payment: string; paid: string; pickup: string; delivery: string
  invoice: string; invoiceAttached: string; invoiceDownload: string
  seller: string; companyId: string; vatId: string; country: string
  withdrawalTitle: string; withdrawalIntro: string; withdrawalFallback: string
  docsTitle: string; contact: string; footer: string
}

const i18n: Record<EmailLocale, Strings> = {
  sk: {
    subject: 'Objednávka {n} potvrdená — Svetlana Lampe',
    thanks: 'Ďakujeme za vašu objednávku!',
    intro: 'Prijali sme vašu platbu a týmto potvrdzujeme uzatvorenie kúpnej zmluvy. Tento e-mail si, prosím, uschovajte — obsahuje údaje o objednávke a poučenie o práve na odstúpenie od zmluvy.',
    order: 'Číslo objednávky', orderDate: 'Dátum objednávky', item: 'Produkt', qty: 'Množstvo', price: 'Cena',
    subtotal: 'Medzisúčet', discount: 'Zľava', shipping: 'Doprava na výdajné miesto', free: 'zdarma', total: 'Celková suma (vrátane DPH)',
    payment: 'Platba', paid: 'uhradená online (GoPay)', pickup: 'Výdajné miesto',
    delivery: 'Vašu lampu vyrobíme na objednávku do 3 – 5 pracovných dní. Následne ju Packeta doručí na zvolené výdajné miesto, spravidla do 2 – 5 pracovných dní, a upozorní vás, keď bude pripravená na vyzdvihnutie.',
    invoice: 'Faktúra', invoiceAttached: 'Faktúra je priložená k tomuto e-mailu vo formáte PDF.', invoiceDownload: 'Stiahnuť faktúru',
    seller: 'Predávajúci', companyId: 'IČO', vatId: 'IČ DPH', country: 'Slovenská republika',
    withdrawalTitle: 'Poučenie o práve na odstúpenie od zmluvy',
    withdrawalIntro: 'Právo na odstúpenie od zmluvy sa vzťahuje na všetky naše lampy vrátane lámp navrhnutých v konfigurátore.',
    withdrawalFallback: 'Úplné poučenie o odstúpení od zmluvy a vzorový formulár nájdete tu:',
    docsTitle: 'Zmluvné dokumenty',
    contact: 'Máte otázky? Napíšte nám na {email} alebo zavolajte na {phone}.',
    footer: 'Svetlana Lampe — 3D tlačené stolové lampy',
  },
  cs: {
    subject: 'Objednávka {n} potvrzena — Svetlana Lampe',
    thanks: 'Děkujeme za vaši objednávku!',
    intro: 'Obdrželi jsme vaši platbu a tímto potvrzujeme uzavření kupní smlouvy. Tento e-mail si prosím uschovejte — obsahuje údaje o objednávce a poučení o právu na odstoupení od smlouvy.',
    order: 'Číslo objednávky', orderDate: 'Datum objednávky', item: 'Produkt', qty: 'Množství', price: 'Cena',
    subtotal: 'Mezisoučet', discount: 'Sleva', shipping: 'Doprava na výdejní místo', free: 'zdarma', total: 'Celková částka (včetně DPH)',
    payment: 'Platba', paid: 'uhrazena online (GoPay)', pickup: 'Výdejní místo',
    delivery: 'Vaši lampu vyrobíme na zakázku do 3–5 pracovních dnů. Poté ji Zásilkovna doručí na zvolené výdejní místo, obvykle do 2–5 pracovních dnů, a upozorní vás, až bude připravena k vyzvednutí.',
    invoice: 'Faktura', invoiceAttached: 'Faktura je přiložena k tomuto e-mailu ve formátu PDF.', invoiceDownload: 'Stáhnout fakturu',
    seller: 'Prodávající', companyId: 'IČO', vatId: 'DIČ (IČ DPH)', country: 'Slovensko',
    withdrawalTitle: 'Poučení o právu na odstoupení od smlouvy',
    withdrawalIntro: 'Právo na odstoupení od smlouvy se vztahuje na všechny naše lampy včetně lamp navržených v konfigurátoru.',
    withdrawalFallback: 'Úplné poučení o odstoupení od smlouvy a vzorový formulář najdete zde:',
    docsTitle: 'Smluvní dokumenty',
    contact: 'Máte dotazy? Napište nám na {email} nebo zavolejte na {phone}.',
    footer: 'Svetlana Lampe — 3D tištěné stolní lampy',
  },
  de: {
    subject: 'Bestellung {n} bestätigt — Svetlana Lampe',
    thanks: 'Vielen Dank für Ihre Bestellung!',
    intro: 'Wir haben Ihre Zahlung erhalten und bestätigen hiermit den Abschluss des Kaufvertrags. Bitte bewahren Sie diese E-Mail auf – sie enthält Ihre Bestelldaten und die Widerrufsbelehrung.',
    order: 'Bestellnummer', orderDate: 'Bestelldatum', item: 'Artikel', qty: 'Menge', price: 'Preis',
    subtotal: 'Zwischensumme', discount: 'Rabatt', shipping: 'Versand zum Abholpunkt', free: 'kostenlos', total: 'Gesamtbetrag (inkl. MwSt.)',
    payment: 'Zahlung', paid: 'online bezahlt (GoPay)', pickup: 'Abholpunkt',
    delivery: 'Ihre Lampe wird innerhalb von 3–5 Werktagen auf Bestellung gefertigt. Anschließend stellt Packeta sie in der Regel innerhalb von 2–5 Werktagen an Ihrem gewählten Abholpunkt zu und benachrichtigt Sie, sobald sie abholbereit ist.',
    invoice: 'Rechnung', invoiceAttached: 'Die Rechnung ist dieser E-Mail als PDF beigefügt.', invoiceDownload: 'Rechnung herunterladen',
    seller: 'Verkäufer', companyId: 'Firmennummer (IČO)', vatId: 'USt-IdNr.', country: 'Slowakei',
    withdrawalTitle: 'Ihr Widerrufsrecht',
    withdrawalIntro: 'Das Widerrufsrecht gilt für alle unsere Lampen, auch für im Konfigurator gestaltete Lampen.',
    withdrawalFallback: 'Die vollständige Widerrufsbelehrung und das Muster-Widerrufsformular finden Sie hier:',
    docsTitle: 'Vertragsunterlagen',
    contact: 'Fragen? Schreiben Sie uns an {email} oder rufen Sie uns an unter {phone}.',
    footer: 'Svetlana Lampe — 3D-gedruckte Tischlampen',
  },
  pl: {
    subject: 'Zamówienie {n} potwierdzone — Svetlana Lampe',
    thanks: 'Dziękujemy za zamówienie!',
    intro: 'Otrzymaliśmy Państwa płatność i niniejszym potwierdzamy zawarcie umowy sprzedaży. Prosimy zachować tę wiadomość — zawiera dane zamówienia oraz pouczenie o prawie odstąpienia od umowy.',
    order: 'Numer zamówienia', orderDate: 'Data zamówienia', item: 'Produkt', qty: 'Ilość', price: 'Cena',
    subtotal: 'Suma częściowa', discount: 'Rabat', shipping: 'Dostawa do punktu odbioru', free: 'bezpłatnie', total: 'Łącznie (z VAT)',
    payment: 'Płatność', paid: 'opłacona online (GoPay)', pickup: 'Punkt odbioru',
    delivery: 'Państwa lampa zostanie wykonana na zamówienie w ciągu 3–5 dni roboczych. Następnie Packeta dostarczy ją do wybranego punktu odbioru, zwykle w ciągu 2–5 dni roboczych, i poinformuje Państwa, gdy będzie gotowa do odbioru.',
    invoice: 'Faktura', invoiceAttached: 'Faktura została dołączona do tej wiadomości w formacie PDF.', invoiceDownload: 'Pobierz fakturę',
    seller: 'Sprzedawca', companyId: 'Numer identyfikacyjny (IČO)', vatId: 'Numer VAT UE', country: 'Słowacja',
    withdrawalTitle: 'Pouczenie o prawie odstąpienia od umowy',
    withdrawalIntro: 'Prawo odstąpienia od umowy przysługuje w odniesieniu do wszystkich naszych lamp, również lamp zaprojektowanych w konfiguratorze.',
    withdrawalFallback: 'Pełne pouczenie o odstąpieniu od umowy oraz wzór formularza znajdą Państwo tutaj:',
    docsTitle: 'Dokumenty umowy',
    contact: 'Mają Państwo pytania? Prosimy o kontakt: {email} lub {phone}.',
    footer: 'Svetlana Lampe — lampy stołowe drukowane w 3D',
  },
  hu: {
    subject: '{n} rendelés visszaigazolva — Svetlana Lampe',
    thanks: 'Köszönjük a rendelését!',
    intro: 'Megkaptuk a fizetését, és ezúton visszaigazoljuk az adásvételi szerződés létrejöttét. Kérjük, őrizze meg ezt az e-mailt – tartalmazza a rendelés adatait és az elállási jogról szóló tájékoztatót.',
    order: 'Rendelésszám', orderDate: 'Rendelés dátuma', item: 'Termék', qty: 'Mennyiség', price: 'Ár',
    subtotal: 'Részösszeg', discount: 'Kedvezmény', shipping: 'Szállítás az átvételi pontra', free: 'ingyenes', total: 'Végösszeg (áfával)',
    payment: 'Fizetés', paid: 'online kifizetve (GoPay)', pickup: 'Átvételi pont',
    delivery: 'Lámpáját megrendelésre, 3–5 munkanapon belül elkészítjük. Ezt követően a Packeta általában 2–5 munkanapon belül kézbesíti a választott átvételi pontra, és értesíti Önt, amint átvehető.',
    invoice: 'Számla', invoiceAttached: 'A számlát PDF formátumban csatoltuk ehhez az e-mailhez.', invoiceDownload: 'Számla letöltése',
    seller: 'Eladó', companyId: 'Cégazonosító (IČO)', vatId: 'Közösségi adószám', country: 'Szlovákia',
    withdrawalTitle: 'Tájékoztató az elállási jogról',
    withdrawalIntro: 'Az elállási jog minden lámpánkra vonatkozik, a konfigurátorban összeállított lámpákra is.',
    withdrawalFallback: 'Az elállásról szóló teljes tájékoztatót és a nyilatkozatmintát itt találja:',
    docsTitle: 'Szerződéses dokumentumok',
    contact: 'Kérdése van? Írjon nekünk: {email}, vagy hívjon minket: {phone}.',
    footer: 'Svetlana Lampe — 3D-nyomtatott asztali lámpák',
  },
  uk: {
    subject: 'Замовлення {n} підтверджено — Svetlana Lampe',
    thanks: 'Дякуємо за замовлення!',
    intro: 'Ми отримали вашу оплату й цим підтверджуємо укладення договору купівлі-продажу. Будь ласка, збережіть цей лист — він містить дані замовлення та інформацію про право на відмову від договору.',
    order: 'Номер замовлення', orderDate: 'Дата замовлення', item: 'Товар', qty: 'Кількість', price: 'Ціна',
    subtotal: 'Проміжна сума', discount: 'Знижка', shipping: 'Доставка до пункту видачі', free: 'безкоштовно', total: 'Разом (з ПДВ)',
    payment: 'Оплата', paid: 'сплачено онлайн (GoPay)', pickup: 'Пункт видачі',
    delivery: 'Вашу лампу буде виготовлено на замовлення протягом 3–5 робочих днів. Після цього Packeta доставить її до обраного пункту видачі, зазвичай протягом 2–5 робочих днів, і повідомить вас, коли вона буде готова до отримання.',
    invoice: 'Рахунок-фактура', invoiceAttached: 'Рахунок-фактуру додано до цього листа у форматі PDF.', invoiceDownload: 'Завантажити рахунок-фактуру',
    seller: 'Продавець', companyId: 'Ідентифікаційний номер (IČO)', vatId: 'Номер платника ПДВ', country: 'Словаччина',
    withdrawalTitle: 'Інформація про право на відмову від договору',
    withdrawalIntro: 'Право на відмову від договору поширюється на всі наші лампи, зокрема й на лампи, створені в конфігураторі.',
    withdrawalFallback: 'Повну інформацію про відмову від договору та типову форму можна знайти тут:',
    docsTitle: 'Договірні документи',
    contact: 'Маєте запитання? Напишіть нам на {email} або зателефонуйте: {phone}.',
    footer: 'Svetlana Lampe — настільні лампи, надруковані на 3D-принтері',
  },
  en: {
    subject: 'Order {n} confirmed — Svetlana Lampe',
    thanks: 'Thank you for your order!',
    intro: 'We have received your payment and hereby confirm the conclusion of your contract of sale. Please keep this email — it contains your order details and information on your right of withdrawal.',
    order: 'Order number', orderDate: 'Order date', item: 'Item', qty: 'Qty', price: 'Price',
    subtotal: 'Subtotal', discount: 'Discount', shipping: 'Shipping to pickup point', free: 'free', total: 'Total (incl. VAT)',
    payment: 'Payment', paid: 'paid online (GoPay)', pickup: 'Pickup point',
    delivery: 'Your lamp will be made to order within 3–5 working days. Packeta will then deliver it to your chosen pickup point, usually within 2–5 working days, and notify you when it is ready for collection.',
    invoice: 'Invoice', invoiceAttached: 'Your invoice is attached to this email as a PDF.', invoiceDownload: 'Download invoice',
    seller: 'Seller', companyId: 'Company ID (IČO)', vatId: 'VAT ID', country: 'Slovakia',
    withdrawalTitle: 'Your right of withdrawal',
    withdrawalIntro: 'The right of withdrawal applies to all our lamps, including lamps designed in the configurator.',
    withdrawalFallback: 'The full withdrawal instructions and the model withdrawal form are available here:',
    docsTitle: 'Contract documents',
    contact: 'Questions? Email us at {email} or call {phone}.',
    footer: 'Svetlana Lampe — 3D printed table lamps',
  },
  es: {
    subject: 'Pedido {n} confirmado — Svetlana Lampe',
    thanks: '¡Gracias por su pedido!',
    intro: 'Hemos recibido su pago y por la presente confirmamos la celebración del contrato de compraventa. Le rogamos que conserve este correo electrónico: contiene los datos de su pedido y la información sobre su derecho de desistimiento.',
    order: 'Número de pedido', orderDate: 'Fecha del pedido', item: 'Producto', qty: 'Cantidad', price: 'Precio',
    subtotal: 'Subtotal', discount: 'Descuento', shipping: 'Envío al punto de recogida', free: 'gratis', total: 'Total (IVA incluido)',
    payment: 'Pago', paid: 'abonado en línea (GoPay)', pickup: 'Punto de recogida',
    delivery: 'Fabricaremos su lámpara por encargo en un plazo de 3 a 5 días hábiles. A continuación, Packeta la entregará en el punto de recogida elegido, normalmente en un plazo de 2 a 5 días hábiles, y le avisará cuando esté lista para su recogida.',
    invoice: 'Factura', invoiceAttached: 'La factura se adjunta a este correo en formato PDF.', invoiceDownload: 'Descargar factura',
    seller: 'Vendedor', companyId: 'N.º de identificación (IČO)', vatId: 'NIF-IVA', country: 'Eslovaquia',
    withdrawalTitle: 'Información sobre el derecho de desistimiento',
    withdrawalIntro: 'El derecho de desistimiento se aplica a todas nuestras lámparas, incluidas las diseñadas en el configurador.',
    withdrawalFallback: 'Encontrará la información completa sobre el desistimiento y el modelo de formulario aquí:',
    docsTitle: 'Documentos contractuales',
    contact: '¿Tiene alguna pregunta? Escríbanos a {email} o llámenos al {phone}.',
    footer: 'Svetlana Lampe — lámparas de mesa impresas en 3D',
  },
  fr: {
    subject: 'Commande {n} confirmée — Svetlana Lampe',
    thanks: 'Merci pour votre commande !',
    intro: 'Nous avons bien reçu votre paiement et vous confirmons par la présente la conclusion du contrat de vente. Veuillez conserver cet e-mail : il contient les détails de votre commande et les informations relatives à votre droit de rétractation.',
    order: 'Numéro de commande', orderDate: 'Date de commande', item: 'Article', qty: 'Quantité', price: 'Prix',
    subtotal: 'Sous-total', discount: 'Remise', shipping: 'Livraison en point relais', free: 'gratuite', total: 'Total (TVA incluse)',
    payment: 'Paiement', paid: 'réglé en ligne (GoPay)', pickup: 'Point relais',
    delivery: 'Votre lampe sera fabriquée sur commande sous 3 à 5 jours ouvrés. Packeta la livrera ensuite au point relais choisi, généralement sous 2 à 5 jours ouvrés, et vous préviendra dès qu’elle sera prête à être retirée.',
    invoice: 'Facture', invoiceAttached: 'La facture est jointe à cet e-mail au format PDF.', invoiceDownload: 'Télécharger la facture',
    seller: 'Vendeur', companyId: 'N° d’identification (IČO)', vatId: 'N° de TVA intracommunautaire', country: 'Slovaquie',
    withdrawalTitle: 'Information sur le droit de rétractation',
    withdrawalIntro: 'Le droit de rétractation s’applique à toutes nos lampes, y compris celles conçues dans le configurateur.',
    withdrawalFallback: 'Vous trouverez les informations complètes sur la rétractation et le formulaire type ici :',
    docsTitle: 'Documents contractuels',
    contact: 'Des questions ? Écrivez-nous à {email} ou appelez-nous au {phone}.',
    footer: 'Svetlana Lampe — lampes de table imprimées en 3D',
  },
  it: {
    subject: 'Ordine {n} confermato — Svetlana Lampe',
    thanks: 'Grazie per il Suo ordine!',
    intro: 'Abbiamo ricevuto il Suo pagamento e con la presente confermiamo la conclusione del contratto di vendita. La preghiamo di conservare questa e-mail: contiene i dettagli dell’ordine e le informazioni sul diritto di recesso.',
    order: 'Numero d’ordine', orderDate: 'Data dell’ordine', item: 'Prodotto', qty: 'Quantità', price: 'Prezzo',
    subtotal: 'Subtotale', discount: 'Sconto', shipping: 'Spedizione al punto di ritiro', free: 'gratuita', total: 'Totale (IVA inclusa)',
    payment: 'Pagamento', paid: 'effettuato online (GoPay)', pickup: 'Punto di ritiro',
    delivery: 'La Sua lampada sarà realizzata su ordinazione entro 3–5 giorni lavorativi. Packeta la consegnerà poi al punto di ritiro scelto, di norma entro 2–5 giorni lavorativi, e La avviserà quando sarà pronta per il ritiro.',
    invoice: 'Fattura', invoiceAttached: 'La fattura è allegata a questa e-mail in formato PDF.', invoiceDownload: 'Scarica la fattura',
    seller: 'Venditore', companyId: 'Numero identificativo (IČO)', vatId: 'Partita IVA', country: 'Slovacchia',
    withdrawalTitle: 'Informazioni sul diritto di recesso',
    withdrawalIntro: 'Il diritto di recesso si applica a tutte le nostre lampade, comprese quelle progettate nel configuratore.',
    withdrawalFallback: 'Le informazioni complete sul recesso e il modulo tipo sono disponibili qui:',
    docsTitle: 'Documenti contrattuali',
    contact: 'Domande? Ci scriva a {email} o ci chiami al numero {phone}.',
    footer: 'Svetlana Lampe — lampade da tavolo stampate in 3D',
  },
}

/** Unknown/missing locales fall back to English (the order may predate a locale). */
function emailLocale(locale: string): EmailLocale {
  return isEmailLocale(locale) ? locale : 'en'
}

// Order fields (item titles, configuration keys/values, pickup point, order
// number) originate from user/product input and are interpolated into HTML —
// escape them so they can't inject markup into the confirmation email.
function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function apiKey() {
  return process.env.BREVO_API_KEY!
}

function money(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100)
}

/** Public base URL for links in emails (no trailing slash). */
function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || TRADER.web).replace(/\/+$/, '')
}

// ── Server-side translations ────────────────────────────────────────────────
type ConfigTranslator = Parameters<typeof lampConfigLines>[1]

/**
 * next-intl translator for the `configurator` namespace, built straight from
 * messages/<locale>.json — needs no request context, so it works from the
 * payment webhook and the reconcile job. next-intl is ESM-only, so it is loaded
 * lazily: importing this module (e.g. from Jest) never touches it.
 */
export async function configuratorTranslator(locale: string): Promise<ConfigTranslator> {
  const l = isEmailLocale(locale) ? locale : 'sk'
  const [{ createTranslator }, messages] = await Promise.all([
    import('next-intl'),
    import(`../messages/${l}.json`).then(m => m.default),
  ])
  return createTranslator({ locale: l, messages, namespace: 'configurator' }) as unknown as ConfigTranslator
}

/** Localized "Label: Value" lines of a lamp configuration; [] for none. Never throws. */
export function configurationLines(configuration: unknown, t: ConfigTranslator | null): string[] {
  if (!configuration || typeof configuration !== 'object' || Array.isArray(configuration)) return []
  const cfg = configuration as Record<string, string>
  if (t) {
    try {
      return lampConfigLines(cfg, t).map(l => `${l.label}: ${l.value}`)
    } catch (err) {
      console.error('[email] configuration display failed:', err)
    }
  }
  // Translator unavailable — raw values are still better than nothing.
  return Object.entries(cfg).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`)
}

// ── Links to the legal pages ────────────────────────────────────────────────
/** Absolute, localized URL of a legal page, e.g. https://…/de/richtlinien/refund-policy. */
async function legalUrl(handle: LegalHandle, locale: EmailLocale): Promise<string> {
  const { getPathname } = await import('@/i18n/navigation')
  return `${baseUrl()}${getPathname({ href: { pathname: '/policies/[handle]', params: { handle } }, locale })}`
}

// ── Right of withdrawal (CRD Art. 6(1)(h), 8(7)) ────────────────────────────
// Owner decision: every lamp — configurator lamps included — carries the full
// 14-day right of withdrawal, so every confirmation embeds the withdrawal
// instructions and the model withdrawal form. withdrawalBlockHtml() is the ONE
// place that decides this block; change it here if that decision ever changes.
//
// The text is copied from the published refund policy
// (legal/<locale>/refund-policy.html): every <h2 id="withdrawal…"> section, in
// order. The email therefore always matches the policy page word for word.
const LEGAL_DIR = process.env.LEGAL_DIR ?? path.join(process.cwd(), 'legal')
const withdrawalCache = new Map<EmailLocale, string>()

function withdrawalSections(locale: EmailLocale): string | null {
  const cached = withdrawalCache.get(locale)
  if (cached) return cached
  let src: string
  try {
    src = fs.readFileSync(path.join(LEGAL_DIR, locale, 'refund-policy.html'), 'utf-8')
  } catch (err) {
    console.error(`[email] cannot read refund policy for ${locale}:`, err)
    return null
  }
  const sections = src
    .split(/(?=<h2[\s>])/)
    .filter(sec => /^<h2[^>]*\sid="withdrawal[^"]*"/.test(sec))
  if (!sections.length) {
    console.error(`[email] no withdrawal sections (<h2 id="withdrawal…">) in legal/${locale}/refund-policy.html`)
    return null
  }
  const html = sections
    .join('')
    .replace(/<hr\s*\/?>/g, '')
    // Demote headings one level so they sit under the email's own section title.
    .replace(/<h3([^>]*)>/g, '<h4 style="font-size: 13px; margin: 14px 0 4px;">')
    .replace(/<\/h3>/g, '</h4>')
    .replace(/<h2[^>]*>/g, '<h3 style="font-size: 14px; margin: 18px 0 6px;">')
    .replace(/<\/h2>/g, '</h3>')
    .replace(/<blockquote>/g, '<blockquote style="margin: 8px 0; padding: 4px 12px; border-left: 3px solid #E8734A; background: #faf7f5;">')
  withdrawalCache.set(locale, html)
  return html
}

async function withdrawalBlockHtml(locale: EmailLocale, tr: Strings): Promise<string> {
  const sections = withdrawalSections(locale)
  const body = sections
    // Internal links in the policy text must become absolute, localized URLs.
    ? await absolutizeInternalLinks(sections, locale)
    : `<p>${esc(tr.withdrawalFallback)} <a href="${esc(await legalUrl('refund-policy', locale))}">${esc(pageTitle('refund-policy', locale))}</a></p>`
  return `
          <h2 style="font-size: 18px; margin-top: 32px;">${esc(tr.withdrawalTitle)}</h2>
          <p><strong>${esc(tr.withdrawalIntro)}</strong></p>
          <div style="font-size: 13px; line-height: 1.6; color: #333;">${body}</div>`
}

async function absolutizeInternalLinks(html: string, locale: EmailLocale): Promise<string> {
  if (!/href="\/(?:policies|pages)\//.test(html)) return html
  const { localizeInternalHrefs } = await import('@/app/[locale]/policies/localize-html')
  return localizeInternalHrefs(html, locale).replace(/href="\//g, `href="${baseUrl()}/`)
}

// ── Email ───────────────────────────────────────────────────────────────────
export interface OrderEmailParams {
  to: string
  orderNumber: string
  items: Array<{
    title: string
    configuration: Record<string, string> | null
    quantity: number
    unitPrice: number
  }>
  /** Charged total in cents, after any discount */
  totalAmount: number
  currency: string
  packetaPointName: string
  locale: string
  invoiceUrl?: string
  invoicePdf?: { filename: string; content: Buffer }
  /** Optional extras — shown when given */
  orderDate?: Date | string
  discountCode?: string | null
  discountPercent?: number | null
}

/**
 * Order confirmation on a durable medium (CRD Art. 8(7)): order lines, totals,
 * delivery, seller identity, the full withdrawal instructions + model form and
 * links to the contract documents — localized for all 10 storefront locales.
 */
export async function sendOrderConfirmation(p: OrderEmailParams): Promise<void> {
  const locale = emailLocale(p.locale)
  const tr = i18n[locale]
  const currency = p.currency || 'EUR'
  const fmt = (cents: number) => esc(money(cents, currency, locale))

  let t: ConfigTranslator | null = null
  try {
    t = await configuratorTranslator(locale)
  } catch (err) {
    console.error('[email] configurator translations unavailable:', err)
  }

  const cell = 'padding: 8px 0; border-bottom: 1px solid #eee; vertical-align: top;'
  const itemsHtml = p.items
    .map(i => {
      const lines = configurationLines(i.configuration, t)
      const cfg = lines.length
        ? `<br><span style="color: #666; font-size: 12px;">${lines.map(esc).join('<br>')}</span>`
        : ''
      return `<tr>
              <td style="${cell}"><strong>${esc(i.title)}</strong>${cfg}</td>
              <td style="${cell} text-align: right; white-space: nowrap;">${esc(i.quantity)}</td>
              <td style="${cell} text-align: right; white-space: nowrap;">${fmt(i.unitPrice * i.quantity)}</td>
            </tr>`
    })
    .join('')

  // Line prices are pre-discount; the charged total is after it. Show the
  // difference so the lines add up to what was paid.
  const subtotal = p.items.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
  const discount = subtotal - p.totalAmount
  const sumRow = (label: string, value: string, bold = false) => `<tr>
              <td colspan="2" style="padding: 6px 0;${bold ? ' font-size: 16px; font-weight: bold;' : ''}">${label}</td>
              <td style="padding: 6px 0; text-align: right; white-space: nowrap;${bold ? ' font-size: 16px; font-weight: bold;' : ''}">${value}</td>
            </tr>`
  let discountLabel = esc(tr.discount)
  if (p.discountCode) discountLabel += ` ${esc(p.discountCode)}`
  if (p.discountPercent) {
    discountLabel += ` (−${esc(new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 2 }).format(p.discountPercent / 100))})`
  }
  const totalsHtml = [
    ...(discount > 0 ? [sumRow(esc(tr.subtotal), fmt(subtotal)), sumRow(discountLabel, `−${fmt(discount)}`)] : []),
    sumRow(esc(tr.shipping), esc(tr.free)),
    sumRow(esc(tr.total), fmt(p.totalAmount), true),
  ].join('')

  const orderDate = p.orderDate ? new Date(p.orderDate) : null
  const orderDateHtml = orderDate && !isNaN(orderDate.getTime())
    ? `<br>${esc(tr.orderDate)}: ${esc(new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'Europe/Bratislava' }).format(orderDate))}`
    : ''

  const invoiceParts = [
    p.invoicePdf ? esc(tr.invoiceAttached) : '',
    p.invoiceUrl ? `<a href="${esc(p.invoiceUrl)}">${esc(tr.invoiceDownload)}</a>` : '',
  ].filter(Boolean)
  const invoiceHtml = invoiceParts.length ? `<p>${esc(tr.invoice)}: ${invoiceParts.join(' ')}</p>` : ''

  const docs: LegalHandle[] = ['terms-of-service', 'refund-policy', 'privacy-policy']
  const docLinks = await Promise.all(docs.map(async h =>
    `<li><a href="${esc(await legalUrl(h, locale))}">${esc(pageTitle(h, locale))}</a></li>`))

  const contactHtml = esc(tr.contact)
    .replace('{email}', `<a href="mailto:${TRADER.email}">${TRADER.email}</a>`)
    .replace('{phone}', TRADER.phone)

  const htmlContent = `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 600px; margin: 0 auto; color: #222; font-size: 14px; line-height: 1.5;">
          <h1 style="color: #E8734A; font-size: 24px;">${esc(tr.thanks)}</h1>
          <p>${esc(tr.intro)}</p>
          <p>${esc(tr.order)}: <strong>${esc(p.orderNumber)}</strong>${orderDateHtml}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 16px 0;">
            <tr>
              <th style="text-align: left; padding: 6px 0; border-bottom: 2px solid #ddd;">${esc(tr.item)}</th>
              <th style="text-align: right; padding: 6px 0 6px 12px; border-bottom: 2px solid #ddd;">${esc(tr.qty)}</th>
              <th style="text-align: right; padding: 6px 0 6px 12px; border-bottom: 2px solid #ddd;">${esc(tr.price)}</th>
            </tr>
            ${itemsHtml}
            ${totalsHtml}
          </table>
          <p>${esc(tr.payment)}: ${esc(tr.paid)}</p>
          <p>${esc(tr.pickup)}: <strong>${esc(p.packetaPointName)}</strong><br>${esc(tr.delivery)}</p>
          ${invoiceHtml}
          <h2 style="font-size: 18px; margin-top: 32px;">${esc(tr.seller)}</h2>
          <p>
            <strong>${TRADER.name}</strong> (${TRADER.brand})<br>
            ${TRADER.street}, ${TRADER.city}, ${esc(tr.country)}<br>
            ${esc(tr.companyId)}: ${TRADER.ico} · ${esc(tr.vatId)}: ${TRADER.icDph}<br>
            <a href="mailto:${TRADER.email}">${TRADER.email}</a> · ${TRADER.phone}
          </p>
          ${await withdrawalBlockHtml(locale, tr)}
          <h2 style="font-size: 18px; margin-top: 32px;">${esc(tr.docsTitle)}</h2>
          <ul>${docLinks.join('')}</ul>
          <p>${contactHtml}</p>
          <hr style="border: none; border-top: 1px solid #ddd; margin-top: 32px;" />
          <p style="color: #999; font-size: 12px;">${esc(tr.footer)} · ${TRADER.name}</p>
        </div>
      `

  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey(),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: 'Svetlana Lampe', email: process.env.EMAIL_FROM! },
      to: [{ email: p.to }],
      replyTo: { email: TRADER.email, name: 'Svetlana Lampe' },
      subject: tr.subject.replace('{n}', p.orderNumber),
      ...(p.invoicePdf ? { attachment: [{ name: p.invoicePdf.filename, content: p.invoicePdf.content.toString('base64') }] } : {}),
      htmlContent,
    }),
  })

  if (!res.ok) {
    throw new Error(`Brevo send failed: ${res.status} ${await res.text()}`)
  }
}
