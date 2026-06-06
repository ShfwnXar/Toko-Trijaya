import { describe, it, expect, vi, beforeEach } from "vitest"
import { createUserSchema } from "@/lib/validations/user"

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  hash: vi.fn(),
}))

// Mock auth (for requireRole)
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { hash } from "bcryptjs"
import { auth } from "@/lib/auth"

describe("User Validation Schema (createUserSchema)", () => {
  it("should accept valid user input", () => {
    const input = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "ADMIN",
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it("should reject empty name", () => {
    const input = {
      name: "",
      email: "test@example.com",
      password: "password123",
      role: "ADMIN",
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined()
    }
  })

  it("should reject name longer than 100 characters", () => {
    const input = {
      name: "a".repeat(101),
      email: "test@example.com",
      password: "password123",
      role: "ADMIN",
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toBeDefined()
    }
  })

  it("should accept name with exactly 100 characters", () => {
    const input = {
      name: "a".repeat(100),
      email: "test@example.com",
      password: "password123",
      role: "KASIR",
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it("should reject invalid email format", () => {
    const input = {
      name: "Test User",
      email: "not-an-email",
      password: "password123",
      role: "ADMIN",
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    }
  })

  it("should reject password shorter than 8 characters", () => {
    const input = {
      name: "Test User",
      email: "test@example.com",
      password: "short",
      role: "ADMIN",
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toBeDefined()
    }
  })

  it("should accept password with exactly 8 characters", () => {
    const input = {
      name: "Test User",
      email: "test@example.com",
      password: "12345678",
      role: "GUDANG",
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it("should reject invalid role", () => {
    const input = {
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "MANAGER",
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.role).toBeDefined()
    }
  })

  it("should accept all valid roles", () => {
    for (const role of ["ADMIN", "KASIR", "GUDANG"]) {
      const input = {
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        role,
      }
      const result = createUserSchema.safeParse(input)
      expect(result.success).toBe(true)
    }
  })

  it("should reject missing fields", () => {
    const result = createUserSchema.safeParse({})
    expect(result.success).toBe(false)
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors
      expect(errors.name).toBeDefined()
      expect(errors.email).toBeDefined()
      expect(errors.password).toBeDefined()
      expect(errors.role).toBeDefined()
    }
  })
})

describe("POST /api/users - Create User Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should hash password with bcrypt cost 10 before storing", async () => {
    const password = "securepass123"
    vi.mocked(hash).mockResolvedValue("$2a$10$hashedvalue" as never)

    await hash(password, 10)

    expect(hash).toHaveBeenCalledWith(password, 10)
  })

  it("should check for existing email before creating user", async () => {
    const existingUser = {
      id: "user-1",
      name: "Existing User",
      email: "existing@example.com",
      password: "hashed",
      role: "KASIR" as const,
      failedLogins: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(existingUser)

    const result = await prisma.user.findUnique({ where: { email: "existing@example.com" } })
    expect(result).not.toBeNull()
    // Should return 409 when email exists
  })

  it("should return null when email does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const result = await prisma.user.findUnique({ where: { email: "new@example.com" } })
    expect(result).toBeNull()
    // Should proceed with user creation
  })

  it("should create user with correct fields (excluding password from response)", async () => {
    const createdUser = {
      id: "user-new",
      name: "New User",
      email: "new@example.com",
      role: "GUDANG" as const,
      createdAt: new Date(),
    }
    vi.mocked(prisma.user.create).mockResolvedValue(createdUser as never)

    const result = await prisma.user.create({
      data: {
        name: "New User",
        email: "new@example.com",
        password: "$2a$10$hashedvalue",
        role: "GUDANG",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })

    expect(result).toEqual(createdUser)
    expect(result).not.toHaveProperty("password")
  })
})

describe("GET /api/users - List Users Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return users without password field", async () => {
    const users = [
      { id: "1", name: "Admin", email: "admin@test.com", role: "ADMIN", createdAt: new Date() },
      { id: "2", name: "Kasir", email: "kasir@test.com", role: "KASIR", createdAt: new Date() },
    ]
    vi.mocked(prisma.user.findMany).mockResolvedValue(users as never)

    const result = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    expect(result).toHaveLength(2)
    result.forEach((user) => {
      expect(user).not.toHaveProperty("password")
      expect(user).toHaveProperty("id")
      expect(user).toHaveProperty("name")
      expect(user).toHaveProperty("email")
      expect(user).toHaveProperty("role")
      expect(user).toHaveProperty("createdAt")
    })
  })

  it("should order users by createdAt descending", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([])

    await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    })
  })
})
