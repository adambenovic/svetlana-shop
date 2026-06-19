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
  addItem: (item: Omit<CartItem, 'id'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, quantity: number) => void
  clear: () => void
  total: () => number
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const id = `${item.productId}-${JSON.stringify(item.configuration)}`
        set(s => {
          const existing = s.items.find(i => i.id === id)
          if (existing) {
            return { items: s.items.map(i => i.id === id ? { ...i, quantity: i.quantity + item.quantity } : i) }
          }
          return { items: [...s.items, { ...item, id }] }
        })
      },
      removeItem: (id) => set(s => ({ items: s.items.filter(i => i.id !== id) })),
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) { get().removeItem(id); return }
        set(s => ({ items: s.items.map(i => i.id === id ? { ...i, quantity } : i) }))
      },
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
    }),
    { name: 'svetlana-cart' }
  )
)
