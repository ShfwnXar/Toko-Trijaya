import { prisma } from "@/lib/prisma"

const LOCKOUT_DURATION_MS = 15 * 60 * 1000 // 15 minutes
const MAX_FAILED_ATTEMPTS = 5

export interface LockoutStatus {
  isLocked: boolean
  remainingMinutes: number
}

/**
 * Check if a user account is currently locked out based on email.
 * Returns lockout status and remaining minutes if locked.
 */
export async function checkLockout(email: string): Promise<LockoutStatus> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { failedLogins: true, lockedUntil: true },
  })

  if (!user) {
    return { isLocked: false, remainingMinutes: 0 }
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMs = user.lockedUntil.getTime() - Date.now()
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
    return { isLocked: true, remainingMinutes }
  }

  return { isLocked: false, remainingMinutes: 0 }
}

/**
 * Increment failed login attempts for a user.
 * If failed attempts reach MAX_FAILED_ATTEMPTS (5), lock the account for 15 minutes.
 */
export async function incrementFailedLogins(
  userId: string,
  currentFailedLogins: number
): Promise<{ failedLogins: number; isNowLocked: boolean }> {
  const failedLogins = currentFailedLogins + 1
  const updateData: { failedLogins: number; lockedUntil?: Date } = {
    failedLogins,
  }

  const isNowLocked = failedLogins >= MAX_FAILED_ATTEMPTS
  if (isNowLocked) {
    updateData.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS)
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  })

  return { failedLogins, isNowLocked }
}

/**
 * Reset failed login counter and clear lockout on successful authentication.
 */
export async function resetFailedLogins(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLogins: 0, lockedUntil: null },
  })
}
