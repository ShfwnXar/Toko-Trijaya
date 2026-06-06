"use client"

import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface DashboardStats {
  revenueToday: number
  transactionCountToday: number
  paymentMethodBreakdown: { method: string; count: number; total: number }[]
  lowStockCount: number
  revenueChart: { date: string; revenue: number }[]
  topProducts: { productId: string; name: string; totalQuantity: number }[]
  lowStockProducts?: { id: string; name: string; barcode: string; stock: number; minStock: number; unit: string }[]
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount)

const formatChartDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" })
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chartRange, setChartRange] = useState<"7" | "30">("7")

  useEffect(() => {
    async function fetchStats() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/dashboard/stats")
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        } else {
          const errData = await res.json().catch(() => ({}))
          setError(errData.message || "Gagal memuat data dashboard")
        }
      } catch {
        setError("Gagal menghubungi server")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Memuat dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    )
  }

  if (!stats) return null

  // Filter chart data based on toggle
  const chartData = chartRange === "7"
    ? stats.revenueChart.slice(-7)
    : stats.revenueChart

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
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Pendapatan Hari Ini</p>
          <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(stats.revenueToday)}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Jumlah Transaksi</p>
          <p className="text-2xl font-bold mt-1">{stats.transactionCountToday}</p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Metode Pembayaran</p>
          <div className="mt-1 space-y-1">
            {stats.paymentMethodBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
            ) : (
              stats.paymentMethodBreakdown.map((pm) => (
                <div key={pm.method} className="flex items-center justify-between text-sm">
                  <span>{getPaymentLabel(pm.method)}</span>
                  <Badge variant="outline">{pm.count}x</Badge>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <p className="text-sm text-muted-foreground">Stok Rendah</p>
          <p className={`text-2xl font-bold mt-1 ${stats.lowStockCount > 0 ? "text-red-600" : "text-green-600"}`}>
            {stats.lowStockCount} produk
          </p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="border rounded-lg p-4 bg-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Grafik Pendapatan</h2>
          <div className="flex gap-1">
            <Button
              variant={chartRange === "7" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartRange("7")}
            >
              7 Hari
            </Button>
            <Button
              variant={chartRange === "30" ? "default" : "outline"}
              size="sm"
              onClick={() => setChartRange("30")}
            >
              30 Hari
            </Button>
          </div>
        </div>
        <div className="h-64">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Belum ada data pendapatan
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatChartDate} fontSize={12} />
                <YAxis
                  tickFormatter={(val) => `${(val / 1000000).toFixed(1)}jt`}
                  fontSize={12}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), "Pendapatan"]}
                  labelFormatter={(label) => formatChartDate(String(label))}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(176, 63%, 45%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Products & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Products */}
        <div className="border rounded-lg p-4 bg-card">
          <h2 className="text-lg font-semibold mb-3">Top 10 Produk (30 Hari)</h2>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {stats.topProducts.map((product, idx) => (
                <div key={product.productId} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-bold text-muted-foreground w-6">{idx + 1}.</span>
                    <span className="text-sm truncate">{product.name}</span>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {product.totalQuantity} terjual
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="border rounded-lg p-4 bg-card">
          <h2 className="text-lg font-semibold mb-3">Peringatan Stok Rendah</h2>
          {stats.lowStockCount === 0 ? (
            <p className="text-sm text-green-600 py-4 text-center">Semua stok dalam kondisi baik</p>
          ) : stats.lowStockProducts && stats.lowStockProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-center">Stok</TableHead>
                    <TableHead className="text-center">Min</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.lowStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="text-sm">{product.name}</TableCell>
                      <TableCell className="text-center text-red-600 font-semibold">
                        {product.stock} {product.unit}
                      </TableCell>
                      <TableCell className="text-center text-muted-foreground">
                        {product.minStock}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-amber-600 py-4 text-center">
              {stats.lowStockCount} produk memiliki stok rendah
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
