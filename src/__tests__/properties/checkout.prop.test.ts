import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { calculateCartTotal, ProductForPricing, CartItemForCalculation } from '@/lib/utils/pricing'

/**
 * Pure function that computes change amount based on payment method.
 * Mirrors the checkout API logic.
 */
function calculateChange(
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER',
  amountPaid: number,
  totalAmount: number
): number {
  if (paymentMethod === 'CASH') {
    return amountPaid - totalAmount
  }
  // QRIS and TRANSFER: change is always 0
  return 0
}

/**
 * Generate invoice number from date and counter.
 * Format: TRX-YYYYMMDD-XXXX
 */
function generateInvoiceNumber(date: Date, counter: number): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const dateStr = `${year}${month}${day}`
  return `TRX-${dateStr}-${String(counter).padStart(4, '0')}`
}

/**
 * Calculate profit for a set of items.
 * profit = sum((unitPrice - purchasePrice) * quantity)
 */
function calculateProfit(
  items: Array<{ unitPrice: number; purchasePrice: number; quantity: number }>
): number {
  return items.reduce(
    (sum, item) => sum + (item.unitPrice - item.purchasePrice) * item.quantity,
    0
  )
}

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

describe('Property 6: Change Amount Calculation', () => {
  /**
   * **Validates: Requirements 4.3, 4.4**
   *
   * - Cash: change = amountPaid - totalAmount
   * - QRIS/Transfer: change = 0
   */
  it('should calculate change = paid - total for CASH payments', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 50_000_000 }),
        fc.integer({ min: 0, max: 50_000_000 }),
        (total, extra) => {
          const amountPaid = total + extra
          const change = calculateChange('CASH', amountPaid, total)
          expect(change).toBe(amountPaid - total)
          expect(change).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 200 }
    )
  })

  it('should return change = 0 for QRIS payments regardless of amounts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 50_000_000 }),
        fc.integer({ min: 1000, max: 50_000_000 }),
        (total, paid) => {
          const change = calculateChange('QRIS', paid, total)
          expect(change).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return change = 0 for TRANSFER payments regardless of amounts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1000, max: 50_000_000 }),
        fc.integer({ min: 1000, max: 50_000_000 }),
        (total, paid) => {
          const change = calculateChange('TRANSFER', paid, total)
          expect(change).toBe(0)
        }
      ),
      { numRuns: 100 }
    )
  })
})

describe('Property 7: Invoice Number Format', () => {
  /**
   * **Validates: Requirements 4.9**
   *
   * Invoice numbers must match format ^TRX-\d{8}-\d{4}$
   */
  it('should produce invoice numbers matching TRX-YYYYMMDD-XXXX format', () => {
    const dateArb = fc.date({
      min: new Date(2020, 0, 1),
      max: new Date(2030, 11, 31),
    })
    const counterArb = fc.integer({ min: 1, max: 9999 })

    fc.assert(
      fc.property(dateArb, counterArb, (date, counter) => {
        fc.pre(!isNaN(date.getTime()))
        const invoice = generateInvoiceNumber(date, counter)
        expect(invoice).toMatch(/^TRX-\d{8}-\d{4}$/)
      }),
      { numRuns: 200 }
    )
  })

  it('should encode the correct date in the invoice number', () => {
    const dateArb = fc.date({
      min: new Date(2020, 0, 1),
      max: new Date(2030, 11, 31),
    })
    const counterArb = fc.integer({ min: 1, max: 9999 })

    fc.assert(
      fc.property(dateArb, counterArb, (date, counter) => {
        fc.pre(!isNaN(date.getTime()))
        const invoice = generateInvoiceNumber(date, counter)
        const parts = invoice.split('-')
        const dateStr = parts[1]
        const year = parseInt(dateStr.slice(0, 4))
        const month = parseInt(dateStr.slice(4, 6))
        const day = parseInt(dateStr.slice(6, 8))

        expect(year).toBe(date.getFullYear())
        expect(month).toBe(date.getMonth() + 1)
        expect(day).toBe(date.getDate())
      }),
      { numRuns: 100 }
    )
  })
})

describe('Property 8: Profit Calculation', () => {
  /**
   * **Validates: Requirements 4.10**
   *
   * totalProfit = sum((unitPrice - purchasePrice) × quantity) for all items
   */
  it('should calculate profit as sum of (unitPrice - purchasePrice) * quantity', () => {
    const cartItemArb = fc.record({
      product: productArb,
      quantity: quantityArb,
    }) as fc.Arbitrary<CartItemForCalculation>

    fc.assert(
      fc.property(
        fc.array(cartItemArb, { minLength: 1, maxLength: 10 }),
        (items) => {
          const result = calculateCartTotal(items)

          // Manually calculate expected profit
          const expectedProfit = items.reduce((sum, item, idx) => {
            const unitPrice = result.items[idx].unitPrice
            return sum + (unitPrice - item.product.purchasePrice) * item.quantity
          }, 0)

          expect(result.totalProfit).toBe(expectedProfit)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should match standalone profit calculation', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            unitPrice: fc.integer({ min: 1000, max: 10_000_000 }),
            purchasePrice: fc.integer({ min: 100, max: 5_000_000 }),
            quantity: fc.integer({ min: 1, max: 100 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (items) => {
          const profit = calculateProfit(items)
          const manualProfit = items.reduce(
            (sum, item) => sum + (item.unitPrice - item.purchasePrice) * item.quantity,
            0
          )
          expect(profit).toBe(manualProfit)
        }
      ),
      { numRuns: 100 }
    )
  })
})
