import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"
import { updateProductSchema } from "@/lib/validations/product"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole("ADMIN", "KASIR", "GUDANG")
  if (error) return error

  const product = await prisma.product.findUnique({
    where: { id: params.id },
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

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  const body = await request.json()
  const validation = updateProductSchema.safeParse(body)

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

  // Check if product exists
  const existing = await prisma.product.findUnique({
    where: { id: params.id },
  })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Produk tidak ditemukan" },
      { status: 404 }
    )
  }

  // If updating barcode, check for duplicates (excluding current product)
  if (data.barcode && data.barcode !== existing.barcode) {
    const duplicateBarcode = await prisma.product.findUnique({
      where: { barcode: data.barcode },
    })
    if (duplicateBarcode) {
      return NextResponse.json(
        { error: "Conflict", message: "Barcode sudah digunakan oleh produk lain" },
        { status: 409 }
      )
    }
  }

  // Cross-field price validation with existing values
  const finalPurchasePrice = data.purchasePrice ?? Number(existing.purchasePrice)
  const finalRetailPrice = data.retailPrice ?? Number(existing.retailPrice)
  const finalWholesalePrice = data.wholesalePrice !== undefined
    ? data.wholesalePrice
    : (existing.wholesalePrice ? Number(existing.wholesalePrice) : null)

  if (finalRetailPrice <= finalPurchasePrice) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: "Data produk tidak valid",
        details: { retailPrice: ["Harga eceran harus lebih besar dari harga beli"] },
      },
      { status: 400 }
    )
  }

  if (finalWholesalePrice !== null && finalWholesalePrice !== undefined && finalWholesalePrice <= finalPurchasePrice) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: "Data produk tidak valid",
        details: { wholesalePrice: ["Harga grosir harus lebih besar dari harga beli"] },
      },
      { status: 400 }
    )
  }

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...(data.barcode !== undefined && { barcode: data.barcode }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.purchasePrice !== undefined && { purchasePrice: data.purchasePrice }),
      ...(data.retailPrice !== undefined && { retailPrice: data.retailPrice }),
      ...(data.wholesalePrice !== undefined && { wholesalePrice: data.wholesalePrice }),
      ...(data.wholesaleMinQty !== undefined && { wholesaleMinQty: data.wholesaleMinQty }),
      ...(data.stock !== undefined && { stock: data.stock }),
      ...(data.minStock !== undefined && { minStock: data.minStock }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.supplierId !== undefined && { supplierId: data.supplierId }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
    },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
    },
  })

  return NextResponse.json(product)
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  // Check if product exists
  const existing = await prisma.product.findUnique({
    where: { id: params.id },
  })
  if (!existing) {
    return NextResponse.json(
      { error: "Not Found", message: "Produk tidak ditemukan" },
      { status: 404 }
    )
  }

  // Soft-delete: set isActive to false
  const product = await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  return NextResponse.json({ message: "Produk berhasil dinonaktifkan", product })
}
