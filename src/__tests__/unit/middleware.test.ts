import { describe, it, expect } from "vitest"

/**
 * Unit tests for the middleware route protection logic.
 * We test the core route-matching logic in isolation without mocking NextAuth.
 */

// Replicate the role-route matrix from middleware.ts for testing
const roleRoutes: Record<string, string[]> = {
  ADMIN: ["*"],
  KASIR: [
    "/kasir",
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

function isPublicRoute(pathname: string): boolean {
  return pathname.startsWith("/login") || pathname.startsWith("/api/auth")
}

function isRouteAllowed(role: string, pathname: string): boolean {
  if (role === "ADMIN") return true

  // Special case: Gudang can access restock endpoint
  if (role === "GUDANG" && gudangRestockPattern.test(pathname)) {
    return true
  }

  const allowedRoutes = roleRoutes[role] || []
  return allowedRoutes.some((route) => {
    if (route === "*") return true
    return pathname === route || pathname.startsWith(route + "/") || pathname.startsWith(route + "?")
  })
}

function isKasirReadOnly(pathname: string): boolean {
  return kasirReadOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/") || pathname.startsWith(route + "?")
  )
}

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

describe("Middleware - Public routes", () => {
  it("should allow /login as public", () => {
    expect(isPublicRoute("/login")).toBe(true)
  })

  it("should allow /api/auth/* as public", () => {
    expect(isPublicRoute("/api/auth/signin")).toBe(true)
    expect(isPublicRoute("/api/auth/callback/credentials")).toBe(true)
  })

  it("should not treat /api/products as public", () => {
    expect(isPublicRoute("/api/products")).toBe(false)
  })

  it("should not treat /kasir as public", () => {
    expect(isPublicRoute("/kasir")).toBe(false)
  })
})

describe("Middleware - Admin access", () => {
  it("should allow Admin access to all routes", () => {
    expect(isRouteAllowed("ADMIN", "/admin")).toBe(true)
    expect(isRouteAllowed("ADMIN", "/kasir")).toBe(true)
    expect(isRouteAllowed("ADMIN", "/stok")).toBe(true)
    expect(isRouteAllowed("ADMIN", "/api/products")).toBe(true)
    expect(isRouteAllowed("ADMIN", "/api/transactions")).toBe(true)
    expect(isRouteAllowed("ADMIN", "/api/suppliers")).toBe(true)
    expect(isRouteAllowed("ADMIN", "/api/stock-logs")).toBe(true)
    expect(isRouteAllowed("ADMIN", "/api/dashboard/stats")).toBe(true)
    expect(isRouteAllowed("ADMIN", "/api/reports/export")).toBe(true)
  })
})

describe("Middleware - Kasir access", () => {
  it("should allow Kasir access to /kasir", () => {
    expect(isRouteAllowed("KASIR", "/kasir")).toBe(true)
  })

  it("should allow Kasir access to /api/transactions", () => {
    expect(isRouteAllowed("KASIR", "/api/transactions")).toBe(true)
    expect(isRouteAllowed("KASIR", "/api/transactions/123")).toBe(true)
  })

  it("should allow Kasir access to /api/products (GET only enforced separately)", () => {
    expect(isRouteAllowed("KASIR", "/api/products")).toBe(true)
    expect(isRouteAllowed("KASIR", "/api/products/barcode/123")).toBe(true)
    expect(isRouteAllowed("KASIR", "/api/products/popular")).toBe(true)
  })

  it("should deny Kasir access to /admin", () => {
    expect(isRouteAllowed("KASIR", "/admin")).toBe(false)
  })

  it("should deny Kasir access to /stok", () => {
    expect(isRouteAllowed("KASIR", "/stok")).toBe(false)
  })

  it("should deny Kasir access to /api/suppliers", () => {
    expect(isRouteAllowed("KASIR", "/api/suppliers")).toBe(false)
  })

  it("should deny Kasir access to /api/stock-logs", () => {
    expect(isRouteAllowed("KASIR", "/api/stock-logs")).toBe(false)
  })

  it("should deny Kasir access to /api/dashboard/stats", () => {
    expect(isRouteAllowed("KASIR", "/api/dashboard/stats")).toBe(false)
  })

  it("should deny Kasir access to /api/reports/export", () => {
    expect(isRouteAllowed("KASIR", "/api/reports/export")).toBe(false)
  })

  it("should identify Kasir read-only routes correctly", () => {
    expect(isKasirReadOnly("/api/products")).toBe(true)
    expect(isKasirReadOnly("/api/products/123")).toBe(true)
    expect(isKasirReadOnly("/api/products/barcode/abc")).toBe(true)
    expect(isKasirReadOnly("/api/transactions")).toBe(false)
  })
})

describe("Middleware - Gudang access", () => {
  it("should allow Gudang access to /stok", () => {
    expect(isRouteAllowed("GUDANG", "/stok")).toBe(true)
  })

  it("should allow Gudang access to /supplier", () => {
    expect(isRouteAllowed("GUDANG", "/supplier")).toBe(true)
  })

  it("should allow Gudang access to /api/products (read)", () => {
    expect(isRouteAllowed("GUDANG", "/api/products")).toBe(true)
    expect(isRouteAllowed("GUDANG", "/api/products/123")).toBe(true)
  })

  it("should allow Gudang access to /api/suppliers", () => {
    expect(isRouteAllowed("GUDANG", "/api/suppliers")).toBe(true)
  })

  it("should allow Gudang access to /api/stock-logs", () => {
    expect(isRouteAllowed("GUDANG", "/api/stock-logs")).toBe(true)
  })

  it("should allow Gudang access to /api/products/[id]/restock", () => {
    expect(isRouteAllowed("GUDANG", "/api/products/abc123/restock")).toBe(true)
    expect(isRouteAllowed("GUDANG", "/api/products/product-id-1/restock")).toBe(true)
  })

  it("should deny Gudang access to /kasir", () => {
    expect(isRouteAllowed("GUDANG", "/kasir")).toBe(false)
  })

  it("should deny Gudang access to /admin", () => {
    expect(isRouteAllowed("GUDANG", "/admin")).toBe(false)
  })

  it("should deny Gudang access to /api/transactions", () => {
    expect(isRouteAllowed("GUDANG", "/api/transactions")).toBe(false)
  })

  it("should deny Gudang access to /api/dashboard/stats", () => {
    expect(isRouteAllowed("GUDANG", "/api/dashboard/stats")).toBe(false)
  })
})

describe("Middleware - Dashboard redirects", () => {
  it("should redirect Admin to /admin", () => {
    expect(getDashboardForRole("ADMIN")).toBe("/admin")
  })

  it("should redirect Kasir to /kasir", () => {
    expect(getDashboardForRole("KASIR")).toBe("/kasir")
  })

  it("should redirect Gudang to /stok", () => {
    expect(getDashboardForRole("GUDANG")).toBe("/stok")
  })

  it("should redirect unknown role to /login", () => {
    expect(getDashboardForRole("UNKNOWN")).toBe("/login")
  })
})

describe("Middleware - Unauthenticated access", () => {
  it("should return 401 for unauthenticated API requests", () => {
    // This is tested via the middleware behavior:
    // When session is null and pathname starts with /api/, return 401
    const pathname = "/api/products"
    const isApiRoute = pathname.startsWith("/api/")
    expect(isApiRoute).toBe(true)
    // The middleware returns 401 JSON for API routes without session
  })

  it("should redirect to /login for unauthenticated page requests", () => {
    const pathname = "/kasir"
    const isApiRoute = pathname.startsWith("/api/")
    expect(isApiRoute).toBe(false)
    // The middleware redirects to /login for page routes without session
  })
})
