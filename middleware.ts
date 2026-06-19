import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['sk', 'en', 'cs', 'de', 'es', 'fr', 'hu', 'it', 'pl', 'uk'],
  defaultLocale: 'sk',
  localePrefix: 'as-needed',
  localeDetection: false,
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)'],
}
