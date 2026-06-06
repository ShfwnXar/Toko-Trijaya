import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

/**
 * Role-route access matrix.
 * Admin has access to all routes (wildcard "*").
 * Kasir has access to kasir pages and transaction/product-related APIs.
 * Gudang has access to stock/supplier pages and related APIs.
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

/**
 * Routes that Kasir can only access with GET method (read-only).
 * For example, Kasir can read products but not create/update/delete them.
 */
const kasirReadOnlyRoutes = ["/api/products"]

/**
 * Routes that Gudang can access for restock operations.
 * These require special pattern matching (wildcard segments).
 */
const gudangRestockPattern = /^\/api\/products\/[^/]+\/restock$/

/**
 * Determines the dashboard redirect path for a given role.
 */
function getDashboardForRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin"
    case "KASIR":
      return "/kasir"
    case "GUDANG":
      return "/stok"
    default:
      return "/login"
  }
}

export default auth((req) => {
  const { pathname } = req.nextUrl
  const method = req.method

  // Public routes - no auth needed
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  // Allow static assets and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next()
  }

  const session = req.auth

  // If no session, redirect to login for pages, 401 for API
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Autentikasi diperlukan" },
        { status: 401 }
      )
    }
    return NextResponse.redirect(new URL("/login", req.url))
  }

  const role = session.user?.role

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
  if (role === "ADMIN") {
    return NextResponse.next()
  }

  // Check role-based access for KASIR and GUDANG
  const allowedRoutes = roleRoutes[role] || []

  // Special case: Gudang can access restock endpoint
  if (role === "GUDANG" && gudangRestockPattern.test(pathname)) {
    return NextResponse.next()
  }

  // Check if the current route is allowed for this role
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
    // Redirect to appropriate dashboard for their role
    const redirectPath = getDashboardForRole(role)
    return NextResponse.redirect(new URL(redirectPath, req.url))
  }

  // For KASIR: enforce read-only on certain API routes
  if (role === "KASIR") {
    const isReadOnlyRoute = kasirReadOnlyRoutes.some(
      (route) => pathname === route || pathname.startsWith(route + "/") || pathname.startsWith(route + "?")
    )
    // Kasir can only use GET on product routes (except /api/transactions which allows POST)
    if (isReadOnlyRoute && method !== "GET") {
      // Exception: allow barcode lookup and popular products (these are GET-based)
      // But block POST/PUT/DELETE on /api/products
      return NextResponse.json(
        { error: "Forbidden", message: "Akses ditolak" },
        { status: 403 }
      )
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
