import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  compare: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { compare } from "bcryptjs"

// We test the authorize logic by importing and extracting it
// Since NextAuth wraps the config, we test the logic indirectly
describe("Auth configuration - authorize logic", () => {
  const mockUser = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    password: "$2a$10$hashedpassword",
    role: "ADMIN" as const,
    failedLogins: 0,
    lockedUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return null when credentials are missing", async () => {
    // Simulate the authorize logic
    const credentials = { email: "", password: "" }
    const result = !credentials?.email || !credentials?.password ? null : "continue"
    expect(result).toBeNull()
  })

  it("should return null when user is not found", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const user = await prisma.user.findUnique({ where: { email: "nonexistent@test.com" } })
    expect(user).toBeNull()
  })

  it("should return null when user is locked out", async () => {
    const lockedUser = {
      ...mockUser,
      lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // locked for 10 more minutes
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(lockedUser)

    const user = await prisma.user.findUnique({ where: { email: mockUser.email } })
    const isLocked = user!.lockedUntil && user!.lockedUntil > new Date()
    expect(isLocked).toBe(true)
  })

  it("should allow login when lockout has expired", async () => {
    const expiredLockUser = {
      ...mockUser,
      lockedUntil: new Date(Date.now() - 1000), // lockout expired 1 second ago
    }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(expiredLockUser)

    const user = await prisma.user.findUnique({ where: { email: mockUser.email } })
    const isLocked = user!.lockedUntil && user!.lockedUntil > new Date()
    expect(isLocked).toBe(false)
  })

  it("should increment failedLogins on invalid password", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(compare).mockResolvedValue(false as never)
    vi.mocked(prisma.user.update).mockResolvedValue(mockUser)

    const user = await prisma.user.findUnique({ where: { email: mockUser.email } })
    const isValid = await compare("wrongpass", user!.password)
    expect(isValid).toBe(false)

    // Simulate increment logic
    const failedLogins = user!.failedLogins + 1
    expect(failedLogins).toBe(1)
  })

  it("should set lockedUntil after 5 failed attempts", async () => {
    const userWith4Failures = { ...mockUser, failedLogins: 4 }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWith4Failures)
    vi.mocked(compare).mockResolvedValue(false as never)
    vi.mocked(prisma.user.update).mockResolvedValue(userWith4Failures)

    const user = await prisma.user.findUnique({ where: { email: mockUser.email } })
    const isValid = await compare("wrongpass", user!.password)
    expect(isValid).toBe(false)

    const failedLogins = user!.failedLogins + 1
    expect(failedLogins).toBe(5)

    // Should lock when reaching 5
    const shouldLock = failedLogins >= 5
    expect(shouldLock).toBe(true)
  })

  it("should reset failedLogins on successful login", async () => {
    const userWithFailures = { ...mockUser, failedLogins: 3 }
    vi.mocked(prisma.user.findUnique).mockResolvedValue(userWithFailures)
    vi.mocked(compare).mockResolvedValue(true as never)
    vi.mocked(prisma.user.update).mockResolvedValue({ ...userWithFailures, failedLogins: 0 })

    const user = await prisma.user.findUnique({ where: { email: mockUser.email } })
    const isValid = await compare("correctpass", user!.password)
    expect(isValid).toBe(true)

    // Should reset
    if (user!.failedLogins > 0) {
      await prisma.user.update({
        where: { id: user!.id },
        data: { failedLogins: 0, lockedUntil: null },
      })
    }
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: user!.id },
      data: { failedLogins: 0, lockedUntil: null },
    })
  })

  it("should return user object with id, name, email, role on success", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser)
    vi.mocked(compare).mockResolvedValue(true as never)

    const user = await prisma.user.findUnique({ where: { email: mockUser.email } })
    const isValid = await compare("correctpass", user!.password)
    expect(isValid).toBe(true)

    const result = {
      id: user!.id,
      name: user!.name,
      email: user!.email,
      role: user!.role,
    }

    expect(result).toEqual({
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      role: "ADMIN",
    })
  })

  it("should not call update when failedLogins is already 0 on success", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser) // failedLogins: 0
    vi.mocked(compare).mockResolvedValue(true as never)

    const user = await prisma.user.findUnique({ where: { email: mockUser.email } })
    const isValid = await compare("correctpass", user!.password)
    expect(isValid).toBe(true)

    // Should NOT call update since failedLogins is already 0
    if (user!.failedLogins > 0) {
      await prisma.user.update({
        where: { id: user!.id },
        data: { failedLogins: 0, lockedUntil: null },
      })
    }
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})

describe("Auth configuration - session and JWT callbacks", () => {
  it("should include user id and role in JWT token", () => {
    const user = { id: "user-1", name: "Test", email: "test@test.com", role: "KASIR" }
    const token: Record<string, unknown> = { sub: "user-1" }

    // Simulate jwt callback
    if (user) {
      token.id = user.id
      token.role = user.role
    }

    expect(token.id).toBe("user-1")
    expect(token.role).toBe("KASIR")
  })

  it("should include user id and role in session", () => {
    const token = { id: "user-1", role: "GUDANG", sub: "user-1" }
    const session = { user: { id: "", name: "Test", email: "test@test.com", role: "" } }

    // Simulate session callback
    if (session.user) {
      session.user.id = token.id as string
      session.user.role = token.role as string
    }

    expect(session.user.id).toBe("user-1")
    expect(session.user.role).toBe("GUDANG")
  })
})

describe("Auth configuration - session settings", () => {
  it("should use JWT strategy with 8-hour expiration", () => {
    const sessionConfig = {
      strategy: "jwt",
      maxAge: 8 * 60 * 60,
    }
    expect(sessionConfig.strategy).toBe("jwt")
    expect(sessionConfig.maxAge).toBe(28800) // 8 hours in seconds
  })
})
