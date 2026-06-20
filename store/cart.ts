import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  productId: string
  title: string
  configuration: Record<string, string>
  quantity: number
  unitPrice: number
  currency: string
  imageUrl?: string
}

interface CartState {
  items: CartItem[]
  drawerOpen: boolean
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clear: () => void
  total: () => number
  openDrawer: () => void
  closeDrawer: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
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
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),
    }),
    {
      name: 'svetlana-cart',
      skipHydration: true,
      partialize: (s) => ({ items: s.items }),
    }
  )
)
