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
}

export interface AppliedDiscount {
  code: string
  percent: number
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
    }
  )
)

/** Re-price the cart from the server (current admin prices + exchange rates).
 *  Carts persist in the browser with the prices captured at add-to-cart time, so
 *  this runs on load and whenever checkout reports a price change. Lines are
 *  matched by id, so edits made while the request is in flight are safe.
 *  Resolves false if the cart is empty or the request failed. */
export async function repriceCart(): Promise<boolean> {
  const items = useCart.getState().items
  if (items.length === 0) return false
  try {
    const res = await fetch('/api/cart/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(i => ({ productId: i.productId, configuration: i.configuration })) }),
    })
    if (!res.ok) return false
    const { prices } = await res.json() as { prices: Array<PriceMap | null> }
    useCart.getState().applyPrices(new Map(items.map((item, idx) => [item.id, prices[idx] ?? null])))
    return true
  } catch {
    return false
  }
}
