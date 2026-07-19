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
  /** Manual per-currency unit prices; missing currency falls back to unitPrice (EUR) */
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
