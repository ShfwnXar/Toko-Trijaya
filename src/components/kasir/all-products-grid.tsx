"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"

interface Product {
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

interface AllProductsGridProps {
  onProductSelected: (product: Product) => void
}

export function AllProductsGrid({ onProductSelected }: AllProductsGridProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/products?page=${page}&pageSize=20`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data.data)
        setTotalPages(data.pagination.totalPages)
      }
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(price))
  }

  if (loading && products.length === 0) {
    return (
      <div className="w-full">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
          Semua Produk
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[80px] rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">
        Semua Produk
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
            <span className="absolute bottom-1 right-2 text-[10px] text-muted-foreground">
              Stok: {product.stock}
            </span>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground">
            Hal {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Selanjutnya →
          </Button>
        </div>
      )}
    </div>
  )
}
