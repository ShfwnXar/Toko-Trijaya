import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"

/**
 * GET /api/stock-logs — List stock movements (StockLog entries)
 * Accessible by: Admin, Gudang
 *
 * Supports filtering by:
 * - productId: filter by specific product
 * - type: IN or OUT
 * - from / to: date range (inclusive)
 *
 * Pagination: page + pageSize (default 20, max 100)
 * Sorted by createdAt DESC (most recent first)
 * Includes product name and user name in response.
 *
 * Requirements: 10.5
 */
export async function GET(request: NextRequest) {
  const { error } = await requireRole("ADMIN", "GUDANG")
  if (error) return error

  const searchParams = request.nextUrl.searchParams

  // Pagination
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)))
  const skip = (page - 1) * pageSize

  // Filters
  const productId = searchParams.get("productId")
  const type = searchParams.get("type")
  const from = searchParams.get("from")
  const to = searchParams.get("to")

  const where: any = {}

  if (productId) {
    where.productId = productId
  }

  if (type && (type === "IN" || type === "OUT")) {
    where.type = type
  }

  if (from || to) {
    where.createdAt = {}
    if (from) {
      where.createdAt.gte = new Date(from)
    }
    if (to) {
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      where.createdAt.lte = toDate
    }
  }

  const [logs, total] = await Promise.all([
    prisma.stockLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: { id: true, name: true, barcode: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.stockLog.count({ where }),
  ])

  return NextResponse.json({
    data: logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}
