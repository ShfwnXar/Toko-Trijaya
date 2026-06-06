import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"
import { createSupplierSchema } from "@/lib/validations/supplier"

/**
 * GET /api/suppliers — List all suppliers
 * Accessible by: Admin, Gudang
 */
export async function GET(request: NextRequest) {
  const { error } = await requireRole("ADMIN", "GUDANG")
  if (error) return error

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: "asc" },
  })

  return NextResponse.json({ data: suppliers })
}

/**
 * POST /api/suppliers — Create a new supplier
 * Accessible by: Admin only
 */
export async function POST(request: Request) {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  const body = await request.json()
  const validation = createSupplierSchema.safeParse(body)

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

  const supplier = await prisma.supplier.create({
    data: {
      name: data.name,
      phone: data.phone ?? null,
      address: data.address ?? null,
    },
  })

  return NextResponse.json(supplier, { status: 201 })
}
