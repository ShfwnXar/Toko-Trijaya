"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface ProductResult {
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

interface ProductSearchProps {
  onProductSelected: (product: ProductResult) => void
}

export function ProductSearch({ onProductSelected }: ProductSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProductResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const searchProducts = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      setIsOpen(false)
      setNoResults(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        search: searchQuery,
        pageSize: "10",
      })
      const res = await fetch(`/api/products?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        const products: ProductResult[] = data.data || []
        setResults(products)
        setNoResults(products.length === 0)
        setIsOpen(true)
      }
    } catch (error) {
      console.error("Search error:", error)
      setResults([])
      setNoResults(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = (value: string) => {
    setQuery(value)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value.length < 2) {
      setResults([])
      setIsOpen(false)
      setNoResults(false)
      return
    }

    // Debounce 300ms
    debounceRef.current = setTimeout(() => {
      searchProducts(value)
    }, 300)
  }

  const handleSelectProduct = (product: ProductResult) => {
    onProductSelected(product)
    setQuery("")
    setResults([])
    setIsOpen(false)
    setNoResults(false)
    inputRef.current?.focus()
  }

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(price))
  }

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  return (
    <div className="w-full relative">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="w-full">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Cari produk (nama atau barcode)..."
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (results.length > 0 || noResults) setIsOpen(true)
              }}
              className="w-full min-h-[44px]"
              autoComplete="off"
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {loading && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Mencari...
            </div>
          )}

          {!loading && noResults && (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Produk tidak ditemukan
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-accent focus:bg-accent outline-none border-b border-border last:border-b-0 min-h-[44px] flex flex-col gap-0.5"
                  onClick={() => handleSelectProduct(product)}
                >
                  <span className="font-medium text-sm truncate">
                    {product.name}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="font-mono">{product.barcode}</span>
                    <span>•</span>
                    <span className="text-primary font-medium">
                      {formatPrice(product.retailPrice)}
                    </span>
                    {product.stock <= 0 && (
                      <>
                        <span>•</span>
                        <span className="text-red-600">Stok habis</span>
                      </>
                    )}
                  </span>
                </button>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
