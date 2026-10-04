import { act, renderHook } from '@testing-library/react'
import { useCart, repriceCart, isBlockedLine } from './cart'

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

test('refreshLines updates titles and flags unavailable / invalid lines', () => {
  const { result } = renderHook(() => useCart())
  act(() => {
    result.current.addItem({ productId: '1', title: 'Old title', configuration: { base: 'b1' }, quantity: 1, unitPrice: 5399, currency: 'EUR' })
    result.current.addItem({ productId: '2', title: 'Gone', configuration: { base: 'b2' }, quantity: 1, unitPrice: 1000, currency: 'EUR' })
    result.current.addItem({ productId: '1', title: 'Bad cfg', configuration: { base: 'nope' }, quantity: 1, unitPrice: 5399, currency: 'EUR' })
  })
  const [a, b, c] = result.current.items
  act(() => result.current.refreshLines(new Map([
    [a.id, { prices: { EUR: 5899, CZK: 144900 }, title: 'Lampa', valid: true }],
    [b.id, { prices: null, title: null, valid: true }],
    [c.id, { prices: { EUR: 5399 }, title: 'Lampa', valid: false }],
  ])))
  const [na, nb, nc] = result.current.items
  expect(na).toMatchObject({ title: 'Lampa', unitPrice: 5899, unavailable: false, invalidConfig: false })
  expect(na.prices?.CZK).toBe(144900)
  expect(nb).toMatchObject({ title: 'Gone', unitPrice: 1000, unavailable: true })
  expect(nc).toMatchObject({ invalidConfig: true, unavailable: false })
  expect(isBlockedLine(na)).toBe(false)
  expect(isBlockedLine(nb)).toBe(true)
  expect(isBlockedLine(nc)).toBe(true)

  // A later refresh that finds the line valid again clears the flag
  act(() => result.current.refreshLines(new Map([[c.id, { prices: { EUR: 5399 }, title: 'Lampa', valid: true }]])))
  expect(isBlockedLine(result.current.items[2])).toBe(false)
})

test('refreshLines from the older prices-only API never flags a line', () => {
  const { result } = renderHook(() => useCart())
  act(() => result.current.addItem({ productId: '9', title: 'X', configuration: {}, quantity: 1, unitPrice: 1000, currency: 'EUR' }))
  const id = result.current.items[0].id
  act(() => result.current.refreshLines(new Map([[id, { prices: null }]])))
  expect(isBlockedLine(result.current.items[0])).toBe(false)
  expect(result.current.items[0].title).toBe('X')
})

test('flagProducts marks every line of the given products', () => {
  const { result } = renderHook(() => useCart())
  act(() => {
    result.current.addItem({ productId: '1', title: 'A', configuration: { base: 'b1' }, quantity: 1, unitPrice: 1000, currency: 'EUR' })
    result.current.addItem({ productId: '2', title: 'B', configuration: { base: 'b2' }, quantity: 1, unitPrice: 1000, currency: 'EUR' })
  })
  act(() => result.current.flagProducts(['2'], 'unavailable'))
  expect(result.current.items.map(isBlockedLine)).toEqual([false, true])
})

test('repriceCart sends the locale and applies prices, titles and validity', async () => {
  const { result } = renderHook(() => useCart())
  act(() => result.current.addItem({ productId: '1', title: 'Old', configuration: { base: 'b1' }, quantity: 1, unitPrice: 5399, currency: 'EUR' }))
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ prices: [{ EUR: 5899 }], titles: ['Nová lampa'], valid: [false] }),
  })
  global.fetch = fetchMock as unknown as typeof fetch
  await act(async () => { expect(await repriceCart('sk')).toBe(true) })
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ locale: 'sk', items: [{ productId: '1' }] })
  expect(result.current.items[0]).toMatchObject({ title: 'Nová lampa', unitPrice: 5899, invalidConfig: true })
})

test('repriceCart resolves false when the request fails', async () => {
  const { result } = renderHook(() => useCart())
  act(() => result.current.addItem({ productId: '1', title: 'A', configuration: {}, quantity: 1, unitPrice: 1000, currency: 'EUR' }))
  global.fetch = jest.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch
  await act(async () => { expect(await repriceCart('en')).toBe(false) })
  expect(result.current.items[0].unitPrice).toBe(1000)
})
