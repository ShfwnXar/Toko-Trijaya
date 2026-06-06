import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"

/**
 * GET /api/dashboard/stats — Dashboard aggregations
 * Accessible by: Admin only
 *
 * Returns:
 * - Total revenue today (SUM totalAmount WHERE status=COMPLETED AND date=today)
 * - Transaction count today
 * - Payment method breakdown (count + sum per method)
 * - Low stock count (products where stock <= minStock)
 * - Revenue chart data: daily aggregated revenue for last 30 days
 * - Top 10 products: by SUM(quantity) from TransactionItem (last 30 days, exclude VOID)
 *
 * All calculations exclude VOID transactions.
 *
 * Requirements: 8.1, 8.3, 8.7, 2.5
 */
export async function GET() {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  try {
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // Last 30 days start
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setHours(0, 0, 0, 0)

    // 1. Today's revenue and transaction count
    const todayStats = await prisma.transaction.aggregate({
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    })

    const revenueToday = Number(todayStats._sum.totalAmount || 0)
    const transactionCountToday = todayStats._count.id

    // 2. Payment method breakdown (today, exclude VOID)
    const paymentBreakdown = await prisma.transaction.groupBy({
      by: ["paymentMethod"],
      where: {
        status: "COMPLETED",
        createdAt: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        totalAmount: true,
      },
    })

    const paymentMethodBreakdown = paymentBreakdown.map((item) => ({
      method: item.paymentMethod,
      count: item._count.id,
      total: Number(item._sum.totalAmount || 0),
    }))

    // 3. Low stock count and products
    const lowStockCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Product"
      WHERE "isActive" = true AND "stock" <= "minStock"
    `
    const lowStock = Number(lowStockCount[0]?.count || 0)

    // Low stock products (sorted by stock ascending, limit 20)
    const lowStockProducts = await prisma.$queryRaw<
      { id: string; name: string; barcode: string; stock: number; minStock: number; unit: string }[]
    >`
      SELECT "id", "name", "barcode", "stock", "minStock", "unit"
      FROM "Product"
      WHERE "isActive" = true AND "stock" <= "minStock"
      ORDER BY "stock" ASC
      LIMIT 20
    `

    // 4. Revenue chart data: daily aggregated revenue for last 30 days
    const revenueChartRaw = await prisma.$queryRaw<
      { date: Date; revenue: number }[]
    >`
      SELECT DATE("createdAt") as date, SUM("totalAmount")::float as revenue
      FROM "Transaction"
      WHERE "status" = 'COMPLETED'
        AND "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY DATE("createdAt") ASC
    `

    const revenueChart = revenueChartRaw.map((item) => ({
      date: new Date(item.date).toISOString().split("T")[0],
      revenue: Number(item.revenue || 0),
    }))

    // 5. Top 10 products by SUM(quantity) from TransactionItem (last 30 days, exclude VOID)
    const topProductsRaw = await prisma.$queryRaw<
      { productId: string; name: string; totalQuantity: bigint }[]
    >`
      SELECT ti."productId", p."name", SUM(ti."quantity")::bigint as "totalQuantity"
      FROM "TransactionItem" ti
      JOIN "Transaction" t ON ti."transactionId" = t."id"
      JOIN "Product" p ON ti."productId" = p."id"
      WHERE t."status" = 'COMPLETED'
        AND t."createdAt" >= ${thirtyDaysAgo}
      GROUP BY ti."productId", p."name"
      ORDER BY SUM(ti."quantity") DESC
      LIMIT 10
    `

    const topProducts = topProductsRaw.map((item) => ({
      productId: item.productId,
      name: item.name,
      totalQuantity: Number(item.totalQuantity),
    }))

    return NextResponse.json({
      revenueToday,
      transactionCountToday,
      paymentMethodBreakdown,
      lowStockCount: lowStock,
      lowStockProducts,
      revenueChart,
      topProducts,
    })
  } catch (err: any) {
    console.error("Dashboard stats error:", err)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Gagal memuat statistik dashboard" },
      { status: 500 }
    )
  }
}
