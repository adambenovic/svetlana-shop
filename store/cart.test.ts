import { act, renderHook } from '@testing-library/react'
import { useCart } from './cart'

beforeEach(() => { useCart.getState().clear() })

test('addItem adds item to cart', () => {
  const { result } = renderHook(() => useCart())
  act(() => result.current.addItem({
    productId: 'p1', title: 'LEAH 001',
    configuration: { base: 'coral', shade: 'white' },
    quantity: 1, unitPrice: 8900, currency: 'EUR',
  }))
  expect(result.current.items).toHaveLength(1)
  expect(result.current.total()).toBe(8900)
})

test('addItem merges identical configurations', () => {
  const { result } = renderHook(() => useCart())
  const item = { productId: 'p1', title: 'LEAH', configuration: { base: 'coral' }, quantity: 1, unitPrice: 5000, currency: 'EUR' }
  act(() => { result.current.addItem(item); result.current.addItem(item) })
  expect(result.current.items).toHaveLength(1)
  expect(result.current.items[0].quantity).toBe(2)
})

test('removeItem removes by id', () => {
  const { result } = renderHook(() => useCart())
  act(() => result.current.addItem({ productId: 'p1', title: 'X', configuration: {}, quantity: 1, unitPrice: 1000, currency: 'EUR' }))
  const id = result.current.items[0].id
  act(() => result.current.removeItem(id))
  expect(result.current.items).toHaveLength(0)
})

test('updateQuantity to 0 removes item', () => {
  const { result } = renderHook(() => useCart())
  act(() => result.current.addItem({ productId: 'p1', title: 'X', configuration: {}, quantity: 2, unitPrice: 1000, currency: 'EUR' }))
  const id = result.current.items[0].id
  act(() => result.current.updateQuantity(id, 0))
  expect(result.current.items).toHaveLength(0)
})

test('applyPrices replaces stale line prices by line id and leaves others alone', () => {
  const { result } = renderHook(() => useCart())
  act(() => {
    // A line priced before a price change (stale ~1.7× CZK) and one unknown line
    result.current.addItem({ productId: '1', title: 'A', configuration: { base: 'b1' }, quantity: 2, unitPrice: 5399, currency: 'EUR', prices: { EUR: 5399, CZK: 229000 } })
    result.current.addItem({ productId: '2', title: 'B', configuration: { base: 'b2' }, quantity: 1, unitPrice: 1000, currency: 'EUR', prices: { EUR: 1000 } })
  })
  const [a, b] = result.current.items
  act(() => result.current.applyPrices(new Map([
    [a.id, { EUR: 5399, CZK: 131900, PLN: 23599, HUF: 1979000 }],
    [b.id, null], // unknown product → untouched
  ])))
  expect(result.current.items[0].prices?.CZK).toBe(131900)
  expect(result.current.items[0].unitPrice).toBe(5399)
  expect(result.current.items[0].quantity).toBe(2)
  expect(result.current.items[1].prices).toEqual({ EUR: 1000 })
  // The unpriced line keeps the cart from charging in CZK until it gets a price
  expect(result.current.pricedIn('CZK')).toBe(false)
  expect(result.current.pricedIn('EUR')).toBe(true)
})
