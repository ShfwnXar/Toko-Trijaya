"use client"

import { useState, useCallback } from "react"
import { BarcodeScanner } from "./barcode-scanner"
import { ProductSearch } from "./product-search"
import { PopularProductsGrid } from "./popular-products-grid"
import { AllProductsGrid } from "./all-products-grid"
import { UsbScannerListener } from "./usb-scanner-listener"
import { useCartStore, ProductSummary } from "@/stores/cart-store"

interface Notification {
  id: number
  message: string
  type: "success" | "error" | "warning"
}

/**
 * Cart Manager — the "glue" component that connects barcode scanner,
 * product search, and popular products grid to the cart store.
 *
 * Handles:
 * - Barcode detected (camera or USB): lookup product via API, add to cart
 * - Product selected (search or grid): add to cart
 * - Zero-stock prevention with "Stok habis" warning
 * - Duplicate products handled by cart store (qty increment)
 */
export function CartManager() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const addItem = useCartStore((state) => state.addItem)

  const showNotification = useCallback(
    (message: string, type: "success" | "error" | "warning") => {
      const id = Date.now()
      setNotifications((prev) => [...prev, { id, message, type }])
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }, 3000)
    },
    []
  )

  const addProductToCart = useCallback(
    (product: ProductSummary) => {
      if (product.stock <= 0) {
        showNotification("Stok habis", "warning")
        return
      }
      addItem(product)
    },
    [addItem, showNotification]
  )

  /**
   * Handle barcode detected from camera or USB scanner.
   * Looks up product via /api/products/barcode/{barcode}.
   * If found: add to cart. If not: show "Produk tidak ditemukan" toast.
   */
  const handleBarcodeDetected = useCallback(
    async (barcode: string) => {
      try {
        const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcode)}`)
        if (res.ok) {
          const product = await res.json()
          const productSummary: ProductSummary = {
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            retailPrice: Number(product.retailPrice),
            wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
            wholesaleMinQty: product.wholesaleMinQty,
            purchasePrice: Number(product.purchasePrice),
            stock: product.stock,
            unit: product.unit,
          }
          addProductToCart(productSummary)
        } else {
          showNotification(`Produk tidak ditemukan: ${barcode}`, "error")
        }
      } catch {
        showNotification("Gagal mencari produk. Periksa koneksi.", "error")
      }
    },
    [addProductToCart, showNotification]
  )

  /**
   * Handle product selected from search autocomplete or popular grid.
   * Product data is already available — just add to cart.
   */
  const handleProductSelected = useCallback(
    (product: {
      id: string
      barcode: string
      name: string
      retailPrice: number | string
      wholesalePrice: number | string | null
      wholesaleMinQty: number
      purchasePrice: number | string
      stock: number
      unit: string
    }) => {
      const productSummary: ProductSummary = {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        retailPrice: Number(product.retailPrice),
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
        wholesaleMinQty: product.wholesaleMinQty,
        purchasePrice: Number(product.purchasePrice),
        stock: product.stock,
        unit: product.unit,
      }
      addProductToCart(productSummary)
    },
    [addProductToCart]
  )

  return (
    <div className="w-full space-y-4">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-right fade-in duration-200 ${
                n.type === "success"
                  ? "bg-green-600 text-white"
                  : n.type === "warning"
                  ? "bg-amber-500 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {n.message}
            </div>
          ))}
        </div>
      )}

      {/* USB Scanner Listener (invisible, always active) */}
      <UsbScannerListener onBarcodeDetected={handleBarcodeDetected} />

      {/* Camera Barcode Scanner */}
      <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} />

      {/* Product Search */}
      <ProductSearch onProductSelected={handleProductSelected} />

      {/* Popular Products Grid */}
      <PopularProductsGrid onProductSelected={handleProductSelected} />

      {/* All Products Grid */}
      <AllProductsGrid onProductSelected={handleProductSelected} />
    </div>
  )
}
