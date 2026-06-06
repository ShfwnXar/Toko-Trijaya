"use client"

import { useEffect, useState } from "react"

interface PopularProduct {
  id: string
  barcode: string
  name: string
  retailPrice: number | string
  wholesalePrice: number | string | null
  wholesaleMinQty: number
  purchasePrice: number | string
  stock: number
  unit: string
}

interface PopularProductsGridProps {
  onProductSelected: (product: PopularProduct) => void
}

export function PopularProductsGrid({ onProductSelected }: PopularProductsGridProps) {
  const [products, setProducts] = useState<PopularProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPopularProducts = async () => {
      setLoading(true)
      try {
        const res = await fetch("/api/products/popular")
        if (res.ok) {
          const data = await res.json()
          setProducts(data)
        }
      } catch (error) {
        console.error("Failed to fetch popular products:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPopularProducts()
  }, [])

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(price))
  }

  if (loading) {
    return (
      <div className="w-full">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Produk Populer
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="h-[80px] rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Produk Populer
        </h3>
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada data produk populer
        </p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        Produk Populer
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {products.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => onProductSelected(product)}
            disabled={product.stock <= 0}
            className="relative flex flex-col items-start justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/50 transition-colors min-h-[80px] text-left disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 touch-manipulation"
          >
            <span className="text-sm font-medium line-clamp-2 leading-tight">
              {product.name}
            </span>
            <div className="w-full mt-1">
              <span className="text-sm font-semibold text-primary">
                {formatPrice(product.retailPrice)}
              </span>
              {product.wholesalePrice && Number(product.wholesalePrice) > 0 && (
                <span className="block text-xs text-muted-foreground">
                  Grosir: {formatPrice(product.wholesalePrice)}
                </span>
              )}
            </div>
            {product.stock <= 0 && (
              <span className="absolute top-1 right-1 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">
                Habis
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
