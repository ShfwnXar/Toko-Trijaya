/**
 * Unit tests for the Zustand Cart Store
 *
 * Tests cart operations: addItem, removeItem, updateQuantity, clear
 * Tests derived state: lineTotal, grandTotal, totalItems
 * Tests persistence key configuration
 * Tests price tier recalculation on quantity changes
 *
 * Requirements: 3.3, 3.4, 3.9, 3.10
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore, ProductSummary } from '@/stores/cart-store'

// Helper to create a test product
function createProduct(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: 'prod-1',
    name: 'Indomie Goreng',
    barcode: '8996001410209',
    retailPrice: 3500,
    wholesalePrice: 3000,
    wholesaleMinQty: 12,
    purchasePrice: 2800,
    stock: 100,
    unit: 'pcs',
    ...overrides,
  }
}

function createProduct2(overrides: Partial<ProductSummary> = {}): ProductSummary {
  return {
    id: 'prod-2',
    name: 'Teh Botol Sosro',
    barcode: '8996001301001',
    retailPrice: 5000,
    wholesalePrice: 4500,
    wholesaleMinQty: 24,
    purchasePrice: 4000,
    stock: 50,
    unit: 'pcs',
    ...overrides,
  }
}

describe('Cart Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useCartStore.setState({ items: [], grandTotal: 0, totalItems: 0 })
  })

  describe('addItem', () => {
    it('adds a new product with quantity 1 and RETAIL tier', () => {
      const product = createProduct()
      useCartStore.getState().addItem(product)

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].productId).toBe('prod-1')
      expect(state.items[0].quantity).toBe(1)
      expect(state.items[0].priceTier).toBe('RETAIL')
      expect(state.items[0].unitPrice).toBe(3500)
      expect(state.items[0].lineTotal).toBe(3500)
    })

    it('increments existing product quantity when added again', () => {
      const product = createProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product)

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].quantity).toBe(2)
    })

    it('switches price tier from RETAIL to WHOLESALE when qty hits threshold', () => {
      const product = createProduct({ wholesaleMinQty: 3, wholesalePrice: 3000 })

      // Add the product 3 times to reach wholesaleMinQty
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product)

      const state = useCartStore.getState()
      expect(state.items[0].quantity).toBe(3)
      expect(state.items[0].priceTier).toBe('WHOLESALE')
      expect(state.items[0].unitPrice).toBe(3000)
      expect(state.items[0].lineTotal).toBe(9000)
    })

    it('uses retailPrice when wholesalePrice is null regardless of quantity', () => {
      const product = createProduct({ wholesalePrice: null, wholesaleMinQty: 2 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product)

      const state = useCartStore.getState()
      expect(state.items[0].priceTier).toBe('RETAIL')
      expect(state.items[0].unitPrice).toBe(3500)
    })

    it('uses retailPrice when wholesalePrice is 0 regardless of quantity', () => {
      const product = createProduct({ wholesalePrice: 0, wholesaleMinQty: 2 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product)
      useCartStore.getState().addItem(product)

      const state = useCartStore.getState()
      expect(state.items[0].priceTier).toBe('RETAIL')
      expect(state.items[0].unitPrice).toBe(3500)
    })

    it('caps quantity at 9999 when incrementing', () => {
      const product = createProduct()
      // Set item directly at 9999
      useCartStore.setState({
        items: [{
          productId: product.id,
          product,
          quantity: 9999,
          unitPrice: 3000,
          priceTier: 'WHOLESALE',
          lineTotal: 3000 * 9999,
        }],
        grandTotal: 3000 * 9999,
        totalItems: 9999,
      })

      useCartStore.getState().addItem(product)

      const state = useCartStore.getState()
      expect(state.items[0].quantity).toBe(9999)
    })
  })

  describe('updateQuantity', () => {
    it('enforces minimum of 1 — rejects quantity 0', () => {
      const product = createProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQuantity('prod-1', 0)

      const state = useCartStore.getState()
      expect(state.items[0].quantity).toBe(1)
    })

    it('enforces minimum of 1 — rejects negative quantity', () => {
      const product = createProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQuantity('prod-1', -5)

      const state = useCartStore.getState()
      expect(state.items[0].quantity).toBe(1)
    })

    it('enforces maximum of 9999', () => {
      const product = createProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQuantity('prod-1', 10000)

      const state = useCartStore.getState()
      expect(state.items[0].quantity).toBe(1)
    })

    it('accepts valid quantity within bounds', () => {
      const product = createProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQuantity('prod-1', 5)

      const state = useCartStore.getState()
      expect(state.items[0].quantity).toBe(5)
    })

    it('recalculates price tier when quantity changes to meet wholesale threshold', () => {
      const product = createProduct({ wholesaleMinQty: 12, wholesalePrice: 3000 })
      useCartStore.getState().addItem(product)

      // Quantity 1 → RETAIL
      expect(useCartStore.getState().items[0].priceTier).toBe('RETAIL')

      // Update to 12 → WHOLESALE
      useCartStore.getState().updateQuantity('prod-1', 12)
      const state = useCartStore.getState()
      expect(state.items[0].priceTier).toBe('WHOLESALE')
      expect(state.items[0].unitPrice).toBe(3000)
      expect(state.items[0].lineTotal).toBe(36000)
    })

    it('reverts price tier when quantity drops below wholesale threshold', () => {
      const product = createProduct({ wholesaleMinQty: 12, wholesalePrice: 3000 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQuantity('prod-1', 12)

      // Should be WHOLESALE
      expect(useCartStore.getState().items[0].priceTier).toBe('WHOLESALE')

      // Drop below threshold
      useCartStore.getState().updateQuantity('prod-1', 11)
      const state = useCartStore.getState()
      expect(state.items[0].priceTier).toBe('RETAIL')
      expect(state.items[0].unitPrice).toBe(3500)
      expect(state.items[0].lineTotal).toBe(3500 * 11)
    })
  })

  describe('removeItem', () => {
    it('removes an item from the cart', () => {
      const product1 = createProduct()
      const product2 = createProduct2()
      useCartStore.getState().addItem(product1)
      useCartStore.getState().addItem(product2)

      useCartStore.getState().removeItem('prod-1')

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(1)
      expect(state.items[0].productId).toBe('prod-2')
    })

    it('results in empty cart when last item is removed', () => {
      const product = createProduct()
      useCartStore.getState().addItem(product)
      useCartStore.getState().removeItem('prod-1')

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(0)
      expect(state.grandTotal).toBe(0)
      expect(state.totalItems).toBe(0)
    })
  })

  describe('clear', () => {
    it('empties the entire cart', () => {
      const product1 = createProduct()
      const product2 = createProduct2()
      useCartStore.getState().addItem(product1)
      useCartStore.getState().addItem(product2)

      useCartStore.getState().clear()

      const state = useCartStore.getState()
      expect(state.items).toHaveLength(0)
      expect(state.grandTotal).toBe(0)
      expect(state.totalItems).toBe(0)
    })
  })

  describe('grandTotal', () => {
    it('equals sum of all lineTotals', () => {
      const product1 = createProduct({ retailPrice: 3500 })
      const product2 = createProduct2({ retailPrice: 5000 })
      useCartStore.getState().addItem(product1)
      useCartStore.getState().addItem(product2)

      const state = useCartStore.getState()
      const expectedGrandTotal = state.items.reduce((sum, item) => sum + item.lineTotal, 0)
      expect(state.grandTotal).toBe(expectedGrandTotal)
      expect(state.grandTotal).toBe(3500 + 5000)
    })

    it('updates when quantity changes', () => {
      const product = createProduct({ retailPrice: 3500, wholesalePrice: 3000, wholesaleMinQty: 12 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQuantity('prod-1', 5)

      expect(useCartStore.getState().grandTotal).toBe(3500 * 5)

      // Switch to wholesale tier
      useCartStore.getState().updateQuantity('prod-1', 12)
      expect(useCartStore.getState().grandTotal).toBe(3000 * 12)
    })
  })

  describe('lineTotal', () => {
    it('always equals unitPrice × quantity', () => {
      const product = createProduct({ retailPrice: 3500 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQuantity('prod-1', 7)

      const state = useCartStore.getState()
      const item = state.items[0]
      expect(item.lineTotal).toBe(item.unitPrice * item.quantity)
      expect(item.lineTotal).toBe(3500 * 7)
    })

    it('recalculates correctly when tier switches', () => {
      const product = createProduct({ retailPrice: 3500, wholesalePrice: 3000, wholesaleMinQty: 5 })
      useCartStore.getState().addItem(product)
      useCartStore.getState().updateQuantity('prod-1', 5)

      const state = useCartStore.getState()
      const item = state.items[0]
      // Should be wholesale price now
      expect(item.unitPrice).toBe(3000)
      expect(item.lineTotal).toBe(3000 * 5)
    })
  })

  describe('persistence', () => {
    it('uses "trijaya-cart" as the localStorage key', () => {
      // Access the store's persist options
      const persistOptions = (useCartStore as any).persist
      expect(persistOptions.getOptions().name).toBe('trijaya-cart')
    })
  })
})
