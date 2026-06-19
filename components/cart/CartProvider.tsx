'use client'
// Zustand + persist requires client boundary. This wrapper ensures the store
// hydrates before any child renders cart state.
import { useEffect, useState } from 'react'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  if (!hydrated) return null
  return <>{children}</>
}
