import Link from 'next/link'
import '@/styles/globals.css'

// Root-level 404: rendered outside the [locale] segment (and therefore outside
// NextIntlClientProvider), so copy is in English and links to the site root.
// It must supply its own <html>/<body> because the root layout is a passthrough.
export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 16,
            padding: '48px 24px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 64,
              fontWeight: 700,
              color: 'var(--color-accent)',
              lineHeight: 1,
            }}
          >
            404
          </p>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Page not found</h1>
          <p style={{ color: 'var(--color-text-muted)', maxWidth: 420 }}>
            The page you are looking for doesn&apos;t exist or has moved. Let&apos;s get you back to
            designing your lamp.
          </p>
          <Link
            href="/"
            style={{
              marginTop: 8,
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontWeight: 600,
            }}
          >
            Back to Svetlana Lampe
          </Link>
        </main>
      </body>
    </html>
  )
}
