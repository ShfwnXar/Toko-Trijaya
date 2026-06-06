import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"

/**
 * GET /api/reports/export — Report data with date filtering
 * Accessible by: Admin only
 *
 * Query params:
 * - range: daily | weekly | monthly | custom
 * - from: ISO date string (for custom range)
 * - to: ISO date string (for custom range)
 *
 * Returns transaction data + aggregated totals (revenue, profit)
 *
 * Requirements: 8.4, 8.5
 */
export async function GET(request: NextRequest) {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get("range") || "daily"
    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")

    // Calculate date range
    const now = new Date()
    let dateFrom: Date
    let dateTo: Date

    switch (range) {
      case "daily":
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        break
      case "weekly":
        dateFrom = new Date(now)
        dateFrom.setDate(dateFrom.getDate() - 7)
        dateFrom.setHours(0, 0, 0, 0)
        dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        break
      case "monthly":
        dateFrom = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        break
      case "custom":
        if (!fromParam || !toParam) {
          return NextResponse.json(
            { error: "Bad Request", message: "Parameter 'from' dan 'to' diperlukan untuk range custom" },
            { status: 400 }
          )
        }
        dateFrom = new Date(fromParam)
        dateFrom.setHours(0, 0, 0, 0)
        dateTo = new Date(toParam)
        dateTo.setHours(23, 59, 59, 999)
        break
      default:
        dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    }

    // Fetch transactions in date range
    const transactions = await prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: dateFrom,
          lte: dateTo,
        },
        status: "COMPLETED",
      },
      include: {
        cashier: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, barcode: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    if (transactions.length === 0) {
      return NextResponse.json({
        message: "Tidak ada transaksi pada periode ini",
        transactions: [],
        summary: {
          totalRevenue: 0,
          totalProfit: 0,
          transactionCount: 0,
          dateFrom: dateFrom.toISOString(),
          dateTo: dateTo.toISOString(),
        },
      })
    }

    // Calculate aggregated totals
    const totalRevenue = transactions.reduce((sum, tx) => sum + Number(tx.totalAmount), 0)
    const totalProfit = transactions.reduce((sum, tx) => sum + Number(tx.totalProfit), 0)

    // Format transactions for response
    const formattedTransactions = transactions.map((tx) => ({
      id: tx.id,
      invoiceNumber: tx.invoiceNumber,
      date: tx.createdAt.toISOString(),
      totalAmount: Number(tx.totalAmount),
      totalProfit: Number(tx.totalProfit),
      totalItems: tx.totalItems,
      paymentMethod: tx.paymentMethod,
      amountPaid: Number(tx.amountPaid),
      changeAmount: Number(tx.changeAmount),
      status: tx.status,
      cashier: tx.cashier.name,
      items: tx.items.map((item) => ({
        productName: item.product.name,
        barcode: item.product.barcode,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.totalPrice),
        priceTier: item.priceTier,
      })),
    }))

    return NextResponse.json({
      transactions: formattedTransactions,
      summary: {
        totalRevenue,
        totalProfit,
        transactionCount: transactions.length,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
      },
    })
  } catch (err: any) {
    console.error("Reports export error:", err)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Gagal memuat data laporan" },
      { status: 500 }
    )
  }
}
