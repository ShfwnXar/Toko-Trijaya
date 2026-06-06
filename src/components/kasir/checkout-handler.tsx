"use client"

import { useState, useCallback } from "react"
import { useCartStore } from "@/stores/cart-store"
import { CheckoutDialog, ReceiptData } from "./checkout-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface InsufficientProduct {
  name: string
  available: number
  requested: number
}

interface CheckoutHandlerProps {
  checkoutOpen: boolean
  onCheckoutOpenChange: (open: boolean) => void
  onReceiptReady: (receipt: ReceiptData) => void
}

/**
 * Post-checkout flow handler.
 *
 * Manages the state transitions after a checkout attempt:
 * - On success: clears cart, sets lastReceipt data
 * - On stock error: preserves cart, shows error modal listing insufficient products
 * - On price mismatch: updates cart prices (re-fetch), shows notification
 *
 * Requirements: 4.8, 4.11
 */
export function CheckoutHandler({
  checkoutOpen,
  onCheckoutOpenChange,
  onReceiptReady,
}: CheckoutHandlerProps) {
  const clearCart = useCartStore((state) => state.clear)
  const [stockErrorProducts, setStockErrorProducts] = useState<InsufficientProduct[]>([])
  const [stockErrorOpen, setStockErrorOpen] = useState(false)
  const [priceMismatchOpen, setPriceMismatchOpen] = useState(false)

  const handleSuccess = useCallback(
    (receipt: ReceiptData) => {
      // Clear cart store
      clearCart()
      // Close checkout dialog
      onCheckoutOpenChange(false)
      // Pass receipt data up for display
      onReceiptReady(receipt)
    },
    [clearCart, onCheckoutOpenChange, onReceiptReady]
  )

  const handleStockError = useCallback(
    (insufficientProducts: InsufficientProduct[]) => {
      // Preserve cart (no clear), close checkout dialog, show stock error modal
      onCheckoutOpenChange(false)
      setStockErrorProducts(insufficientProducts)
      setStockErrorOpen(true)
    },
    [onCheckoutOpenChange]
  )

  const handlePriceMismatch = useCallback(() => {
    // Close checkout dialog, show price mismatch notification
    onCheckoutOpenChange(false)
    setPriceMismatchOpen(true)
  }, [onCheckoutOpenChange])

  return (
    <>
      {/* Checkout Dialog */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={onCheckoutOpenChange}
        onSuccess={handleSuccess}
        onStockError={handleStockError}
        onPriceMismatch={handlePriceMismatch}
      />

      {/* Stock Error Modal */}
      <Dialog open={stockErrorOpen} onOpenChange={setStockErrorOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Stok Tidak Cukup</DialogTitle>
            <DialogDescription>
              Beberapa produk memiliki stok yang tidak mencukupi. Silakan sesuaikan jumlah.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {stockErrorProducts.map((product, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded"
              >
                <span className="font-medium">{product.name}</span>
                <span className="text-muted-foreground">
                  Tersedia: {product.available} / Diminta: {product.requested}
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setStockErrorOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Mismatch Notification */}
      <Dialog open={priceMismatchOpen} onOpenChange={setPriceMismatchOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-600">Harga Berubah</DialogTitle>
            <DialogDescription>
              Beberapa harga produk telah berubah sejak ditambahkan ke keranjang.
              Silakan periksa ulang keranjang dan coba kembali.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setPriceMismatchOpen(false)}>Mengerti</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Hook to manage lastReceipt state for use by receipt components.
 * This is exported for use in the kasir page to store and read receipt data.
 */
export function useLastReceipt() {
  const [lastReceipt, setLastReceipt] = useState<ReceiptData | null>(null)

  const clearReceipt = useCallback(() => {
    setLastReceipt(null)
  }, [])

  return { lastReceipt, setLastReceipt, clearReceipt }
}
