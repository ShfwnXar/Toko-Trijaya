/**
 * Zustand Cart Store with localStorage persistence for Toko Grosir Tri Jaya POS
 *
 * Client-side cart state management that:
 * - Persists cart data to localStorage (survives page refreshes)
 * - Automatically recalculates price tiers on quantity changes
 * - Enforces quantity bounds [1, 9999]
 * - Computes lineTotal and grandTotal reactively
 *
 * Requirements: 3.3, 3.4, 3.9, 3.10
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ProductSummary {
  id: string;
  name: string;
  barcode: string;
  retailPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number;
  purchasePrice: number;
  stock: number;
  unit: string;
}

export interface CartItem {
  productId: string;
  product: ProductSummary;
  quantity: number;
  unitPrice: number;
  priceTier: 'RETAIL' | 'WHOLESALE';
  lineTotal: number;
}

export interface CartStore {
  items: CartItem[];
  grandTotal: number;
  totalItems: number;

  addItem: (product: ProductSummary) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

/**
 * Determine the price tier and unit price for a given product at a given quantity.
 * Mirrors the server-side pricing engine logic for client display.
 *
 * Rules:
 * - If product has a valid wholesalePrice (non-null, > 0) AND quantity >= wholesaleMinQty → WHOLESALE
 * - Otherwise → RETAIL
 */
function calculatePriceForItem(
  product: ProductSummary,
  quantity: number
): { unitPrice: number; priceTier: 'RETAIL' | 'WHOLESALE' } {
  const hasWholesale = product.wholesalePrice != null && product.wholesalePrice > 0;
  if (hasWholesale && quantity >= product.wholesaleMinQty) {
    return { unitPrice: product.wholesalePrice!, priceTier: 'WHOLESALE' };
  }
  return { unitPrice: product.retailPrice, priceTier: 'RETAIL' };
}

/**
 * Recalculate derived totals from the current items array.
 */
function recalculateCart(items: CartItem[]): { grandTotal: number; totalItems: number } {
  const grandTotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  return { grandTotal, totalItems };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set) => ({
      items: [],
      grandTotal: 0,
      totalItems: 0,

      /**
       * Add a product to the cart. If the product already exists, increment its quantity.
       * Recalculates price tier after quantity change.
       * Requirement 3.3, 3.4
       */
      addItem: (product: ProductSummary) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.productId === product.id
          );

          if (existingIndex >= 0) {
            // Product already in cart — increment quantity (max 9999)
            const items = [...state.items];
            const existing = items[existingIndex];
            const newQty = Math.min(existing.quantity + 1, 9999);
            const { unitPrice, priceTier } = calculatePriceForItem(product, newQty);
            items[existingIndex] = {
              ...existing,
              quantity: newQty,
              unitPrice,
              priceTier,
              lineTotal: unitPrice * newQty,
            };
            return { items, ...recalculateCart(items) };
          }

          // New item — add with quantity 1
          const { unitPrice, priceTier } = calculatePriceForItem(product, 1);
          const newItem: CartItem = {
            productId: product.id,
            product,
            quantity: 1,
            unitPrice,
            priceTier,
            lineTotal: unitPrice * 1,
          };
          const items = [...state.items, newItem];
          return { items, ...recalculateCart(items) };
        });
      },

      /**
       * Remove a product from the cart entirely.
       */
      removeItem: (productId: string) => {
        set((state) => {
          const items = state.items.filter((item) => item.productId !== productId);
          return { items, ...recalculateCart(items) };
        });
      },

      /**
       * Update the quantity of a cart item. Enforces bounds [1, 9999].
       * Recalculates price tier after change.
       * Requirements: 3.3, 3.4, 3.9
       */
      updateQuantity: (productId: string, quantity: number) => {
        // Enforce bounds — reject out-of-range values silently
        if (quantity < 1 || quantity > 9999) return;

        set((state) => {
          const items = state.items.map((item) => {
            if (item.productId !== productId) return item;
            const { unitPrice, priceTier } = calculatePriceForItem(item.product, quantity);
            return {
              ...item,
              quantity,
              unitPrice,
              priceTier,
              lineTotal: unitPrice * quantity,
            };
          });
          return { items, ...recalculateCart(items) };
        });
      },

      /**
       * Clear the entire cart (used after successful checkout).
       */
      clear: () => {
        set({ items: [], grandTotal: 0, totalItems: 0 });
      },
    }),
    {
      name: 'trijaya-cart',
    }
  )
)
