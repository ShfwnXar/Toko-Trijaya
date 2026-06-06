import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"

export async function GET(
  request: NextRequest,
  { params }: { params: { barcode: string } }
) {
  const { error } = await requireRole("ADMIN", "KASIR", "GUDANG")
  if (error) return error

  const product = await prisma.product.findFirst({
    where: {
      barcode: params.barcode,
      isActive: true,
    },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
    },
  })

  if (!product) {
    return NextResponse.json(
      { error: "Not Found", message: "Produk tidak ditemukan" },
      { status: 404 }
    )
  }

  return NextResponse.json(product)
}
