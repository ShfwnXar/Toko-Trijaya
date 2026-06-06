"use client"

import { useState } from "react"
import { CartManager } from "@/components/kasir/cart-manager"
import { CheckoutHandler, useLastReceipt } from "@/components/kasir/checkout-handler"
import { Receipt } from "@/components/kasir/receipt"
import { useCartStore } from "@/stores/cart-store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ShoppingCart, Minus, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"
import { ReceiptData } from "@/components/kasir/checkout-dialog"

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)

export default function KasirPage() {
  const { lastReceipt, setLastReceipt, clearReceipt } = useLastReceipt()
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileCartExpanded, setMobileCartExpanded] = useState(false)

  const items = useCartStore((s) => s.items)
  const grandTotal = useCartStore((s) => s.grandTotal)
  const totalItems = useCartStore((s) => s.totalItems)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const removeItem = useCartStore((s) => s.removeItem)

  const handleReceiptReady = (receipt: ReceiptData) => {
    setLastReceipt(receipt)
  }

  const handleReceiptClose = () => {
    clearReceipt()
  }

  // If showing receipt, render receipt view
  if (lastReceipt) {
    return (
      <div className="p-4 md:p-6">
        <Receipt receipt={lastReceipt} onClose={handleReceiptClose} />
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)] md:h-screen relative">
      {/* Left/Top: Product Input Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-16 md:pb-6">
        <CartManager />
      </div>

      {/* Desktop: Fixed Sidebar Cart (768px+) */}
      <aside className="hidden md:flex md:flex-col w-[320px] lg:w-[380px] border-l bg-card overflow-hidden">
        <CartContent
          items={items}
          grandTotal={grandTotal}
          totalItems={totalItems}
          updateQuantity={updateQuantity}
          removeItem={removeItem}
          onCheckout={() => setCheckoutOpen(true)}
        />
      </aside>

      {/* Mobile: Bottom Sheet Cart (< 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-20">
        {/* Collapsed bar */}
        <div
          className={`bg-card border-t transition-transform duration-300 ease-in-out ${
            mobileCartExpanded ? "translate-y-full" : ""
          }`}
        >
          <button
            onClick={() => setMobileCartExpanded(true)}
            className="w-full flex items-center justify-between px-4 py-3 min-h-[48px]"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} className="text-primary" />
              <span className="font-medium text-sm">
                {totalItems} item
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">{formatCurrency(grandTotal)}</span>
              <ChevronUp size={16} />
            </div>
          </button>
        </div>

        {/* Expanded sheet */}
        <div
          className={`fixed inset-x-0 bottom-0 bg-card border-t shadow-2xl transition-transform duration-300 ease-in-out rounded-t-xl ${
            mobileCartExpanded ? "translate-y-0" : "translate-y-full"
          }`}
          style={{ height: "70vh" }}
        >
          {/* Handle bar */}
          <button
            onClick={() => setMobileCartExpanded(false)}
            className="w-full flex items-center justify-center py-2 min-h-[44px]"
          >
            <ChevronDown size={20} className="text-muted-foreground" />
          </button>

          <CartContent
            items={items}
            grandTotal={grandTotal}
            totalItems={totalItems}
            updateQuantity={updateQuantity}
            removeItem={removeItem}
            onCheckout={() => {
              setMobileCartExpanded(false)
              setCheckoutOpen(true)
            }}
          />
        </div>

        {/* Backdrop */}
        {mobileCartExpanded && (
          <div
            className="fixed inset-0 bg-black/30 z-[-1]"
            onClick={() => setMobileCartExpanded(false)}
          />
        )}
      </div>

      {/* Checkout Handler (manages dialog + post-checkout flow) */}
      <CheckoutHandler
        checkoutOpen={checkoutOpen}
        onCheckoutOpenChange={setCheckoutOpen}
        onReceiptReady={handleReceiptReady}
      />
    </div>
  )
}

/** Cart display content used by both desktop sidebar and mobile bottom sheet */
function CartContent({
  items,
  grandTotal,
  totalItems,
  updateQuantity,
  removeItem,
  onCheckout,
}: {
  items: ReturnType<typeof useCartStore.getState>["items"]
  grandTotal: number
  totalItems: number
  updateQuantity: (productId: string, qty: number) => void
  removeItem: (productId: string) => void
  onCheckout: () => void
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <ShoppingCart size={18} />
          Keranjang
        </h2>
        <Badge variant="secondary">{totalItems} item</Badge>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            Keranjang kosong
          </div>
        ) : (
          items.map((item) => (
            <div key={item.productId} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.unitPrice)} / {item.product.unit}
                    {item.priceTier === "WHOLESALE" && (
                      <Badge variant="secondary" className="ml-1 text-[10px] px-1">Grosir</Badge>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.productId)}
                  className="text-red-500 hover:text-red-700 p-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={`Hapus ${item.product.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                {/* Quantity Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40 min-w-[44px] min-h-[44px]"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    disabled={item.quantity >= 9999}
                    className="w-8 h-8 flex items-center justify-center rounded-md border hover:bg-muted disabled:opacity-40 min-w-[44px] min-h-[44px]"
                    aria-label="Tambah jumlah"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Line Total */}
                <p className="text-sm font-semibold">{formatCurrency(item.lineTotal)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer: Grand Total + Bayar button */}
      <div className="border-t px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Total</span>
          <span className="text-lg font-bold text-primary">{formatCurrency(grandTotal)}</span>
        </div>
        <Button
          onClick={onCheckout}
          disabled={items.length === 0}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold min-h-[44px]"
          size="lg"
        >
          Bayar
        </Button>
      </div>
    </div>
  )
}
