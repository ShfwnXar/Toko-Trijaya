import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

/**
 * Pure function to filter transactions by status for aggregation.
 * Only COMPLETED transactions should be included in aggregations.
 */
interface TransactionForAgg {
  id: string
  status: 'COMPLETED' | 'VOID'
  totalAmount: number
  totalProfit: number
  totalItems: number
}

function filterCompletedTransactions(
  transactions: TransactionForAgg[]
): TransactionForAgg[] {
  return transactions.filter((t) => t.status === 'COMPLETED')
}

function aggregateRevenue(transactions: TransactionForAgg[]): number {
  return filterCompletedTransactions(transactions).reduce(
    (sum, t) => sum + t.totalAmount,
    0
  )
}

function aggregateProfit(transactions: TransactionForAgg[]): number {
  return filterCompletedTransactions(transactions).reduce(
    (sum, t) => sum + t.totalProfit,
    0
  )
}

/**
 * Simulate void transaction reversal.
 * When a transaction is voided, all item quantities should be restored to stock.
 */
interface TransactionItem {
  productId: string
  quantity: number
}

interface StockState {
  [productId: string]: number
}

function voidTransaction(
  stockState: StockState,
  items: TransactionItem[]
): StockState {
  const newState = { ...stockState }
  for (const item of items) {
    newState[item.productId] = (newState[item.productId] || 0) + item.quantity
  }
  return newState
}

function performSale(
  stockState: StockState,
  items: TransactionItem[]
): StockState {
  const newState = { ...stockState }
  for (const item of items) {
    newState[item.productId] = (newState[item.productId] || 0) - item.quantity
  }
  return newState
}

describe('Property 13: VOID Exclusion from Calculations', () => {
  /**
   * **Validates: Requirements 8.1, 8.7, 11.5**
   *
   * Aggregations (revenue, profit) include only COMPLETED transactions.
   * VOID transactions are excluded from all calculations.
   */
  it('should exclude VOID transactions from revenue aggregation', () => {
    const transactionArb = fc.record({
      id: fc.uuid(),
      status: fc.constantFrom<'COMPLETED' | 'VOID'>('COMPLETED', 'VOID'),
      totalAmount: fc.integer({ min: 1000, max: 50_000_000 }),
      totalProfit: fc.integer({ min: 100, max: 10_000_000 }),
      totalItems: fc.integer({ min: 1, max: 100 }),
    })

    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1, maxLength: 20 }),
        (transactions) => {
          const revenue = aggregateRevenue(transactions)

          // Revenue should only include COMPLETED transactions
          const expectedRevenue = transactions
            .filter((t) => t.status === 'COMPLETED')
            .reduce((sum, t) => sum + t.totalAmount, 0)

          expect(revenue).toBe(expectedRevenue)

          // VOID transactions should not contribute to revenue
          const voidRevenue = transactions
            .filter((t) => t.status === 'VOID')
            .reduce((sum, t) => sum + t.totalAmount, 0)

          if (voidRevenue > 0) {
            // If there are VOID transactions with amounts, total revenue should be less than sum of all
            const allRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0)
            expect(revenue).toBeLessThanOrEqual(allRevenue)
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should exclude VOID transactions from profit aggregation', () => {
    const transactionArb = fc.record({
      id: fc.uuid(),
      status: fc.constantFrom<'COMPLETED' | 'VOID'>('COMPLETED', 'VOID'),
      totalAmount: fc.integer({ min: 1000, max: 50_000_000 }),
      totalProfit: fc.integer({ min: 100, max: 10_000_000 }),
      totalItems: fc.integer({ min: 1, max: 100 }),
    })

    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 1, maxLength: 20 }),
        (transactions) => {
          const profit = aggregateProfit(transactions)

          const expectedProfit = transactions
            .filter((t) => t.status === 'COMPLETED')
            .reduce((sum, t) => sum + t.totalProfit, 0)

          expect(profit).toBe(expectedProfit)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('should return 0 revenue when all transactions are VOID', () => {
    const voidTransactionArb = fc.record({
      id: fc.uuid(),
      status: fc.constant<'VOID'>('VOID'),
      totalAmount: fc.integer({ min: 1000, max: 50_000_000 }),
      totalProfit: fc.integer({ min: 100, max: 10_000_000 }),
      totalItems: fc.integer({ min: 1, max: 100 }),
    })

    fc.assert(
      fc.property(
        fc.array(voidTransactionArb, { minLength: 1, maxLength: 10 }),
        (transactions) => {
          expect(aggregateRevenue(transactions)).toBe(0)
          expect(aggregateProfit(transactions)).toBe(0)
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('Property 14: Void Transaction Reversal', () => {
  /**
   * **Validates: Requirements 11.1, 11.2**
   *
   * When a transaction is voided, stock is restored to pre-sale level.
   * sale(stock, items) then void(stock', items) = original stock
   */
  it('should restore stock to pre-sale level after void', () => {
    const productIds = ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5']

    const itemArb = fc.record({
      productId: fc.constantFrom(...productIds),
      quantity: fc.integer({ min: 1, max: 100 }),
    })

    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 5 }),
        (items) => {
          // Start with sufficient stock for all items
          const initialStock: StockState = {}
          for (const pid of productIds) {
            initialStock[pid] = 10000
          }

          // Perform sale
          const afterSale = performSale(initialStock, items)

          // Void (restore stock)
          const afterVoid = voidTransaction(afterSale, items)

          // Stock should be restored to initial level
          for (const pid of productIds) {
            expect(afterVoid[pid]).toBe(initialStock[pid])
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('should restore exact quantities for each product', () => {
    const itemArb = fc.record({
      productId: fc.constantFrom('A', 'B', 'C'),
      quantity: fc.integer({ min: 1, max: 500 }),
    })

    fc.assert(
      fc.property(
        fc.array(itemArb, { minLength: 1, maxLength: 10 }),
        fc.record({
          A: fc.integer({ min: 1000, max: 99999 }),
          B: fc.integer({ min: 1000, max: 99999 }),
          C: fc.integer({ min: 1000, max: 99999 }),
        }),
        (items, stockLevels) => {
          const initialStock: StockState = { ...stockLevels }

          // Perform sale
          const afterSale = performSale(initialStock, items)

          // Verify stock was deducted
          const deductions = new Map<string, number>()
          for (const item of items) {
            deductions.set(
              item.productId,
              (deductions.get(item.productId) || 0) + item.quantity
            )
          }

          for (const [pid, deducted] of deductions) {
            expect(afterSale[pid]).toBe(initialStock[pid] - deducted)
          }

          // Void transaction
          const afterVoid = voidTransaction(afterSale, items)

          // All products restored
          for (const pid of Object.keys(initialStock)) {
            expect(afterVoid[pid]).toBe(initialStock[pid])
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
