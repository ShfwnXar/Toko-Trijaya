import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"
import { checkoutRequestSchema } from "@/lib/validations/transaction"
import { calculateItemPrice } from "@/lib/utils/pricing"

/**
 * POST /api/transactions — Process checkout
 * Accessible by: Kasir, Admin
 *
 * Atomic Prisma transaction that:
 * 1. Validates products exist and are active
 * 2. Validates sufficient stock for all items
 * 3. Recalculates prices server-side
 * 4. Deducts stock
 * 5. Creates Transaction + TransactionItems + StockLogs
 * 6. Generates invoice number
 *
 * Requirements: 4.7, 4.8, 4.9, 4.10, 5.1, 5.4
 */
export async function POST(request: Request) {
  const { error, session } = await requireRole("KASIR", "ADMIN")
  if (error) return error

  const body = await request.json()
  const validation = checkoutRequestSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: "Data transaksi tidak valid",
        details: validation.error.flatten().fieldErrors,
      },
      { status: 400 }
    )
  }

  const data = validation.data
  const cashierId = session.user?.id as string

  try {
    // === VALIDATION PHASE (read-only, no transaction needed) ===

    // 1. Fetch all products by IDs
    const productIds = data.items.map((item) => item.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    // Check all products exist
    const foundIds = new Set(products.map((p) => p.id))
    const missingIds = productIds.filter((id) => !foundIds.has(id))
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: "Produk tidak ditemukan", message: "Produk tidak ditemukan", details: { missingProductIds: missingIds } },
        { status: 400 }
      )
    }

    // Check all products are active
    const inactiveProducts = products.filter((p) => !p.isActive)
    if (inactiveProducts.length > 0) {
      return NextResponse.json(
        { error: "Beberapa produk tidak aktif", message: "Beberapa produk tidak aktif", details: { inactiveProducts: inactiveProducts.map((p) => ({ id: p.id, name: p.name })) } },
        { status: 400 }
      )
    }

    // 2. Validate stock
    const insufficientStock: { productId: string; name: string; available: number; requested: number }[] = []
    const productMap = new Map(products.map((p) => [p.id, p]))

    for (const item of data.items) {
      const product = productMap.get(item.productId)!
      if (product.stock < item.quantity) {
        insufficientStock.push({
          productId: product.id,
          name: product.name,
          available: product.stock,
          requested: item.quantity,
        })
      }
    }

    if (insufficientStock.length > 0) {
      return NextResponse.json(
        { error: "Stok tidak cukup", message: "Stok tidak cukup", details: { insufficientStock } },
        { status: 422 }
      )
    }

    // 3. Recalculate prices server-side
    const pricedItems = data.items.map((item) => {
      const product = productMap.get(item.productId)!
      const pricing = calculateItemPrice(
        {
          retailPrice: Number(product.retailPrice),
          wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
          wholesaleMinQty: product.wholesaleMinQty,
          purchasePrice: Number(product.purchasePrice),
        },
        item.quantity
      )
      return { ...item, product, pricing }
    })

    const serverTotal = pricedItems.reduce((sum, item) => sum + item.pricing.lineTotal, 0)

    // 4. Validate payment
    if (data.paymentMethod === "CASH" && data.amountPaid < serverTotal) {
      return NextResponse.json(
        { error: "Nominal pembayaran kurang", message: `Nominal pembayaran kurang. Total: ${serverTotal}, Dibayar: ${data.amountPaid}`, details: { serverTotal, amountPaid: data.amountPaid } },
        { status: 422 }
      )
    }

    const amountPaid = data.paymentMethod === "CASH" ? data.amountPaid : serverTotal
    const changeAmount = data.paymentMethod === "CASH" ? amountPaid - serverTotal : 0

    // === WRITE PHASE (sequential, no interactive transaction) ===

    // 5. Generate invoice number
    const invoiceNumber = await generateInvoiceNumber()

    // 6. Calculate totals
    const totalProfit = pricedItems.reduce((sum, item) => {
      return sum + (item.pricing.unitPrice - Number(item.product.purchasePrice)) * item.quantity
    }, 0)
    const totalItems = pricedItems.reduce((sum, item) => sum + item.quantity, 0)

    // 7. Create Transaction record
    const transaction = await prisma.transaction.create({
      data: {
        invoiceNumber,
        totalAmount: serverTotal,
        totalItems,
        totalProfit,
        paymentMethod: data.paymentMethod,
        amountPaid,
        changeAmount,
        customerPhone: data.customerPhone ?? null,
        customerName: data.customerName ?? null,
        notes: data.notes ?? null,
        cashierId,
        status: "COMPLETED",
      },
    })

    // 8. Create TransactionItems + deduct stock + create StockLogs
    for (const item of pricedItems) {
      const profit = (item.pricing.unitPrice - Number(item.product.purchasePrice)) * item.quantity

      await prisma.transactionItem.create({
        data: {
          transactionId: transaction.id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.pricing.unitPrice,
          totalPrice: item.pricing.lineTotal,
          purchasePrice: Number(item.product.purchasePrice),
          profit,
          priceTier: item.pricing.priceTier,
        },
      })

      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })

      await prisma.stockLog.create({
        data: {
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          reference: invoiceNumber,
          userId: cashierId,
        },
      })
    }

    // 9. Fetch full transaction with relations for receipt
    const fullTransaction = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, barcode: true, unit: true, retailPrice: true } },
          },
        },
        cashier: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(
      {
        transaction: fullTransaction,
        invoiceNumber: fullTransaction!.invoiceNumber,
        receipt: {
          invoiceNumber: fullTransaction!.invoiceNumber,
          date: fullTransaction!.createdAt,
          cashier: fullTransaction!.cashier.name,
          items: fullTransaction!.items.map((item) => ({
            name: item.product.name,
            barcode: item.product.barcode,
            unit: item.product.unit,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            retailPrice: Number(item.product.retailPrice),
            totalPrice: Number(item.totalPrice),
            priceTier: item.priceTier,
          })),
          totalAmount: Number(fullTransaction!.totalAmount),
          totalItems: fullTransaction!.totalItems,
          paymentMethod: fullTransaction!.paymentMethod,
          amountPaid: Number(fullTransaction!.amountPaid),
          changeAmount: Number(fullTransaction!.changeAmount),
          customerName: fullTransaction!.customerName,
          customerPhone: fullTransaction!.customerPhone,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error("Checkout error:", err)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Terjadi kesalahan saat memproses transaksi" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/transactions — List transactions with date filter and pagination
 * Accessible by: Admin, Kasir
 */
export async function GET(request: NextRequest) {
  const { error } = await requireRole("ADMIN", "KASIR")
  if (error) return error

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10)))
  const from = searchParams.get("from")
  const to = searchParams.get("to")
  const status = searchParams.get("status")

  const skip = (page - 1) * pageSize

  const where: any = {}

  // Date range filter
  if (from || to) {
    where.createdAt = {}
    if (from) {
      where.createdAt.gte = new Date(from)
    }
    if (to) {
      // Set to end of the day
      const toDate = new Date(to)
      toDate.setHours(23, 59, 59, 999)
      where.createdAt.lte = toDate
    }
  }

  // Status filter
  if (status && (status === "COMPLETED" || status === "VOID")) {
    where.status = status
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        cashier: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, barcode: true },
            },
          },
        },
      },
    }),
    prisma.transaction.count({ where }),
  ])

  return NextResponse.json({
    data: transactions,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  })
}

/**
 * Generate Invoice Number: TRX-YYYYMMDD-XXXX
 * Query last transaction of today, extract counter, increment.
 * If none today, start at 0001.
 */
async function generateInvoiceNumber(): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  const dateStr = `${year}${month}${day}`
  const prefix = `TRX-${dateStr}-`

  const startOfDay = new Date(year, today.getMonth(), today.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(year, today.getMonth(), today.getDate(), 23, 59, 59, 999)

  const lastTransaction = await prisma.transaction.findFirst({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  })

  let counter = 1
  if (lastTransaction) {
    // Extract counter from TRX-20250715-0003 → 3
    const parts = lastTransaction.invoiceNumber.split("-")
    const lastCounter = parseInt(parts[2], 10)
    if (!isNaN(lastCounter)) {
      counter = lastCounter + 1
    }
  }

  if (counter > 9999) {
    throw new Error("Batas maksimal transaksi harian (9999) telah tercapai")
  }

  return `${prefix}${String(counter).padStart(4, "0")}`
}

/**
 * Custom error class for checkout-specific errors with status and details.
 */
class CheckoutError extends Error {
  status: number
  details: Record<string, any>

  constructor(message: string, status: number, details: Record<string, any> = {}) {
    super(message)
    this.name = "CheckoutError"
    this.status = status
    this.details = details
  }
}
