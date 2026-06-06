import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"
import { createProductSchema } from "@/lib/validations/product"
import { Prisma } from "@prisma/client"

export async function GET(request: NextRequest) {
  const { error, session } = await requireRole("ADMIN", "KASIR", "GUDANG")
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const search = searchParams.get("search") || ""
  const category = searchParams.get("category") || ""
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)))

  const skip = (page - 1) * pageSize

  const where: Prisma.ProductWhereInput = {}

  // For Kasir and Gudang, only show active products
  const userRole = session.user?.role
  if (userRole === "KASIR" || userRole === "GUDANG") {
    where.isActive = true
  }

  // Search by name or barcode
  if (search.length >= 1) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { barcode: { contains: search, mode: "insensitive" } },
    ]
  }

  // Filter by category
  if (category) {
    where.category = category
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: {
          select: { id: true, name: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({
    data: products,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

export async function POST(request: Request) {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  const body = await request.json()
  const validation = createProductSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: "Data produk tidak valid",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const data = validation.data

  // Check for duplicate barcode
  const existing = await prisma.product.findUnique({
    where: { barcode: data.barcode },
  })
  if (existing) {
    return NextResponse.json(
      { error: "Conflict", message: "Barcode sudah digunakan oleh produk lain" },
      { status: 409 }
    )
  }

  const product = await prisma.product.create({
    data: {
      barcode: data.barcode,
      name: data.name,
      category: data.category,
      purchasePrice: data.purchasePrice,
      retailPrice: data.retailPrice,
      wholesalePrice: data.wholesalePrice ?? null,
      wholesaleMinQty: data.wholesaleMinQty,
      stock: data.stock,
      minStock: data.minStock,
      unit: data.unit,
      supplierId: data.supplierId ?? null,
      isActive: data.isActive,
      imageUrl: data.imageUrl ?? null,
    },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
    },
  })

  return NextResponse.json(product, { status: 201 })
}
