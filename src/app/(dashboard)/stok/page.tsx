"use client"

import { useState, useEffect, useCallback } from "react"
import { BarcodeScanner } from "@/components/kasir/barcode-scanner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { ProductSearch } from "@/components/kasir/product-search"

interface SelectedProduct {
  id: string
  name: string
  barcode: string
  stock: number
  unit: string
}

interface Supplier {
  id: string
  name: string
}

interface StockLog {
  id: string
  productId: string
  type: string
  quantity: number
  reference: string
  createdAt: string
  product: { id: string; name: string; barcode: string }
  user: { id: string; name: string }
}

export default function StokPage() {
  // Restock form state
  const [selectedProduct, setSelectedProduct] = useState<SelectedProduct | null>(null)
  const [quantity, setQuantity] = useState("")
  const [supplierId, setSupplierId] = useState("")
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)

  // Stock log state
  const [stockLogs, setStockLogs] = useState<StockLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers")
      if (res.ok) {
        const data = await res.json()
        setSuppliers(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch suppliers:", error)
    }
  }, [])

  const fetchStockLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const params = new URLSearchParams({ type: "IN", pageSize: "20" })
      if (dateFrom) params.set("from", dateFrom)
      if (dateTo) params.set("to", dateTo)

      const res = await fetch(`/api/stock-logs?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setStockLogs(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch stock logs:", error)
    } finally {
      setLogsLoading(false)
    }
  }, [dateFrom, dateTo])

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  useEffect(() => {
    fetchStockLogs()
  }, [fetchStockLogs])

  const handleProductSelected = (product: any) => {
    setSelectedProduct({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      stock: product.stock,
      unit: product.unit,
    })
    setSuccessMessage(null)
    setErrorMessage(null)
  }

  const handleBarcodeDetected = async (barcode: string) => {
    try {
      const res = await fetch(`/api/products/barcode/${encodeURIComponent(barcode)}`)
      if (res.ok) {
        const product = await res.json()
        handleProductSelected(product)
        setScannerOpen(false)
      } else {
        setErrorMessage(`Produk dengan barcode "${barcode}" tidak ditemukan`)
      }
    } catch {
      setErrorMessage("Gagal mencari produk. Periksa koneksi.")
    }
  }

  const handleSubmitRestock = async () => {
    if (!selectedProduct || !quantity || !supplierId) {
      setErrorMessage("Mohon lengkapi semua field")
      return
    }

    const qty = parseInt(quantity, 10)
    if (isNaN(qty) || qty < 1) {
      setErrorMessage("Jumlah harus lebih dari 0")
      return
    }

    setSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(`/api/products/${selectedProduct.id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: qty, supplierId }),
      })

      if (res.ok) {
        setSuccessMessage(
          `Berhasil menambah ${qty} ${selectedProduct.unit} untuk "${selectedProduct.name}"`
        )
        setSelectedProduct(null)
        setQuantity("")
        setSupplierId("")
        fetchStockLogs()
      } else {
        const data = await res.json()
        setErrorMessage(data.message || "Gagal melakukan restock")
      }
    } catch (error) {
      console.error("Restock error:", error)
      setErrorMessage("Gagal menghubungi server")
    } finally {
      setSubmitting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Restock Produk</h1>

      {/* Restock Form */}
      <div className="border rounded-lg p-4 space-y-4 max-w-xl">
        <h2 className="text-lg font-semibold">Tambah Stok Masuk</h2>

        {/* Product Selection */}
        <div className="space-y-2">
          <Label>Produk *</Label>
          {selectedProduct ? (
            <div className="flex items-center justify-between bg-muted p-3 rounded-md">
              <div>
                <p className="font-medium">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">
                  Barcode: {selectedProduct.barcode} • Stok saat ini: {selectedProduct.stock} {selectedProduct.unit}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProduct(null)}
              >
                Ganti
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <ProductSearch onProductSelected={handleProductSelected} />
              {scannerOpen ? (
                <BarcodeScanner onBarcodeDetected={handleBarcodeDetected} autoStart={true} />
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setScannerOpen(true)}
                  className="w-full min-h-[44px]"
                >
                  📷 Scan Barcode
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="restock-qty">Jumlah *</Label>
          <Input
            id="restock-qty"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Masukkan jumlah restock"
          />
        </div>

        {/* Supplier Selection */}
        <div className="space-y-2">
          <Label>Supplier *</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih supplier" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((supplier) => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        {errorMessage && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{errorMessage}</p>
        )}
        {successMessage && (
          <p className="text-sm text-green-700 bg-green-50 p-3 rounded-md">{successMessage}</p>
        )}

        {/* Submit Button */}
        <Button
          onClick={handleSubmitRestock}
          disabled={submitting || !selectedProduct || !quantity || !supplierId}
          className="w-full bg-primary hover:bg-primary/90"
        >
          {submitting ? "Memproses..." : "Tambah Stok"}
        </Button>
      </div>

      <Separator />

      {/* Recent Restock History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Riwayat Stok Masuk</h2>

        {/* Date Range Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="space-y-1">
            <Label htmlFor="date-from" className="text-sm">Dari</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="sm:max-w-[180px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date-to" className="text-sm">Sampai</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="sm:max-w-[180px]"
            />
          </div>
          {(dateFrom || dateTo) && (
            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                }}
              >
                Reset
              </Button>
            </div>
          )}
        </div>

        {/* Stock Log Table */}
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-center">Jumlah</TableHead>
                <TableHead>Operator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Memuat data...
                  </TableCell>
                </TableRow>
              ) : stockLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Belum ada riwayat stok masuk
                  </TableCell>
                </TableRow>
              ) : (
                stockLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">{formatDate(log.createdAt)}</TableCell>
                    <TableCell>
                      <p className="font-medium">{log.product.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{log.product.barcode}</p>
                    </TableCell>
                    <TableCell className="text-center font-semibold text-green-700">
                      +{log.quantity}
                    </TableCell>
                    <TableCell className="text-sm">{log.user.name}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
