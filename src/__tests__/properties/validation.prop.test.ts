import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Product price constraint validation.
 * Rules: purchasePrice > 0, retailPrice > purchasePrice, wholesalePrice > purchasePrice (if provided)
 */
function validateProductPrices(
  purchasePrice: number,
  retailPrice: number,
  wholesalePrice: number | null
): boolean {
  if (purchasePrice <= 0) return false
  if (retailPrice <= purchasePrice) return false
  if (wholesalePrice !== null && wholesalePrice <= purchasePrice) return false
  return true
}

/**
 * Filter inactive products from a list.
 * Only active products should appear in kasir-facing queries.
 */
interface ProductEntry {
  id: string
  name: string
  isActive: boolean
}

function filterActiveProducts(products: ProductEntry[]): ProductEntry[] {
  return products.filter((p) => p.isActive)
}

/**
 * Validate Indonesian phone number format.
 * Accepts: 08xx (8-12 digits after 0) or +62xx (8-12 digits after +62)
 */
function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim()
  if (/^08\d{8,12}$/.test(trimmed)) return true
  if (/^\+62\d{8,12}$/.test(trimmed)) return true
  return false
}

/**
 * Normalize phone to international format for wa.me URL.
 * 08xxx → 628xxx
 * +62xxx → 62xxx
 */
function normalizePhone(phone: string): string {
  const trimmed = phone.trim()
  if (trimmed.startsWith('+62')) {
    return trimmed.slice(1)
  }
  if (trimmed.startsWith('08')) {
    return '62' + trimmed.slice(1)
  }
  return trimmed
}

/**
 * Generate WhatsApp URL from normalized phone.
 */
function generateWhatsAppUrl(normalizedPhone: string): string {
  return `https://wa.me/${normalizedPhone}`
}

/**
 * Filter transactions by date range.
 */
interface Transaction {
  id: string
  createdAt: Date
  status: 'COMPLETED' | 'VOID'
}

function filterByDateRange(
  transactions: Transaction[],
  from: Date,
  to: Date
): Transaction[] {
  return transactions.filter(
    (t) => t.createdAt >= from && t.createdAt <= to
  )
}

/**
 * Rank products by total quantity sold (descending).
 */
interface ProductSale {
  productId: string
  quantity: number
}

function rankTopProducts(
  sales: ProductSale[]
): Array<{ productId: string; totalQty: number }> {
  const totals = new Map<string, number>()
  for (const sale of sales) {
    totals.set(sale.productId, (totals.get(sale.productId) || 0) + sale.quantity)
  }
  return Array.from(totals.entries())
    .map(([productId, totalQty]) => ({ productId, totalQty }))
    .sort((a, b) => b.totalQty - a.totalQty)
}

describe('Property 16: Product Price Constraint Validation', () => {
  /**
   * **Validates: Requirements 6.2**
   *
   * Accept iff: purchasePrice > 0, retailPrice > purchasePrice, wholesalePrice > purchasePrice (if provided)
   */
  it('should accept valid price configurations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 1, max: 5_000_000 }),
        (purchasePrice, markup) => {
          const retailPrice = purchasePrice + markup
          const result = validateProductPrices(purchasePrice, retailPrice, null)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('should reject when purchasePrice <= 0', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -1_000_000, max: 0 }),
        fc.integer({ min: 1000, max: 10_000_000 }),
        (purchasePrice, retailPrice) => {
          const result = validateProductPrices(purchasePrice, retailPrice, null)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject when retailPrice <= purchasePrice', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 0, max: 5_000_000 }),
        (purchasePrice, offset) => {
          const retailPrice = purchasePrice - offset // retailPrice <= purchasePrice
          fc.pre(retailPrice <= purchasePrice)
          const result = validateProductPrices(purchasePrice, retailPrice, null)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject when wholesalePrice <= purchasePrice', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 0, max: 5_000_000 }),
        (purchasePrice, markup, offset) => {
          const retailPrice = purchasePrice + markup
          const wholesalePrice = purchasePrice - offset // wholesalePrice <= purchasePrice
          fc.pre(wholesalePrice <= purchasePrice)
          const result = validateProductPrices(purchasePrice, retailPrice, wholesalePrice)
          expect(result).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should accept when all constraints are satisfied with wholesalePrice', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5_000_000 }),
        fc.integer({ min: 1, max: 2_000_000 }),
        fc.integer({ min: 1, max: 2_000_000 }),
        (purchasePrice, retailMarkup, wholesaleMarkup) => {
          const retailPrice = purchasePrice + retailMarkup
          const wholesalePrice = purchasePrice + wholesaleMarkup
          const result = validateProductPrices(purchasePrice, retailPrice, wholesalePrice)
          expect(result).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 17: Inactive Product Exclusion', () => {
  /**
   * **Validates: Requirements 6.3**
   *
   * Inactive products must be excluded from kasir-facing queries.
   */
  it('should exclude all inactive products from results', () => {
    const productArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      isActive: fc.boolean(),
    })

    fc.assert(
      fc.property(
        fc.array(productArb, { minLength: 0, maxLength: 20 }),
        (products) => {
          const result = filterActiveProducts(products)
          // No inactive products in result
          result.forEach((p) => {
            expect(p.isActive).toBe(true)
          })
          // All active products are included
          const activeCount = products.filter((p) => p.isActive).length
          expect(result.length).toBe(activeCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty array when all products are inactive', () => {
    const inactiveProductArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      isActive: fc.constant(false),
    })

    fc.assert(
      fc.property(
        fc.array(inactiveProductArb, { minLength: 1, maxLength: 20 }),
        (products) => {
          const result = filterActiveProducts(products)
          expect(result.length).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should return all products when all are active', () => {
    const activeProductArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      isActive: fc.constant(true),
    })

    fc.assert(
      fc.property(
        fc.array(activeProductArb, { minLength: 1, maxLength: 20 }),
        (products) => {
          const result = filterActiveProducts(products)
          expect(result.length).toBe(products.length)
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('Property 18: Indonesian Phone Validation and WhatsApp URL', () => {
  /**
   * **Validates: Requirements 7.4, 7.5**
   *
   * Valid Indonesian phone numbers (08xx or +62xx with 8-12 digits) should be accepted
   * and produce correct wa.me URLs.
   */
  it('should accept valid 08xx phone numbers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 12 }).chain((len) =>
          fc.stringMatching(new RegExp(`^\\d{${len}}$`)).map((digits) => '08' + digits)
        ),
        (phone) => {
          expect(isValidPhone(phone)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should accept valid +62xx phone numbers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 12 }).chain((len) =>
          fc.stringMatching(new RegExp(`^\\d{${len}}$`)).map((digits) => '+62' + digits)
        ),
        (phone) => {
          expect(isValidPhone(phone)).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject strings that are not valid phone numbers', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 0, maxLength: 5 }), // too short
          fc.stringMatching(/^[a-zA-Z]+$/), // only letters
          fc.constant('12345678901'), // doesn't start with 08 or +62
          fc.constant('08123'), // too short (only 3 digits after 08)
          fc.constant('+621234567'), // too short (only 7 digits after +62)
        ),
        (phone) => {
          expect(isValidPhone(phone)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should normalize 08xx to 628xx for WhatsApp URL', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 12 }).chain((len) =>
          fc.stringMatching(new RegExp(`^\\d{${len}}$`)).map((digits) => '08' + digits)
        ),
        (phone) => {
          const normalized = normalizePhone(phone)
          expect(normalized).toBe('62' + phone.slice(1))
          expect(normalized).toMatch(/^62\d{9,13}$/)

          const url = generateWhatsAppUrl(normalized)
          expect(url).toBe(`https://wa.me/${normalized}`)
          expect(url).toMatch(/^https:\/\/wa\.me\/62\d{9,13}$/)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should normalize +62xx to 62xx for WhatsApp URL', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 12 }).chain((len) =>
          fc.stringMatching(new RegExp(`^\\d{${len}}$`)).map((digits) => '+62' + digits)
        ),
        (phone) => {
          const normalized = normalizePhone(phone)
          expect(normalized).toBe(phone.slice(1)) // Remove "+"
          expect(normalized).toMatch(/^62\d{8,12}$/)

          const url = generateWhatsAppUrl(normalized)
          expect(url).toBe(`https://wa.me/${normalized}`)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 19: Date Range Filtering', () => {
  /**
   * **Validates: Requirements 8.4**
   *
   * Filtered results contain only transactions within [from, to].
   */
  it('should include only transactions within the date range', () => {
    const transactionArb = fc.record({
      id: fc.uuid(),
      createdAt: fc.date({
        min: new Date(2024, 0, 1),
        max: new Date(2025, 11, 31),
      }),
      status: fc.constantFrom<'COMPLETED' | 'VOID'>('COMPLETED', 'VOID'),
    })

    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 0, maxLength: 20 }),
        fc.date({ min: new Date(2024, 0, 1), max: new Date(2025, 5, 30) }),
        fc.date({ min: new Date(2025, 0, 1), max: new Date(2025, 11, 31) }),
        (transactions, from, to) => {
          // Ensure from <= to
          const actualFrom = from < to ? from : to
          const actualTo = from < to ? to : from

          const filtered = filterByDateRange(transactions, actualFrom, actualTo)

          // All filtered transactions are within range
          filtered.forEach((t) => {
            expect(t.createdAt.getTime()).toBeGreaterThanOrEqual(actualFrom.getTime())
            expect(t.createdAt.getTime()).toBeLessThanOrEqual(actualTo.getTime())
          })

          // Count matches expected
          const expectedCount = transactions.filter(
            (t) => t.createdAt >= actualFrom && t.createdAt <= actualTo
          ).length
          expect(filtered.length).toBe(expectedCount)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return empty when no transactions fall in range', () => {
    const earlyTransactionArb = fc.record({
      id: fc.uuid(),
      createdAt: fc.date({
        min: new Date(2020, 0, 1),
        max: new Date(2021, 11, 31),
      }),
      status: fc.constantFrom<'COMPLETED' | 'VOID'>('COMPLETED', 'VOID'),
    })

    fc.assert(
      fc.property(
        fc.array(earlyTransactionArb, { minLength: 1, maxLength: 10 }),
        (transactions) => {
          // Filter with a range in 2025 - no 2020-2021 transactions should match
          const from = new Date(2025, 0, 1)
          const to = new Date(2025, 11, 31)
          const filtered = filterByDateRange(transactions, from, to)
          expect(filtered.length).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('Property 20: Top Products Ranking', () => {
  /**
   * **Validates: Requirements 8.3, 2.5**
   *
   * Products ranked by descending SUM(quantity).
   */
  it('should rank products by descending total quantity', () => {
    const saleArb = fc.record({
      productId: fc.constantFrom('prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5'),
      quantity: fc.integer({ min: 1, max: 100 }),
    })

    fc.assert(
      fc.property(
        fc.array(saleArb, { minLength: 1, maxLength: 50 }),
        (sales) => {
          const ranked = rankTopProducts(sales)

          // Verify descending order
          for (let i = 1; i < ranked.length; i++) {
            expect(ranked[i - 1].totalQty).toBeGreaterThanOrEqual(ranked[i].totalQty)
          }

          // Verify totals are correct
          const expectedTotals = new Map<string, number>()
          for (const sale of sales) {
            expectedTotals.set(
              sale.productId,
              (expectedTotals.get(sale.productId) || 0) + sale.quantity
            )
          }

          ranked.forEach((r) => {
            expect(r.totalQty).toBe(expectedTotals.get(r.productId))
          })
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should include all products that have sales', () => {
    const saleArb = fc.record({
      productId: fc.constantFrom('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'),
      quantity: fc.integer({ min: 1, max: 500 }),
    })

    fc.assert(
      fc.property(
        fc.array(saleArb, { minLength: 1, maxLength: 30 }),
        (sales) => {
          const ranked = rankTopProducts(sales)
          const uniqueProducts = new Set(sales.map((s) => s.productId))
          expect(ranked.length).toBe(uniqueProducts.size)
        }
      ),
      { numRuns: 100 }
    )
  })
})
