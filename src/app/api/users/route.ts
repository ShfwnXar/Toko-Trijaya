import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { requireRole } from "@/lib/utils/role-guard"
import { createUserSchema } from "@/lib/validations/user"

export async function GET() {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(users)
}

export async function POST(request: Request) {
  const { error } = await requireRole("ADMIN")
  if (error) return error

  const body = await request.json()
  const validation = createUserSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      { error: "Validation Error", details: validation.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const { name, email, password, role } = validation.data

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "Conflict", message: "Email sudah terdaftar" },
      { status: 409 }
    )
  }

  // Hash password with bcrypt cost factor 10
  const hashedPassword = await hash(password, 10)

  const user = await prisma.user.create({
    data: { name, email, password: hashedPassword, role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
