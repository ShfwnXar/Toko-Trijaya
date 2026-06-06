import { NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import type { NextRequest } from "next/server"

/**
 * Lightweight middleware that only reads JWT token (no Prisma/bcrypt import).
 * This keeps the Edge Function bundle small (< 1MB Vercel limit).
 */

const roleRoutes: Record<string, string[]> = {
  ADMIN: ["*"],
  KASIR: [
    "/kasir",
    "/transaksi",
    "/api/transactions",
    "/api/products",
  ],
  GUDANG: [
    "/stok",
    "/supplier",
    "/api/products",
    "/api/suppliers",
    "/api/stock-logs",
  ],
}

const kasirReadOnlyRoutes = ["/api/products"]
const gudangRestockPattern = /^\/api\/products\/[^/]+\/restock$/

function getDashboardForRole(role: string): string {
  switch (role) {
    case "ADMIN": return "/dashboard"
    case "KASIR": return "/kasir"
    case "GUDANG": return "/stok"
    default: return "/login"
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const method = req.method

  // Public routes
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Allow static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next()
  }

  // Get JWT token (lightweight, no DB call)
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || ""
  
  // Try with default cookie name first, then with secure prefix
  let token = await getToken({ req, secret })
  if (!token) {
    token = await getToken({ 
      req, 
      secret,
      cookieName: "__Secure-authjs.session-token"
    })
  }
  if (!token) {
    token = await getToken({ 
      req, 
      secret,
      cookieName: "authjs.session-token"
    })
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Autentikasi diperlukan" },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = token.role as string

  if (!role) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Role tidak ditemukan" },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // Admin has access to everything
  if (role === "ADMIN") return NextResponse.next()

  // Gudang special: restock endpoint
  if (role === "GUDANG" && gudangRestockPattern.test(pathname)) {
    return NextResponse.next()
  }

  // Check role-based access
  const allowedRoutes = roleRoutes[role] || []
  const isAllowed = allowedRoutes.some((route) => {
    if (route === "*") return true
    return pathname === route || pathname.startsWith(route + "/") || pathname.startsWith(route + "?")
  })

  if (!isAllowed) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Forbidden", message: "Akses ditolak" },
        { status: 403 }
      )
    }
    return NextResponse.redirect(new URL(getDashboardForRole(role), req.url))
  }

  // Kasir: read-only on product routes
  if (role === "KASIR") {
    const isReadOnlyRoute = kasirReadOnlyRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/")
    )
    if (isReadOnlyRoute && method !== "GET") {
      return NextResponse.json(
        { error: "Forbidden", message: "Akses ditolak" },
        { status: 403 }
      )
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
