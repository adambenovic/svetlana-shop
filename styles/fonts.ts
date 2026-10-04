import { DM_Sans, Space_Grotesk } from 'next/font/google'

// Self-hosted web fonts. next/font downloads the files at build time and serves
// them from our own origin, so the browser never contacts Google (no render-
// blocking third-party CSS, no visitor IP sent to Google). Both are variable
// fonts: every weight the CSS uses (300–700) comes from one file per subset.
// The CSS variables feed --font-heading / --font-body in variables.css.

export const fontHeading = Space_Grotesk({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

export const fontBody = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-dm-sans',
})

/** Class names that declare both font variables — put them on <html>. */
export const fontVariables = `${fontHeading.variable} ${fontBody.variable}`
