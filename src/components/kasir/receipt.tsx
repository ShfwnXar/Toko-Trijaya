"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ReceiptData } from "./checkout-dialog"

interface ReceiptProps {
  receipt: ReceiptData
  onClose: () => void
}

const formatRp = (amount: number) =>
  new Intl.NumberFormat("id-ID").format(amount)

function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim()
  if (/^08\d{8,12}$/.test(trimmed)) return true
  if (/^\+62\d{8,12}$/.test(trimmed)) return true
  return false
}

function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith("+62")) return trimmed.slice(1)
  if (trimmed.startsWith("08")) return "62" + trimmed.slice(1)
  return trimmed
}

function generateReceiptText(receipt: ReceiptData): string {
  const lines: string[] = []
  lines.push("🏪 *TOKO GROSIR TRI JAYA*")
  lines.push("Solusi Belanja Lengkap & Hemat")
  lines.push("================================")
  lines.push(`No: ${receipt.invoiceNumber}`)
  lines.push(`Tgl: ${new Date(receipt.date).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`)
  lines.push(`Kasir: ${receipt.cashier}`)
  lines.push("================================")

  for (const item of receipt.items) {
    lines.push(`${item.name}`)
    const tierLabel = item.priceTier === "WHOLESALE" ? " (G)" : ""
    lines.push(`  ${item.quantity}x ${formatRp(item.unitPrice)}${tierLabel}  ${formatRp(item.totalPrice)}`)
  }

  lines.push("--------------------------------")
  lines.push(`TOTAL: Rp ${formatRp(receipt.totalAmount)}`)
  lines.push(`BAYAR (${receipt.paymentMethod}): Rp ${formatRp(receipt.amountPaid)}`)
  if (receipt.changeAmount > 0) {
    lines.push(`KEMBALI: Rp ${formatRp(receipt.changeAmount)}`)
  }
  lines.push("================================")
  lines.push("Terima kasih! 🙏")
  lines.push("Belanja hemat di Toko Tri Jaya")
  return lines.join("\n")
}

export function Receipt({ receipt, onClose }: ReceiptProps) {
  const [phone, setPhone] = useState(receipt.customerPhone || "")
  const [phoneError, setPhoneError] = useState<string | null>(null)

  const handlePrint = () => window.print()

  const handleWhatsApp = () => {
    const trimmed = phone.trim()
    if (!trimmed) { setPhoneError("Masukkan nomor WhatsApp"); return }
    if (!isValidPhone(trimmed)) { setPhoneError("Format: 08xx atau +62xx"); return }
    setPhoneError(null)
    const text = encodeURIComponent(generateReceiptText(receipt))
    window.open(`https://wa.me/${normalizePhone(trimmed)}?text=${text}`, "_blank")
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit", year: "numeric" })

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })

  // Calculate total items qty
  const totalQty = receipt.items.reduce((s, i) => s + i.quantity, 0)

  // Count wholesale items
  const wholesaleItems = receipt.items.filter(i => i.priceTier === "WHOLESALE")

  return (
    <div className="max-w-sm mx-auto space-y-4">
      {/* ===== RECEIPT (Printable) ===== */}
      <div className="bg-white border shadow-sm rounded-xl overflow-hidden print-receipt" id="receipt-content">
        
        {/* === HEADER === */}
        <div className="bg-gradient-to-b from-primary/10 to-white px-5 pt-5 pb-3 text-center">
          <h2 className="text-lg font-black tracking-wide text-gray-900">TOKO GROSIR TRI JAYA</h2>
          <p className="text-[11px] text-gray-500 mt-0.5">Solusi Belanja Lengkap & Hemat</p>
        </div>

        {/* === TRANSACTION INFO === */}
        <div className="px-5 pb-3">
          <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs space-y-0.5 font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">No. Transaksi</span>
              <span className="font-semibold text-gray-700">{receipt.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Tanggal</span>
              <span className="text-gray-700">{formatDate(receipt.date)} {formatTime(receipt.date)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Kasir</span>
              <span className="text-gray-700">{receipt.cashier}</span>
            </div>
          </div>
        </div>

        {/* === SEPARATOR === */}
        <div className="px-5">
          <div className="border-t-2 border-dashed border-gray-300" />
        </div>

        {/* === ITEMS === */}
        <div className="px-5 py-3 space-y-0">
          {receipt.items.map((item, idx) => {
            const isWholesale = item.priceTier === "WHOLESALE"
            const discount = isWholesale ? (item.retailPrice - item.unitPrice) * item.quantity : 0

            return (
              <div key={idx} className="py-1.5 border-b border-gray-100 last:border-b-0">
                <div className="flex justify-between items-start">
                  <span className="text-[13px] font-medium text-gray-800 flex-1 pr-2 leading-tight">
                    {item.name}
                  </span>
                  <span className="text-[13px] font-bold text-gray-900 whitespace-nowrap tabular-nums">
                    {formatRp(item.totalPrice)}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-[11px] text-gray-500 tabular-nums">
                    {item.quantity} {item.unit} × Rp {formatRp(item.unitPrice)}
                  </span>
                  {isWholesale && (
                    <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0 rounded-full font-semibold uppercase">
                      Grosir
                    </span>
                  )}
                </div>
                {isWholesale && discount > 0 && (
                  <div className="text-[11px] text-emerald-600 mt-0.5">
                    <span className="line-through text-gray-400 mr-1">Rp {formatRp(item.retailPrice)}/pcs</span>
                    → hemat Rp {formatRp(discount)}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* === SEPARATOR === */}
        <div className="px-5">
          <div className="border-t-2 border-dashed border-gray-300" />
        </div>

        {/* === TOTALS === */}
        <div className="px-5 py-3 space-y-1.5">
          {/* Jumlah item */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>Jumlah Item</span>
            <span className="tabular-nums">{receipt.items.length} produk ({totalQty} pcs)</span>
          </div>

          {/* Subtotal (harga normal) */}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium tabular-nums">Rp {formatRp(receipt.totalAmount)}</span>
          </div>

          {/* Detail diskon grosir */}
          {(() => {
            const totalSavings = receipt.items.reduce((sum, item) => {
              if (item.priceTier === "WHOLESALE") {
                return sum + (item.retailPrice - item.unitPrice) * item.quantity
              }
              return sum
            }, 0)

            if (totalSavings <= 0) return null

            return (
              <div className="bg-emerald-50 -mx-2 px-2 py-1.5 rounded-lg space-y-0.5">
                <div className="flex justify-between text-xs text-emerald-700 font-medium">
                  <span>🏷️ Total Hemat Grosir ({wholesaleItems.length} item)</span>
                  <span className="tabular-nums">- Rp {formatRp(totalSavings)}</span>
                </div>
                <p className="text-[10px] text-emerald-600">
                  Anda hemat karena membeli ≥12 pcs pada {wholesaleItems.length} produk
                </p>
              </div>
            )
          })()}

          {/* Separator before grand total */}
          <div className="border-t border-gray-200 pt-2 mt-1" />

          {/* GRAND TOTAL */}
          <div className="flex justify-between items-center">
            <span className="text-base font-black text-gray-900">TOTAL</span>
            <span className="text-xl font-black text-gray-900 tabular-nums">Rp {formatRp(receipt.totalAmount)}</span>
          </div>

          {/* Payment method */}
          <div className="flex justify-between text-sm text-gray-600 pt-1">
            <span>Bayar ({receipt.paymentMethod})</span>
            <span className="font-semibold tabular-nums">Rp {formatRp(receipt.amountPaid)}</span>
          </div>

          {/* Kembalian */}
          {receipt.changeAmount > 0 && (
            <div className="flex justify-between text-sm bg-emerald-50 -mx-2 px-2 py-1.5 rounded-lg">
              <span className="font-semibold text-emerald-700">Kembalian</span>
              <span className="font-bold text-emerald-700 tabular-nums">Rp {formatRp(receipt.changeAmount)}</span>
            </div>
          )}
        </div>

        {/* === SEPARATOR === */}
        <div className="px-5">
          <div className="border-t-2 border-dashed border-gray-300" />
        </div>

        {/* === FOOTER === */}
        <div className="px-5 py-4 text-center space-y-1">
          <p className="text-xs text-gray-500">═══ Terima Kasih ═══</p>
          <p className="text-[11px] text-gray-400">Barang yang sudah dibeli tidak dapat</p>
          <p className="text-[11px] text-gray-400">ditukar atau dikembalikan</p>
          <p className="text-[10px] text-gray-300 mt-2 font-mono">{receipt.invoiceNumber}</p>
        </div>
      </div>

      {/* ===== ACTIONS (Not printed) ===== */}
      <div className="space-y-3 no-print">
        {/* WhatsApp input */}
        <div className="flex gap-2">
          <Input
            type="tel"
            placeholder="08xxxxxxxxxx"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setPhoneError(null) }}
            className="flex-1 text-sm"
          />
          <Button
            onClick={handleWhatsApp}
            variant="outline"
            size="sm"
            disabled={!phone.trim()}
            className="whitespace-nowrap"
          >
            📱 WhatsApp
          </Button>
        </div>
        {phoneError && <p className="text-xs text-red-500 -mt-1">{phoneError}</p>}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handlePrint} variant="outline" className="w-full">
            🖨️ Print Nota
          </Button>
          <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90 font-semibold">
            ✓ Selesai
          </Button>
        </div>
      </div>
    </div>
  )
}
