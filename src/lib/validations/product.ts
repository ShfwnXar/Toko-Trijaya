import { z } from "zod"

export const createProductSchema = z.object({
  barcode: z.string().min(1, "Barcode wajib diisi").max(50, "Barcode maksimal 50 karakter"),
  name: z.string().min(1, "Nama produk wajib diisi").max(255, "Nama maksimal 255 karakter"),
  category: z.string().min(1, "Kategori wajib diisi").max(100, "Kategori maksimal 100 karakter"),
  purchasePrice: z.number().positive("Harga beli harus lebih dari 0"),
  retailPrice: z.number().positive("Harga eceran harus lebih dari 0"),
  wholesalePrice: z.number().positive("Harga grosir harus lebih dari 0").optional().nullable(),
  wholesaleMinQty: z.number().int().min(1, "Minimal qty grosir harus >= 1").optional().default(12),
  stock: z.number().int().min(0, "Stok tidak boleh negatif").optional().default(0),
  minStock: z.number().int().min(0, "Minimal stok tidak boleh negatif").optional().default(10),
  unit: z.string().min(1, "Unit wajib diisi").max(20, "Unit maksimal 20 karakter").optional().default("pcs"),
  supplierId: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
  imageUrl: z.string().max(500, "URL gambar maksimal 500 karakter").optional().nullable(),
}).refine(
  (data) => data.retailPrice > data.purchasePrice,
  { message: "Harga eceran harus lebih besar dari harga beli", path: ["retailPrice"] }
).refine(
  (data) => !data.wholesalePrice || data.wholesalePrice > data.purchasePrice,
  { message: "Harga grosir harus lebih besar dari harga beli", path: ["wholesalePrice"] }
)

export const updateProductSchema = z.object({
  barcode: z.string().min(1, "Barcode wajib diisi").max(50, "Barcode maksimal 50 karakter").optional(),
  name: z.string().min(1, "Nama produk wajib diisi").max(255, "Nama maksimal 255 karakter").optional(),
  category: z.string().min(1, "Kategori wajib diisi").max(100, "Kategori maksimal 100 karakter").optional(),
  purchasePrice: z.number().positive("Harga beli harus lebih dari 0").optional(),
  retailPrice: z.number().positive("Harga eceran harus lebih dari 0").optional(),
  wholesalePrice: z.number().positive("Harga grosir harus lebih dari 0").optional().nullable(),
  wholesaleMinQty: z.number().int().min(1, "Minimal qty grosir harus >= 1").optional(),
  stock: z.number().int().min(0, "Stok tidak boleh negatif").optional(),
  minStock: z.number().int().min(0, "Minimal stok tidak boleh negatif").optional(),
  unit: z.string().min(1, "Unit wajib diisi").max(20, "Unit maksimal 20 karakter").optional(),
  supplierId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  imageUrl: z.string().max(500, "URL gambar maksimal 500 karakter").optional().nullable(),
}).refine(
  (data) => {
    if (data.retailPrice !== undefined && data.purchasePrice !== undefined) {
      return data.retailPrice > data.purchasePrice
    }
    return true
  },
  { message: "Harga eceran harus lebih besar dari harga beli", path: ["retailPrice"] }
).refine(
  (data) => {
    if (data.wholesalePrice !== undefined && data.wholesalePrice !== null && data.purchasePrice !== undefined) {
      return data.wholesalePrice > data.purchasePrice
    }
    return true
  },
  { message: "Harga grosir harus lebih besar dari harga beli", path: ["wholesalePrice"] }
)

export type CreateProductInput = z.infer<typeof createProductSchema>
export type UpdateProductInput = z.infer<typeof updateProductSchema>
