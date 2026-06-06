/**
 * Stock Manager Utility Functions for Toko Grosir Tri Jaya POS
 *
 * Provides atomic stock operations:
 * - deductStock: decrement stock within optional Prisma transaction
 * - restockProduct: validate and increment stock + create StockLog(IN)
 * - restoreStock: for void — restore stock for all items in a transaction
 * - getLowStockProducts: return products where stock <= minStock
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 11.1, 11.2, 11.3
 */

import { prisma } from "@/lib/prisma"
import { PrismaClient } from "@prisma/client"

// Type for Prisma transaction client
type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

/**
 * Deduct stock for a product. Can be called within an existing Prisma transaction.
 *
 * @param productId - The product to deduct stock from
 * @param quantity - Amount to deduct (must be positive)
 * @param reference - Reference string (e.g., invoice number)
 * @param userId - The authenticated user performing the operation
 * @param tx - Optional Prisma transaction client
 *
 * Requirements: 5.1, 5.4, 5.7
 */
export async function deductStock(
  productId: string,
  quantity: number,
  reference: string,
  userId: string,
  tx?: PrismaTransactionClient
): Promise<void> {
  const client = tx || prisma

  // Fetch current stock
  const product = await client.product.findUnique({
    where: { id: productId },
    select: { id: true, stock: true, name: true },
  })

  if (!product) {
    throw new Error(`Produk dengan ID ${productId} tidak ditemukan`)
  }

  if (product.stock < quantity) {
    throw new Error(
      `Stok tidak cukup untuk "${product.name}". Tersedia: ${product.stock}, diminta: ${quantity}`
    )
  }

  // Decrement stock
  await client.product.update({
    where: { id: productId },
    data: { stock: { decrement: quantity } },
  })

  // Create StockLog entry (type OUT)
  await client.stockLog.create({
    data: {
      productId,
      type: "OUT",
      quantity,
      reference,
      userId,
    },
  })
}

/**
 * Restock a product — validate quantity and atomically increment stock + create StockLog(IN).
 *
 * @param productId - The product to restock
 * @param quantity - Amount to add (1–99999)
 * @param supplierId - The supplier providing the stock
 * @param userId - The authenticated user performing the restock
 *
 * Requirements: 5.2, 5.3, 5.8
 */
export async function restockProduct(
  productId: string,
  quantity: number,
  supplierId: string,
  userId: string
): Promise<void> {
  // Validate quantity bounds
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99999) {
    throw new Error("Jumlah restock harus bilangan bulat antara 1 dan 99.999")
  }

  // Validate product exists and is active
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, isActive: true, name: true },
  })

  if (!product) {
    throw new Error("Produk tidak ditemukan")
  }

  if (!product.isActive) {
    throw new Error("Produk tidak aktif")
  }

  // Validate supplier exists
  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: { id: true },
  })

  if (!supplier) {
    throw new Error("Supplier tidak ditemukan")
  }

  // Atomically increment stock and create log
  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: { stock: { increment: quantity } },
    })

    await tx.stockLog.create({
      data: {
        productId,
        type: "IN",
        quantity,
        reference: supplierId,
        userId,
      },
    })
  })
}

/**
 * Restore stock for a voided transaction.
 * Fetches all items in the transaction, increments stock for each, creates StockLog(IN).
 *
 * @param transactionId - The transaction being voided
 * @param userId - The admin performing the void
 *
 * Requirements: 11.1, 11.2, 11.3
 */
export async function restoreStock(
  transactionId: string,
  userId: string
): Promise<void> {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      items: {
        select: { productId: true, quantity: true },
      },
    },
  })

  if (!transaction) {
    throw new Error("Transaksi tidak ditemukan")
  }

  await prisma.$transaction(async (tx) => {
    for (const item of transaction.items) {
      // Increment stock
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      })

      // Create StockLog(IN) with voided invoice reference
      await tx.stockLog.create({
        data: {
          productId: item.productId,
          type: "IN",
          quantity: item.quantity,
          reference: `VOID:${transaction.invoiceNumber}`,
          userId,
        },
      })
    }
  })
}

/**
 * Get products where stock <= minStock, sorted by stock ascending.
 * Uses $queryRawUnsafe + then fetches full products because Prisma doesn't support
 * column-to-column comparison directly. We use a two-step approach:
 * 1. Get IDs of low-stock products via raw SQL
 * 2. Fetch full product data with Prisma
 *
 * Requirements: 5.5, 5.6
 */
export async function getLowStockProducts() {
  const lowStockIds = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Product"
    WHERE "isActive" = true AND "stock" <= "minStock"
    ORDER BY "stock" ASC
  `

  if (lowStockIds.length === 0) return []

  const ids = lowStockIds.map((row) => row.id)

  return prisma.product.findMany({
    where: {
      id: { in: ids },
    },
    orderBy: { stock: "asc" },
    include: {
      supplier: {
        select: { id: true, name: true },
      },
    },
  })
}
