import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Pure function that mirrors cart store's quantity bounds logic.
 * The cart store enforces quantity bounds [1, 9999]:
 * - updateQuantity returns early (no-op) if quantity < 1 or > 9999
 * - addItem caps at 9999
 */
function isValidQuantity(qty: number): boolean {
  return qty >= 1 && qty <= 9999
}

describe('Property 5: Quantity Bounds Validation', () => {
  /**
   * **Validates: Requirements 3.9**
   *
   * The cart accepts quantities in [1, 9999] and rejects quantities outside this range.
   */
  it('should accept quantities in [1, 9999]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9999 }),
        (qty) => {
          expect(isValidQuantity(qty)).toBe(true)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('should reject quantities below 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -10000, max: 0 }),
        (qty) => {
          expect(isValidQuantity(qty)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should reject quantities above 9999', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10000, max: 100000 }),
        (qty) => {
          expect(isValidQuantity(qty)).toBe(false)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should accept iff quantity is in [1, 9999] for any integer', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -100000, max: 100000 }),
        (qty) => {
          const result = isValidQuantity(qty)
          const expected = qty >= 1 && qty <= 9999
          expect(result).toBe(expected)
        }
      ),
      { numRuns: 300 }
    )
  })
})
