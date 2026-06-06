import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"
import { updateSupplierSchema } from "@/lib/validations/supplier"

/**
 * PUT /api/suppliers/[id] — Update a supplier
 * Accessible by: Admin only
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  const { id } = params

  // Check if supplier exists
  const existing = await prisma.supplier.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Supplier tidak ditemukan" },
      { status: 404 }
    )
  }

  const body = await request.json()
  const validation = updateSupplierSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: "Data supplier tidak valid",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const data = validation.data

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.phone !== undefined && { phone: data.phone ?? null }),
      ...(data.address !== undefined && { address: data.address ?? null }),
    },
  })

  return NextResponse.json(supplier)
}

/**
 * DELETE /api/suppliers/[id] — Delete a supplier
 * Accessible by: Admin only
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  const { id } = params

  // Check if supplier exists
  const existing = await prisma.supplier.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Supplier tidak ditemukan" },
      { status: 404 }
    )
  }

  // Check if supplier has associated products
  const productsCount = await prisma.product.count({
    where: { supplierId: id },
  })

  if (productsCount > 0) {
    return NextResponse.json(
      {
        error: "Conflict",
        message: `Supplier tidak dapat dihapus karena masih memiliki ${productsCount} produk terkait`,
      },
      { status: 409 }
    )
  }

  await prisma.supplier.delete({ where: { id } })

  return NextResponse.json({ message: "Supplier berhasil dihapus" })
}
