import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import {
  calculateItemPrice,
  calculateCartTotal,
  validateClientPrices,
  ProductForPricing,
  CartItemForCalculation,
} from '@/lib/utils/pricing'

/**
 * Arbitrary for a valid product with pricing info.
 * Generates realistic product data for property tests.
 */
const productArb = fc.record({
  retailPrice: fc.integer({ min: 1000, max: 10_000_000 }),
  wholesalePrice: fc.oneof(
    fc.constant(null),
    fc.integer({ min: 500, max: 9_000_000 })
  ),
  wholesaleMinQty: fc.integer({ min: 2, max: 100 }),
  purchasePrice: fc.integer({ min: 100, max: 5_000_000 }),
}) as fc.Arbitrary<ProductForPricing>

const quantityArb = fc.integer({ min: 1, max: 9999 })

describe('Property 1: Pricing Tier Determination', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.4, 3.7**
   *
   * For any product and quantity:
   * - If qty >= wholesaleMinQty AND wholesalePrice is valid (non-null, > 0) → WHOLESALE tier
   * - Otherwise → RETAIL tier
   */
  it('should assign WHOLESALE tier iff qty >= minQty and wholesalePrice is valid', () => {
    fc.assert(
      fc.property(productArb, quantityArb, (product, quantity) => {
        const result = calculateItemPrice(product, quantity)

        const hasValidWholesale =
          product.wholesalePrice != null && product.wholesalePrice > 0
        const meetsMinQty = quantity >= product.wholesaleMinQty

        if (hasValidWholesale && meetsMinQty) {
          expect(result.priceTier).toBe('WHOLESALE')
          expect(result.unitPrice).toBe(product.wholesalePrice)
        } else {
          expect(result.priceTier).toBe('RETAIL')
          expect(result.unitPrice).toBe(product.retailPrice)
        }
      }),
      { numRuns: 200 }
    )
  })

  it('should always use RETAIL when wholesalePrice is null', () => {
    fc.assert(
      fc.property(
        fc.record({
          retailPrice: fc.integer({ min: 1000, max: 10_000_000 }),
          wholesalePrice: fc.constant(null),
          wholesaleMinQty: fc.integer({ min: 2, max: 100 }),
          purchasePrice: fc.integer({ min: 100, max: 5_000_000 }),
        }) as fc.Arbitrary<ProductForPricing>,
        quantityArb,
        (product, quantity) => {
          const result = calculateItemPrice(product, quantity)
          expect(result.priceTier).toBe('RETAIL')
          expect(result.unitPrice).toBe(product.retailPrice)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 2: Pricing Independence per Product', () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * In a multi-product cart, each product's price is determined independently.
   * Adding/removing other products does not change a product's pricing result.
   */
  it('should price each product independently regardless of other cart items', () => {
    const cartItemArb = fc.record({
      product: productArb,
      quantity: quantityArb,
    }) as fc.Arbitrary<CartItemForCalculation>

    fc.assert(
      fc.property(
        fc.array(cartItemArb, { minLength: 2, maxLength: 10 }),
        (items) => {
          const cartResult = calculateCartTotal(items)

          // Each item's price in the cart should match its individual calculation
          items.forEach((item, idx) => {
            const individualResult = calculateItemPrice(item.product, item.quantity)
            expect(cartResult.items[idx].unitPrice).toBe(individualResult.unitPrice)
            expect(cartResult.items[idx].priceTier).toBe(individualResult.priceTier)
            expect(cartResult.items[idx].lineTotal).toBe(individualResult.lineTotal)
          })
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 3: Server-Side Price Recalculation Consistency', () => {
  /**
   * **Validates: Requirements 3.6, 3.8**
   *
   * Server recalculation of a cart should always produce the same result
   * as a fresh calculation with the same inputs.
   */
  it('should produce identical results when recalculating the same cart', () => {
    const cartItemArb = fc.record({
      product: productArb,
      quantity: quantityArb,
    }) as fc.Arbitrary<CartItemForCalculation>

    fc.assert(
      fc.property(
        fc.array(cartItemArb, { minLength: 1, maxLength: 10 }),
        (items) => {
          const firstCalc = calculateCartTotal(items)
          const secondCalc = calculateCartTotal(items)

          expect(firstCalc.grandTotal).toBe(secondCalc.grandTotal)
          expect(firstCalc.totalProfit).toBe(secondCalc.totalProfit)
          expect(firstCalc.totalItems).toBe(secondCalc.totalItems)

          // validateClientPrices should pass when comparing same calculation
          expect(
            validateClientPrices(firstCalc.grandTotal, secondCalc.grandTotal)
          ).toBe(true)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should detect mismatched totals via validateClientPrices', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 10_000_000 }),
        fc.integer({ min: 1, max: 10_000_000 }),
        (serverTotal, diff) => {
          // A client total that differs by more than 0.01 should fail validation
          const clientTotal = serverTotal + diff
          if (Math.abs(clientTotal - serverTotal) >= 0.01) {
            expect(validateClientPrices(clientTotal, serverTotal)).toBe(false)
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 4: Cart Arithmetic Invariants', () => {
  /**
   * **Validates: Requirements 3.10**
   *
   * For any cart:
   * - lineTotal = unitPrice × quantity for each item
   * - grandTotal = sum of all lineTotals
   */
  it('should maintain lineTotal = unitPrice * quantity for each item', () => {
    fc.assert(
      fc.property(productArb, quantityArb, (product, quantity) => {
        const result = calculateItemPrice(product, quantity)
        expect(result.lineTotal).toBe(result.unitPrice * quantity)
      }),
      { numRuns: 200 }
    )
  })

  it('should maintain grandTotal = sum(lineTotals)', () => {
    const cartItemArb = fc.record({
      product: productArb,
      quantity: quantityArb,
    }) as fc.Arbitrary<CartItemForCalculation>

    fc.assert(
      fc.property(
        fc.array(cartItemArb, { minLength: 1, maxLength: 15 }),
        (items) => {
          const result = calculateCartTotal(items)
          const expectedGrandTotal = result.items.reduce(
            (sum, item) => sum + item.lineTotal,
            0
          )
          expect(result.grandTotal).toBe(expectedGrandTotal)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should maintain totalItems = sum(quantities)', () => {
    const cartItemArb = fc.record({
      product: productArb,
      quantity: quantityArb,
    }) as fc.Arbitrary<CartItemForCalculation>

    fc.assert(
      fc.property(
        fc.array(cartItemArb, { minLength: 1, maxLength: 15 }),
        (items) => {
          const result = calculateCartTotal(items)
          const expectedTotalItems = items.reduce(
            (sum, item) => sum + item.quantity,
            0
          )
          expect(result.totalItems).toBe(expectedTotalItems)
        }
      ),
      { numRuns: 100 }
    )
  })
})
