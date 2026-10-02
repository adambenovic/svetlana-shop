'use client'
import { useEffect } from 'react'
import { useCart, repriceCart } from '@/store/cart'

export function CartHydration() {
  useEffect(() => {
    // Restore the persisted cart, then refresh its prices from the server so
    // admin price / exchange-rate changes reach carts saved earlier.
    void Promise.resolve(useCart.persist.rehydrate()).then(() => repriceCart())
  }, [])
  return null
}
