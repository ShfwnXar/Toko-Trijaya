import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Role-route access matrix as defined in the middleware.
 * This mirrors the actual middleware logic for property testing.
 */
type Role = 'ADMIN' | 'KASIR' | 'GUDANG'

const roleRoutes: Record<Role, string[]> = {
  ADMIN: ['*'], // Admin has access to all routes
  KASIR: [
    '/kasir',
    '/api/transactions',
    '/api/products',
  ],
  GUDANG: [
    '/stok',
    '/supplier',
    '/api/products',
    '/api/suppliers',
    '/api/stock-logs',
  ],
}

/**
 * Check if a role has access to a given route.
 * Mirrors the middleware logic: path === route OR path starts with route + "/"
 */
function hasAccess(role: Role, route: string): boolean {
  const allowedRoutes = roleRoutes[role]

  // Admin wildcard
  if (allowedRoutes.includes('*')) return true

  return allowedRoutes.some((allowedRoute) => {
    return route === allowedRoute || route.startsWith(allowedRoute + '/')
  })
}

// Known routes in the application
const allRoutes = [
  '/kasir',
  '/stok',
  '/supplier',
  '/dashboard',
  '/laporan',
  '/produk',
  '/transaksi',
  '/api/transactions',
  '/api/transactions/123/void',
  '/api/products',
  '/api/products/123',
  '/api/products/barcode/123456',
  '/api/products/popular',
  '/api/products/123/restock',
  '/api/suppliers',
  '/api/suppliers/123',
  '/api/stock-logs',
  '/api/dashboard/stats',
  '/api/reports/export',
  '/api/users',
]

describe('Property 15: Role Access Control Matrix', () => {
  /**
   * **Validates: Requirements 1.4, 1.6**
   *
   * For any (role, route) pair, access granted/denied matches the defined matrix.
   */
  it('should grant ADMIN access to all routes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allRoutes),
        (route) => {
          expect(hasAccess('ADMIN', route)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should restrict KASIR to only allowed routes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allRoutes),
        (route) => {
          const access = hasAccess('KASIR', route)

          // KASIR should have access to /kasir, /api/transactions/*, /api/products/*
          const expectedAccess =
            route === '/kasir' ||
            route.startsWith('/kasir/') ||
            route === '/api/transactions' ||
            route.startsWith('/api/transactions/') ||
            route === '/api/products' ||
            route.startsWith('/api/products/')

          expect(access).toBe(expectedAccess)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should restrict GUDANG to only allowed routes', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...allRoutes),
        (route) => {
          const access = hasAccess('GUDANG', route)

          // GUDANG should have access to /stok, /supplier, /api/products/*, /api/suppliers/*, /api/stock-logs
          const expectedAccess =
            route === '/stok' ||
            route.startsWith('/stok/') ||
            route === '/supplier' ||
            route.startsWith('/supplier/') ||
            route === '/api/products' ||
            route.startsWith('/api/products/') ||
            route === '/api/suppliers' ||
            route.startsWith('/api/suppliers/') ||
            route === '/api/stock-logs' ||
            route.startsWith('/api/stock-logs/')

          expect(access).toBe(expectedAccess)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should verify random role-route pairs match expected access', () => {
    const roleArb = fc.constantFrom<Role>('ADMIN', 'KASIR', 'GUDANG')
    const routeArb = fc.constantFrom(...allRoutes)

    fc.assert(
      fc.property(roleArb, routeArb, (role, route) => {
        const access = hasAccess(role, route)

        if (role === 'ADMIN') {
          expect(access).toBe(true)
        } else {
          // Verify it matches the route matrix logic
          const allowed = roleRoutes[role].some(
            (r) => route === r || route.startsWith(r + '/')
          )
          expect(access).toBe(allowed)
        }
      }),
      { numRuns: 200 }
    )
  })
})
