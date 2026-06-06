import { NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"
import { restockProduct } from "@/lib/utils/stock"

const restockSchema = z.object({
  quantity: z
    .number()
    .int("Jumlah harus bilangan bulat")
    .min(1, "Jumlah minimal 1")
    .max(99999, "Jumlah maksimal 99.999"),
  supplierId: z.string().min(1, "Supplier ID wajib diisi"),
})

/**
 * POST /api/products/[id]/restock — Record incoming stock
 * Accessible by: Admin, Gudang
 *
 * Validates quantity (1-99999) and supplierId, then atomically
 * increments product stock and creates StockLog (IN).
 *
 * Requirements: 5.2, 5.3, 10.2, 10.3, 10.4
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole("ADMIN", "GUDANG")
  if (error) return error

  const productId = params.id
  const body = await request.json()

  // Validate request body
  const validation = restockSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: "Data restock tidak valid",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const { quantity, supplierId } = validation.data
  const userId = session.user?.id as string

  try {
    await restockProduct(productId, quantity, supplierId, userId)

    // Fetch updated product data
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json(
      { product: updatedProduct, message: "Restock berhasil" },
      { status: 200 }
    )
  } catch (err: any) {
    const message = err?.message || "Terjadi kesalahan saat restock"

    if (message.includes("tidak ditemukan") || message.includes("tidak aktif")) {
      return NextResponse.json(
        { error: "Not Found", message },
        { status: 404 }
      )
    }

    if (message.includes("harus bilangan bulat") || message.includes("antara 1")) {
      return NextResponse.json(
        { error: "Validation Error", message },
        { status: 400 }
      )
    }

    console.error("Restock error:", err)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Terjadi kesalahan saat restock" },
      { status: 500 }
    )
  }
}
