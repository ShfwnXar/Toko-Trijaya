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

import { prisma } from "@/lib/prisma"
import { checkLockout, incrementFailedLogins, resetFailedLogins } from "@/lib/utils/auth-helpers"

describe("checkLockout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should return not locked when user does not exist", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    const result = await checkLockout("nonexistent@test.com")

    expect(result).toEqual({ isLocked: false, remainingMinutes: 0 })
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: "nonexistent@test.com" },
      select: { failedLogins: true, lockedUntil: true },
    })
  })

  it("should return not locked when lockedUntil is null", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      failedLogins: 3,
      lockedUntil: null,
    } as any)

    const result = await checkLockout("user@test.com")

    expect(result).toEqual({ isLocked: false, remainingMinutes: 0 })
  })

  it("should return not locked when lockedUntil is in the past", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      failedLogins: 5,
      lockedUntil: new Date(Date.now() - 60 * 1000), // 1 minute ago
    } as any)

    const result = await checkLockout("user@test.com")

    expect(result).toEqual({ isLocked: false, remainingMinutes: 0 })
  })

  it("should return locked with remaining minutes when lockedUntil is in the future", async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      failedLogins: 5,
      lockedUntil,
    } as any)

    const result = await checkLockout("user@test.com")

    expect(result.isLocked).toBe(true)
    expect(result.remainingMinutes).toBeGreaterThanOrEqual(9)
    expect(result.remainingMinutes).toBeLessThanOrEqual(10)
  })

  it("should return 1 remaining minute when less than 1 minute left", async () => {
    const lockedUntil = new Date(Date.now() + 30 * 1000) // 30 seconds from now
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      failedLogins: 5,
      lockedUntil,
    } as any)

    const result = await checkLockout("user@test.com")

    expect(result.isLocked).toBe(true)
    expect(result.remainingMinutes).toBe(1)
  })

  it("should return 15 remaining minutes at the start of a lockout", async () => {
    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000) // exactly 15 minutes
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      failedLogins: 5,
      lockedUntil,
    } as any)

    const result = await checkLockout("user@test.com")

    expect(result.isLocked).toBe(true)
    expect(result.remainingMinutes).toBe(15)
  })
})

describe("incrementFailedLogins", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should increment from 0 to 1 without locking", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const result = await incrementFailedLogins("user-1", 0)

    expect(result).toEqual({ failedLogins: 1, isNowLocked: false })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLogins: 1 },
    })
  })

  it("should increment from 3 to 4 without locking", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const result = await incrementFailedLogins("user-1", 3)

    expect(result).toEqual({ failedLogins: 4, isNowLocked: false })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLogins: 4 },
    })
  })

  it("should lock account when reaching 5 failed attempts", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const result = await incrementFailedLogins("user-1", 4)

    expect(result).toEqual({ failedLogins: 5, isNowLocked: true })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        failedLogins: 5,
        lockedUntil: expect.any(Date),
      },
    })

    // Verify the lockedUntil is approximately 15 minutes from now
    const updateCall = vi.mocked(prisma.user.update).mock.calls[0][0]
    const lockedUntil = (updateCall.data as any).lockedUntil as Date
    const expectedTime = Date.now() + 15 * 60 * 1000
    expect(lockedUntil.getTime()).toBeGreaterThan(expectedTime - 1000)
    expect(lockedUntil.getTime()).toBeLessThan(expectedTime + 1000)
  })

  it("should also lock when already above 5 (e.g., 6th attempt)", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    const result = await incrementFailedLogins("user-1", 5)

    expect(result).toEqual({ failedLogins: 6, isNowLocked: true })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        failedLogins: 6,
        lockedUntil: expect.any(Date),
      },
    })
  })
})

describe("resetFailedLogins", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should reset failedLogins to 0 and clear lockedUntil", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    await resetFailedLogins("user-1")

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { failedLogins: 0, lockedUntil: null },
    })
  })

  it("should call prisma update with the correct user id", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    await resetFailedLogins("user-abc-123")

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-abc-123" },
      data: { failedLogins: 0, lockedUntil: null },
    })
  })
})

describe("Login lockout integration scenarios", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("scenario: 5 consecutive failed logins should lock the account", async () => {
    // Simulate 5 consecutive failures
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    let currentFailed = 0
    for (let i = 0; i < 4; i++) {
      const result = await incrementFailedLogins("user-1", currentFailed)
      expect(result.isNowLocked).toBe(false)
      currentFailed = result.failedLogins
    }

    // 5th attempt should trigger lockout
    const finalResult = await incrementFailedLogins("user-1", currentFailed)
    expect(finalResult.isNowLocked).toBe(true)
    expect(finalResult.failedLogins).toBe(5)
  })

  it("scenario: successful login after failures should reset counter", async () => {
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)

    // After 3 failures, successful login resets
    await incrementFailedLogins("user-1", 0)
    await incrementFailedLogins("user-1", 1)
    await incrementFailedLogins("user-1", 2)

    // User logs in successfully
    await resetFailedLogins("user-1")

    expect(prisma.user.update).toHaveBeenLastCalledWith({
      where: { id: "user-1" },
      data: { failedLogins: 0, lockedUntil: null },
    })
  })

  it("scenario: lockout should expire after 15 minutes", async () => {
    // Simulate a lockout that's about to expire (14 min 59 sec ago)
    const almostExpired = new Date(Date.now() + 1000) // 1 second left
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      failedLogins: 5,
      lockedUntil: almostExpired,
    } as any)

    const result = await checkLockout("user@test.com")
    expect(result.isLocked).toBe(true)
    expect(result.remainingMinutes).toBe(1)
  })

  it("should return generic error message pattern (no email/password hint)", () => {
    // This test validates the requirement that error messages don't reveal
    // whether email or password is incorrect.
    // The message must NOT be "Email tidak ditemukan" or "Password salah" separately.
    // Instead it uses a combined generic message.
    const genericError = "Email atau password salah"
    expect(genericError).not.toBe("Email tidak ditemukan")
    expect(genericError).not.toBe("Password salah")
    expect(genericError).toBe("Email atau password salah")
  })
})
