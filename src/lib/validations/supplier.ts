import { z } from "zod"

export const createSupplierSchema = z.object({
  name: z
    .string()
    .min(1, "Nama supplier wajib diisi")
    .max(255, "Nama maksimal 255 karakter"),
  phone: z
    .string()
    .max(20, "Nomor telepon maksimal 20 karakter")
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, "Alamat maksimal 500 karakter")
    .optional()
    .nullable(),
})

export const updateSupplierSchema = z.object({
  name: z
    .string()
    .min(1, "Nama supplier wajib diisi")
    .max(255, "Nama maksimal 255 karakter")
    .optional(),
  phone: z
    .string()
    .max(20, "Nomor telepon maksimal 20 karakter")
    .optional()
    .nullable(),
  address: z
    .string()
    .max(500, "Alamat maksimal 500 karakter")
    .optional()
    .nullable(),
})

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>
