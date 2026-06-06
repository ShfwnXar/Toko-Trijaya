"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useSession } from "next-auth/react"

interface TransactionItem {
  id: string
  quantity: number
  unitPrice: string | number
  totalPrice: string | number
  priceTier: string
  product: { id: string; name: string; barcode: string }
}

interface Transaction {
  id: string
  invoiceNumber: string
  totalAmount: string | number
  totalItems: number
  paymentMethod: string
  amountPaid: string | number
  changeAmount: string | number
  status: string
  createdAt: string
  cashier: { id: string; name: string }
  items: TransactionItem[]
}

interface PaginationData {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function TransaksiPage() {
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  })
  const [loading, setLoading] = useState(true)

  // Filters
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [statusFilter, setStatusFilter] = useState("")

  // Void dialog
  const [voidDialogOpen, setVoidDialogOpen] = useState(false)
  const [voidingTransaction, setVoidingTransaction] = useState<Transaction | null>(null)
  const [voidLoading, setVoidLoading] = useState(false)
  const [voidError, setVoidError] = useState<string | null>(null)

  // Detail dialog for reprint
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [detailTransaction, setDetailTransaction] = useState<Transaction | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", pagination.page.toString())
      params.set("pageSize", "20")
      if (dateFrom) params.set("from", dateFrom)
      if (dateTo) params.set("to", dateTo)
      if (statusFilter) params.set("status", statusFilter)

      const res = await fetch(`/api/transactions?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.data)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error)
    } finally {
      setLoading(false)
    }
  }, [pagination.page, dateFrom, dateTo, statusFilter])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }

  const handleVoidClick = (transaction: Transaction) => {
    setVoidingTransaction(transaction)
    setVoidError(null)
    setVoidDialogOpen(true)
  }

  const handleVoidConfirm = async () => {
    if (!voidingTransaction) return

    setVoidLoading(true)
    setVoidError(null)
    try {
      const res = await fetch(`/api/transactions/${voidingTransaction.id}/void`, {
        method: "PUT",
      })
      if (res.ok) {
        setVoidDialogOpen(false)
        setVoidingTransaction(null)
        fetchTransactions()
      } else {
        const data = await res.json()
        setVoidError(data.message || "Gagal melakukan void transaksi")
      }
    } catch (error) {
      console.error("Void error:", error)
      setVoidError("Gagal menghubungi server")
    } finally {
      setVoidLoading(false)
    }
  }

  const handleReprintClick = (transaction: Transaction) => {
    setDetailTransaction(transaction)
    setDetailDialogOpen(true)
  }

  const handlePrintReceipt = () => {
    window.print()
  }

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(amount))
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

  const getStatusBadge = (status: string) => {
    if (status === "VOID") {
      return <Badge variant="destructive" className="bg-red-600">VOID</Badge>
    }
    return <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">COMPLETED</Badge>
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case "CASH": return "Cash"
      case "QRIS": return "QRIS"
      case "TRANSFER": return "Transfer"
      default: return method
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h1 className="text-2xl font-bold">Riwayat Transaksi</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="space-y-1">
          <Label className="text-sm">Dari</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="sm:max-w-[180px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Sampai</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="sm:max-w-[180px]"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-sm">Status</Label>
          <Select
            value={statusFilter || "all"}
            onValueChange={(v) => {
              setStatusFilter(v === "all" ? "" : v)
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
          >
            <SelectTrigger className="sm:max-w-[160px]">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="VOID">Void</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No. Invoice</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead className="text-center">Pembayaran</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Tidak ada transaksi ditemukan
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-sm">{tx.invoiceNumber}</TableCell>
                  <TableCell className="text-sm">{formatDate(tx.createdAt)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(tx.totalAmount)}
                  </TableCell>
                  <TableCell className="text-center">{tx.totalItems}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{getPaymentMethodLabel(tx.paymentMethod)}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{getStatusBadge(tx.status)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReprintClick(tx)}
                      >
                        Cetak Ulang
                      </Button>
                      {isAdmin && tx.status === "COMPLETED" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleVoidClick(tx)}
                        >
                          Void
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (pagination.page > 1) handlePageChange(pagination.page - 1)
                }}
                className={pagination.page <= 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
              const startPage = Math.max(1, pagination.page - 2)
              const pageNum = startPage + i
              if (pageNum > pagination.totalPages) return null
              return (
                <PaginationItem key={pageNum}>
                  <PaginationLink
                    href="#"
                    isActive={pageNum === pagination.page}
                    onClick={(e) => {
                      e.preventDefault()
                      handlePageChange(pageNum)
                    }}
                  >
                    {pageNum}
                  </PaginationLink>
                </PaginationItem>
              )
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault()
                  if (pagination.page < pagination.totalPages) handlePageChange(pagination.page + 1)
                }}
                className={pagination.page >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Void Confirmation Dialog */}
      <Dialog open={voidDialogOpen} onOpenChange={setVoidDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Void Transaksi</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin melakukan void pada transaksi{" "}
              <span className="font-semibold font-mono">{voidingTransaction?.invoiceNumber}</span>?
              Stok akan dikembalikan dan transaksi tidak dapat di-undo.
            </DialogDescription>
          </DialogHeader>

          {voidError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {voidError}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidDialogOpen(false)} disabled={voidLoading}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleVoidConfirm} disabled={voidLoading}>
              {voidLoading ? "Memproses..." : "Ya, Void"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reprint Receipt Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Transaksi</DialogTitle>
            <DialogDescription>
              {detailTransaction?.invoiceNumber} — {detailTransaction && formatDate(detailTransaction.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {detailTransaction && (
            <div className="space-y-3 print-receipt" id="receipt-reprint">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-lg">Toko Grosir Tri Jaya</h3>
                <p className="text-sm text-muted-foreground">{detailTransaction.invoiceNumber}</p>
                <p className="text-sm text-muted-foreground">{formatDate(detailTransaction.createdAt)}</p>
                <p className="text-sm text-muted-foreground">Kasir: {detailTransaction.cashier.name}</p>
              </div>

              <Separator />

              <div className="space-y-1">
                {detailTransaction.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div className="flex-1">
                      <p>{item.product.name}</p>
                      <p className="text-muted-foreground">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                        {item.priceTier === "WHOLESALE" && " (Grosir)"}
                      </p>
                    </div>
                    <p className="font-medium">{formatCurrency(item.totalPrice)}</p>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span>{formatCurrency(detailTransaction.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bayar ({getPaymentMethodLabel(detailTransaction.paymentMethod)})</span>
                  <span>{formatCurrency(detailTransaction.amountPaid)}</span>
                </div>
                {Number(detailTransaction.changeAmount) > 0 && (
                  <div className="flex justify-between">
                    <span>Kembalian</span>
                    <span>{formatCurrency(detailTransaction.changeAmount)}</span>
                  </div>
                )}
              </div>

              {detailTransaction.status === "VOID" && (
                <>
                  <Separator />
                  <div className="text-center">
                    <Badge variant="destructive" className="bg-red-600 text-lg px-4 py-1">
                      VOID
                    </Badge>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>
              Tutup
            </Button>
            <Button onClick={handlePrintReceipt} className="bg-primary hover:bg-primary/90">
              Cetak Ulang
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
