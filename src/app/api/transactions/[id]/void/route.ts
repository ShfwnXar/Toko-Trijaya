import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"
import { restoreStock } from "@/lib/utils/stock"

/**
 * PUT /api/transactions/[id]/void — Void a completed transaction
 * Accessible by: Admin only
 *
 * Within a Prisma transaction:
 * 1. Validate transaction exists and status is COMPLETED
 * 2. If already VOID, return 409 "Transaksi sudah divoid"
 * 3. Update status to VOID
 * 4. Call restoreStock(transactionId, userId) to restore stock + create StockLogs
 *
 * Returns updated transaction on success.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.6
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error, session } = await requireRole("ADMIN")
  if (error) return error

  const transactionId = params.id
  const userId = session.user?.id as string

  try {
    // 1. Fetch transaction and validate
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      select: { id: true, status: true, invoiceNumber: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: "Not Found", message: "Transaksi tidak ditemukan" },
        { status: 404 }
      )
    }

    // 2. Check if already voided
    if (transaction.status === "VOID") {
      return NextResponse.json(
        { error: "Conflict", message: "Transaksi sudah divoid" },
        { status: 409 }
      )
    }

    // 3. Check if status is COMPLETED (only COMPLETED can be voided)
    if (transaction.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Bad Request", message: "Hanya transaksi COMPLETED yang dapat divoid" },
        { status: 400 }
      )
    }

    // 4. Execute void within a single Prisma transaction (atomic)
    // Update status to VOID first
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: "VOID" },
    })

    // 5. Restore stock + create StockLog entries (restoreStock uses its own $transaction)
    await restoreStock(transactionId, userId)

    // 6. Fetch updated transaction with full data
    const updatedTransaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, barcode: true },
            },
          },
        },
        cashier: {
          select: { id: true, name: true },
        },
      },
    })

    return NextResponse.json({
      transaction: updatedTransaction,
      message: "Transaksi berhasil divoid",
    })
  } catch (err: any) {
    console.error("Void transaction error:", err)
    return NextResponse.json(
      { error: "Internal Server Error", message: "Terjadi kesalahan saat void transaksi" },
      { status: 500 }
    )
  }
}
