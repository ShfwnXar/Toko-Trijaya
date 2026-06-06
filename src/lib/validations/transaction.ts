import { z } from "zod"

export const checkoutItemSchema = z.object({
  productId: z.string().min(1, "Product ID wajib diisi"),
  quantity: z
    .number()
    .int("Jumlah harus bilangan bulat")
    .min(1, "Jumlah minimal 1")
    .max(9999, "Jumlah maksimal 9999"),
})

export const checkoutRequestSchema = z.object({
  items: z
    .array(checkoutItemSchema)
    .min(1, "Minimal 1 item dalam transaksi"),
  paymentMethod: z.enum(["CASH", "QRIS", "TRANSFER"], {
    errorMap: () => ({ message: "Metode pembayaran harus CASH, QRIS, atau TRANSFER" }),
  }),
  amountPaid: z
    .number()
    .min(0, "Jumlah bayar tidak boleh negatif"),
  customerPhone: z
    .string()
    .max(20, "Nomor telepon maksimal 20 karakter")
    .optional()
    .nullable(),
  customerName: z
    .string()
    .max(100, "Nama pelanggan maksimal 100 karakter")
    .optional()
    .nullable(),
  notes: z
    .string()
    .max(500, "Catatan maksimal 500 karakter")
    .optional()
    .nullable(),
})

export type CheckoutItem = z.infer<typeof checkoutItemSchema>
export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>
