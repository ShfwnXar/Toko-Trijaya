import { z } from "zod"

export const createUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  role: z.enum(["ADMIN", "KASIR", "GUDANG"], {
    errorMap: () => ({ message: "Role harus ADMIN, KASIR, atau GUDANG" }),
  }),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
