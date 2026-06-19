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
