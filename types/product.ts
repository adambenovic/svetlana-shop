export interface ProductImage {
  url: string
  alt: string
}

export interface Product {
  id: string | number
  slug: string
  title: string
  basePrice: number
  currency: string
  images: ProductImage[]
  hasBg: boolean
  partsKey?: string
}
