import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"

export async function GET() {
  const { error } = await requireRole("ADMIN", "KASIR", "GUDANG")
  if (error) return error

  // Get top 12 products by total quantity sold from completed transactions
  // Only include active products
  const popularProducts = await prisma.transactionItem.groupBy({
    by: ["productId"],
    _sum: {
      quantity: true,
    },
    where: {
      transaction: {
        status: "COMPLETED",
      },
      product: {
        isActive: true,
      },
    },
    orderBy: {
      _sum: {
        quantity: "desc",
      },
    },
    take: 12,
  })

  // Fetch full product details for the top products
  const productIds = popularProducts.map((item) => item.productId)

  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isActive: true,
    },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
    },
  })

  // Sort products in same order as popularity ranking
  const sortedProducts = productIds
    .map((id) => {
      const product = products.find((p) => p.id === id)
      const salesData = popularProducts.find((p) => p.productId === id)
      return product
        ? { ...product, totalSold: salesData?._sum.quantity ?? 0 }
        : null
    })
    .filter(Boolean)

  return NextResponse.json(sortedProducts)
}
