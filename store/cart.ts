import { useSyncExternalStore } from 'react'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Currency, PriceMap } from './currency'

export interface CartItem {
  id: string
  productId: string
  title: string
  configuration: Record<string, string>
  quantity: number
  /** EUR unit price in cents (canonical, kept for carts persisted before multi-currency) */
  unitPrice: number
  currency: string
  /** Per-currency unit prices (refreshed from the server on load — see repriceCart);
   *  a missing currency falls back to unitPrice (EUR) */
  prices?: PriceMap
  imageUrl?: string
  /** Base render for composite thumbnails (imageUrl holds the shade) */
  baseImageUrl?: string
  /** Server says the product is unknown or unpublished — the line can't be ordered */
  unavailable?: boolean
  /** Server says the configuration no longer matches the parts catalogue */
  invalidConfig?: boolean
}

export interface AppliedDiscount {
  code: string
  percent: number
}

/** Server view of one cart line (POST /api/cart/price, index-aligned).
 *  `undefined` fields mean the server did not report them (older API). */
export interface LineRefresh {
  prices: PriceMap | null
  title?: string | null
  valid?: boolean
}

interface CartState {
  items: CartItem[]
  drawerOpen: boolean
  discount: AppliedDiscount | null
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clear: () => void
  setDiscount: (d: AppliedDiscount | null) => void
  /** Replace line prices with fresh server prices, keyed by cart line id */
  applyPrices: (prices: Map<string, PriceMap | null>) => void
  /** Apply the server's prices, titles and validity to the lines, keyed by line id */
  refreshLines: (updates: Map<string, LineRefresh>) => void
  /** Flag every line of the given products (order endpoint rejected them) */
  flagProducts: (productIds: string[], flag: 'unavailable' | 'invalidConfig') => void
  /** Sum of item prices in the given currency (EUR fallback per item), before discount */
  subtotal: (currency?: Currency) => number
  /** Subtotal minus discount */
  total: (currency?: Currency) => number
  /** True if every item has a manual price in the given currency */
  pricedIn: (currency: Currency) => boolean
  openDrawer: () => void
  closeDrawer: () => void
}

function unitPriceIn(item: CartItem, currency?: Currency): number {
  if (currency && typeof item.prices?.[currency] === 'number') return item.prices[currency]!
  return item.unitPrice
}

/** A line the customer must remove before checking out. */
export function isBlockedLine(item: CartItem): boolean {
  return Boolean(item.unavailable || item.invalidConfig)
}

// Hydration can fail (corrupt localStorage JSON) — zustand then never reports
// hasHydrated(), so track that outcome too or the cart skeleton would stay forever.
let hydrationFailed = false
const hydrationFailedListeners = new Set<() => void>()

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      discount: null,
      addItem: (item) => {
        const id = `${item.productId}-${JSON.stringify(item.configuration)}`
        set(s => {
          const existing = s.items.find(i => i.id === id)
          if (existing) {
            return {
              items: s.items.map(i => i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i),
              drawerOpen: true,
            }
          }
          return { items: [...s.items, { ...item, id }], drawerOpen: true }
        })
      },
      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) { get().removeItem(id); return }
        set(s => ({ items: s.items.map(i => i.id === id ? { ...i, quantity } : i) }))
      },
      clear: () => set({ items: [], discount: null }),
      setDiscount: (discount) => set({ discount }),
      applyPrices: (prices) => set(s => ({
        items: s.items.map(i => {
          const p = prices.get(i.id)
          return p && typeof p.EUR === 'number' ? { ...i, prices: p, unitPrice: p.EUR } : i
        }),
      })),
      refreshLines: (updates) => set(s => ({
        items: s.items.map(i => {
          const u = updates.get(i.id)
          if (!u) return i
          const next: CartItem = { ...i }
          if (u.prices && typeof u.prices.EUR === 'number') {
            next.prices = u.prices
            next.unitPrice = u.prices.EUR
          }
          if (typeof u.title === 'string' && u.title) next.title = u.title
          // Only an API that reports titles can say a product is gone; a null
          // price from the older API (prices only) leaves the line untouched.
          if (u.title !== undefined) next.unavailable = u.title === null || u.prices === null
          if (u.valid !== undefined) next.invalidConfig = !u.valid
          return next
        }),
      })),
      flagProducts: (productIds, flag) => set(s => ({
        items: s.items.map(i => productIds.includes(i.productId) ? { ...i, [flag]: true } : i),
      })),
      subtotal: (currency) => get().items.reduce((sum, i) => sum + unitPriceIn(i, currency) * i.quantity, 0),
      total: (currency) => {
        const sub = get().subtotal(currency)
        const d = get().discount
        return d ? sub - Math.round(sub * d.percent / 100) : sub
      },
      pricedIn: (currency) => currency === 'EUR'
        || get().items.every(i => typeof i.prices?.[currency] === 'number'),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: 'svetlana-cart',
      skipHydration: true,
      partialize: (s) => ({ items: s.items, discount: s.discount }),
      onRehydrateStorage: () => (_state, error) => {
        if (!error) return
        hydrationFailed = true
        hydrationFailedListeners.forEach(cb => cb())
      },
    }
  )
)

// zustand only attaches the persist API when storage is usable — it is missing
// on the server and in browsers that block localStorage.
const persistApi = () => useCart.persist as typeof useCart.persist | undefined

function subscribeHydration(cb: () => void): () => void {
  const unsubscribe = persistApi()?.onFinishHydration(cb)
  hydrationFailedListeners.add(cb)
  return () => { unsubscribe?.(); hydrationFailedListeners.delete(cb) }
}

/** True once the persisted cart has been restored (CartHydration rehydrates it
 *  after mount — the store uses skipHydration). Always false during SSR and the
 *  hydration render, so cart UIs render a skeleton there instead of flashing
 *  the empty state. Without storage there is nothing to restore → true. */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    subscribeHydration,
    () => hydrationFailed || (persistApi()?.hasHydrated() ?? true),
    () => false,
  )
}

/** Locale of the current page (the root layout sets <html lang>). */
function documentLocale(): string | undefined {
  return typeof document !== 'undefined' ? document.documentElement.lang || undefined : undefined
}

/** Re-price the cart from the server (current admin prices + exchange rates).
 *  Carts persist in the browser with the prices captured at add-to-cart time, so
 *  this runs on load and whenever checkout reports a price change. The server
 *  also returns the line titles in `locale` and flags lines whose product is
 *  gone or whose configuration is no longer valid. Lines are matched by id, so
 *  edits made while the request is in flight are safe.
 *  Resolves false if the cart is empty or the request failed. */
export async function repriceCart(locale: string | undefined = documentLocale()): Promise<boolean> {
  const items = useCart.getState().items
  if (items.length === 0) return false
  try {
    const res = await fetch('/api/cart/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: items.map(i => ({ productId: i.productId, configuration: i.configuration })),
        ...(locale ? { locale } : {}),
      }),
    })
    if (!res.ok) return false
    const { prices, titles, valid } = await res.json() as {
      prices?: Array<PriceMap | null>
      titles?: Array<string | null>
      valid?: boolean[]
    }
    if (!Array.isArray(prices)) return false
    useCart.getState().refreshLines(new Map(items.map((item, idx) => [item.id, {
      prices: prices[idx] ?? null,
      title: Array.isArray(titles) ? titles[idx] ?? null : undefined,
      valid: Array.isArray(valid) ? valid[idx] !== false : undefined,
    }])))
    return true
  } catch {
    return false
  }
}
