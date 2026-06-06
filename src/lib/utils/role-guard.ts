import { auth } from "@/lib/auth"
import { Role } from "@prisma/client"
import { NextResponse } from "next/server"
import { Session } from "next-auth"

export interface RoleCheckSuccess {
  error: null
  session: Session
}

export interface RoleCheckFailure {
  error: NextResponse
  session: null
}

export type RoleCheckResult = RoleCheckSuccess | RoleCheckFailure

/**
 * Checks that the current request has an authenticated session with one of the
 * specified roles. Returns a typed result with either the session or an error response.
 *
 * Usage in API route handlers:
 * ```typescript
 * const { error, session } = await requireRole("ADMIN", "GUDANG")
 * if (error) return error
 * // session is guaranteed to be non-null here
 * ```
 */
export async function requireRole(...roles: Role[]): Promise<RoleCheckResult> {
  const session = await auth()

  if (!session || !session.user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized", message: "Autentikasi diperlukan" },
        { status: 401 }
      ),
      session: null,
    }
  }

  const userRole = session.user.role as Role
  if (!roles.includes(userRole)) {
    return {
      error: NextResponse.json(
        { error: "Forbidden", message: "Akses ditolak" },
        { status: 403 }
      ),
      session: null,
    }
  }

  return { error: null, session }
}
