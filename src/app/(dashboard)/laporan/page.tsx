"use client"

import { useState, useCallback } from "react"
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
import { Badge } from "@/components/ui/badge"
import { FileText, Sheet } from "lucide-react"

interface TransactionReport {
  id: string
  invoiceNumber: string
  date: string
  totalAmount: number
  totalProfit: number
  totalItems: number
  paymentMethod: string
  status: string
  cashier: string
  items: {
    productName: string
    barcode: string
    quantity: number
    unitPrice: number
    totalPrice: number
    priceTier: string
  }[]
}

interface ReportSummary {
  totalRevenue: number
  totalProfit: number
  transactionCount: number
  dateFrom: string
  dateTo: string
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

const formatDateShort = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })

export default function LaporanPage() {
  const [range, setRange] = useState("daily")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [transactions, setTransactions] = useState<TransactionReport[]>([])
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    setMessage(null)
    try {
      const params = new URLSearchParams({ range })
      if (range === "custom") {
        if (dateFrom) params.set("from", dateFrom)
        if (dateTo) params.set("to", dateTo)
      }

      const res = await fetch(`/api/reports/export?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTransactions(data.transactions || [])
        setSummary(data.summary || null)
        if (data.message) setMessage(data.message)
      } else {
        const errData = await res.json().catch(() => ({}))
        setMessage(errData.message || "Gagal memuat laporan")
        setTransactions([])
        setSummary(null)
      }
    } catch {
      setMessage("Gagal menghubungi server")
      setTransactions([])
      setSummary(null)
    } finally {
      setLoading(false)
      setLoaded(true)
    }
  }, [range, dateFrom, dateTo])

  const handleExportPDF = async () => {
    if (transactions.length === 0) return

    const { jsPDF } = await import("jspdf")
    const autoTable = (await import("jspdf-autotable")).default

    const doc = new jsPDF()

    // Header
    doc.setFontSize(16)
    doc.text("Toko Grosir Tri Jaya", 105, 15, { align: "center" })
    doc.setFontSize(11)
    doc.text("Laporan Transaksi", 105, 22, { align: "center" })

    // Date range
    if (summary) {
      doc.setFontSize(9)
      const fromStr = formatDateShort(summary.dateFrom)
      const toStr = formatDateShort(summary.dateTo)
      doc.text(`Periode: ${fromStr} - ${toStr}`, 105, 28, { align: "center" })
    }

    // Table
    const tableData = transactions.map((tx) => [
      tx.invoiceNumber,
      formatDate(tx.date),
      tx.cashier,
      tx.totalItems.toString(),
      formatCurrency(tx.totalAmount),
      formatCurrency(tx.totalProfit),
      tx.paymentMethod,
    ])

    autoTable(doc, {
      startY: 34,
      head: [["Invoice", "Tanggal", "Kasir", "Items", "Total", "Profit", "Bayar"]],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [39, 174, 166] },
    })

    // Grand totals
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(10)
    doc.text(`Total Pendapatan: ${formatCurrency(summary?.totalRevenue || 0)}`, 14, finalY)
    doc.text(`Total Profit: ${formatCurrency(summary?.totalProfit || 0)}`, 14, finalY + 6)
    doc.text(`Jumlah Transaksi: ${summary?.transactionCount || 0}`, 14, finalY + 12)

    doc.save(`Laporan_${range}_${new Date().toISOString().split("T")[0]}.pdf`)
  }

  const handleExportExcel = async () => {
    if (transactions.length === 0) return

    const XLSX = await import("xlsx")

    const excelData = transactions.map((tx) => ({
      "Invoice": tx.invoiceNumber,
      "Tanggal": new Date(tx.date).toLocaleDateString("id-ID"),
      "Waktu": new Date(tx.date).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
      "Kasir": tx.cashier,
      "Items": tx.items.map((i) => `${i.productName} (${i.quantity})`).join(", "),
      "Total": tx.totalAmount,
      "Profit": tx.totalProfit,
      "Metode Bayar": tx.paymentMethod,
      "Status": tx.status,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(excelData)

    // Set column widths
    ws["!cols"] = [
      { wch: 18 }, // Invoice
      { wch: 12 }, // Tanggal
      { wch: 8 },  // Waktu
      { wch: 15 }, // Kasir
      { wch: 40 }, // Items
      { wch: 15 }, // Total
      { wch: 15 }, // Profit
      { wch: 12 }, // Metode Bayar
      { wch: 12 }, // Status
    ]

    XLSX.utils.book_append_sheet(wb, ws, "Transaksi")
    XLSX.writeFile(wb, `Laporan_${range}_${new Date().toISOString().split("T")[0]}.xlsx`)
  }

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case "CASH": return "Cash"
      case "QRIS": return "QRIS"
      case "TRANSFER": return "Transfer"
      default: return method
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">Laporan Transaksi</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap items-end">
        <div className="space-y-1">
          <Label className="text-sm">Rentang Waktu</Label>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Hari Ini</SelectItem>
              <SelectItem value="weekly">7 Hari Terakhir</SelectItem>
              <SelectItem value="monthly">Bulan Ini</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {range === "custom" && (
          <>
            <div className="space-y-1">
              <Label className="text-sm">Dari</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Sampai</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </>
        )}

        <Button onClick={fetchReport} disabled={loading} className="bg-primary hover:bg-primary/90">
          {loading ? "Memuat..." : "Tampilkan"}
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && loaded && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Pendapatan</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(summary.totalRevenue)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Profit</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalProfit)}</p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Jumlah Transaksi</p>
            <p className="text-xl font-bold">{summary.transactionCount}</p>
          </div>
        </div>
      )}

      {/* Export Buttons */}
      {loaded && (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleExportPDF}
            disabled={transactions.length === 0}
            className="gap-2"
          >
            <FileText size={16} />
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={transactions.length === 0}
            className="gap-2"
          >
            <Sheet size={16} />
            Export Excel
          </Button>
        </div>
      )}

      {/* Message */}
      {message && (
        <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{message}</p>
      )}

      {/* Transaction Table */}
      {loaded && transactions.length > 0 && (
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Kasir</TableHead>
                <TableHead className="text-center">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-center">Pembayaran</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-sm">{tx.invoiceNumber}</TableCell>
                  <TableCell className="text-sm">{formatDate(tx.date)}</TableCell>
                  <TableCell className="text-sm">{tx.cashier}</TableCell>
                  <TableCell className="text-center">{tx.totalItems}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(tx.totalAmount)}</TableCell>
                  <TableCell className="text-right text-green-600">{formatCurrency(tx.totalProfit)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{getPaymentLabel(tx.paymentMethod)}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {loaded && transactions.length === 0 && !message && (
        <div className="text-center py-12 text-muted-foreground">
          Tidak ada transaksi pada periode ini
        </div>
      )}
    </div>
  )
}
