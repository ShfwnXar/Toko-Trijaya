"use client"

import { useState, useMemo } from "react"
import { useCartStore } from "@/stores/cart-store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

type PaymentMethod = "CASH" | "QRIS" | "TRANSFER"

export interface ReceiptData {
  invoiceNumber: string
  date: string
  cashier: string
  items: {
    name: string
    barcode: string
    unit: string
    quantity: number
    unitPrice: number
    retailPrice: number
    totalPrice: number
    priceTier: string
  }[]
  totalAmount: number
  totalItems: number
  paymentMethod: string
  amountPaid: number
  changeAmount: number
  customerName: string | null
  customerPhone: string | null
}

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (receipt: ReceiptData) => void
  onStockError: (insufficientProducts: { name: string; available: number; requested: number }[]) => void
  onPriceMismatch: () => void
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(amount)

export function CheckoutDialog({
  open,
  onOpenChange,
  onSuccess,
  onStockError,
  onPriceMismatch,
}: CheckoutDialogProps) {
  const { items, grandTotal } = useCartStore()
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH")
  const [amountPaid, setAmountPaid] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const amountPaidNum = useMemo(() => {
    if (paymentMethod !== "CASH") return grandTotal
    const parsed = parseInt(amountPaid, 10)
    return isNaN(parsed) ? 0 : parsed
  }, [amountPaid, paymentMethod, grandTotal])

  const changeAmount = useMemo(() => {
    if (paymentMethod !== "CASH") return 0
    return Math.max(0, amountPaidNum - grandTotal)
  }, [amountPaidNum, grandTotal, paymentMethod])

  const isInsufficient = paymentMethod === "CASH" && amountPaidNum < grandTotal
  const difference = grandTotal - amountPaidNum

  const canConfirm = items.length > 0 && !isInsufficient && !isLoading

  const handleQuickAmount = (amount: number) => {
    setAmountPaid(amount.toString())
  }

  const handleUangPas = () => {
    setAmountPaid(grandTotal.toString())
  }

  const handleConfirm = async () => {
    if (!canConfirm) return

    setIsLoading(true)
    setErrorMessage(null)

    try {
      const requestBody = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod,
        amountPaid: amountPaidNum,
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (res.ok) {
        const data = await res.json()
        onSuccess(data.receipt as ReceiptData)
        // Reset state
        setPaymentMethod("CASH")
        setAmountPaid("")
        setErrorMessage(null)
      } else {
        const errorData = await res.json()

        if (res.status === 422 && errorData.details?.insufficientStock) {
          onStockError(errorData.details.insufficientStock)
        } else if (res.status === 422 && errorData.details?.serverTotal) {
          onPriceMismatch()
        } else {
          setErrorMessage(errorData.message || "Terjadi kesalahan saat checkout")
        }
      }
    } catch {
      setErrorMessage("Gagal menghubungi server. Periksa koneksi internet.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>Ringkasan belanja dan pembayaran</DialogDescription>
        </DialogHeader>

        {/* Item Summary */}
        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Keranjang kosong
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                className="flex items-start justify-between text-sm py-1.5 border-b border-dashed last:border-b-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.quantity} {item.product.unit} × {formatCurrency(item.unitPrice)}
                    {item.priceTier === "WHOLESALE" && (
                      <span className="ml-1 text-green-600 font-medium">• Grosir</span>
                    )}
                  </p>
                </div>
                <p className="font-semibold ml-2 whitespace-nowrap">
                  {formatCurrency(item.lineTotal)}
                </p>
              </div>
            ))
          )}
        </div>

        <Separator />

        {/* Subtotal & Grand Total */}
        <div className="space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} item)</span>
            <span>{formatCurrency(grandTotal)}</span>
          </div>
          {items.some(i => i.priceTier === "WHOLESALE") && (
            <div className="flex justify-between text-xs text-green-600">
              <span>✓ Harga grosir diterapkan pada {items.filter(i => i.priceTier === "WHOLESALE").length} item</span>
            </div>
          )}
          <div className="flex justify-between items-center font-bold text-lg pt-1 border-t">
            <span>TOTAL BAYAR</span>
            <span className="text-primary">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        <Separator />

        {/* Payment Method Selection */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Metode Pembayaran</p>
          <div className="grid grid-cols-3 gap-2">
            {(["CASH", "QRIS", "TRANSFER"] as const).map((method) => (
              <Button
                key={method}
                variant={paymentMethod === method ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setPaymentMethod(method)
                  setErrorMessage(null)
                }}
                className="w-full"
              >
                {method === "CASH" ? "Cash" : method === "QRIS" ? "QRIS" : "Transfer"}
              </Button>
            ))}
          </div>
        </div>

        {/* Cash Payment Input */}
        {paymentMethod === "CASH" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Jumlah Bayar</label>
              <Input
                type="number"
                placeholder="Masukkan jumlah uang"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                min={0}
              />
            </div>

            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(50000)}
              >
                Rp 50.000
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(100000)}
              >
                Rp 100.000
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUangPas}
              >
                Uang Pas
              </Button>
            </div>

            {/* Insufficient Amount Warning */}
            {isInsufficient && amountPaid !== "" && (
              <p className="text-sm text-red-600 font-medium">
                Nominal kurang {formatCurrency(difference)}
              </p>
            )}

            {/* Change Display */}
            {!isInsufficient && amountPaidNum > 0 && (
              <div className="flex justify-between items-center bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                <span className="text-sm font-medium">Kembalian</span>
                <span className="font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(changeAmount)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* QRIS/Transfer Info */}
        {paymentMethod !== "CASH" && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              Pembayaran {paymentMethod === "QRIS" ? "QRIS" : "Transfer"}: {formatCurrency(grandTotal)}
            </p>
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <p className="text-sm text-red-600 text-center">{errorMessage}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="min-w-[100px]"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Memproses...
              </span>
            ) : (
              "Bayar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
