// Passthrough root layout — the [locale] layout provides <html lang> and <body>.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
