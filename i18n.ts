import { getRequestConfig } from 'next-intl/server'

const SUPPORTED_LOCALES = ['sk', 'cs', 'de', 'pl', 'hu', 'uk', 'en', 'es', 'fr', 'it'] as const
type SupportedLocale = typeof SUPPORTED_LOCALES[number]

function validateLocale(l: string | undefined): SupportedLocale {
  if (l && (SUPPORTED_LOCALES as readonly string[]).includes(l)) return l as SupportedLocale
  return 'sk'
}

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = validateLocale(await requestLocale)
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
