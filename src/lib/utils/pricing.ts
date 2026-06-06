/**
 * Server-side Pricing Engine for Toko Grosir Tri Jaya POS System
 *
 * Handles automatic wholesale/retail tier determination based on quantity,
 * cart total calculations, and client-server price validation.
 *
 * Requirements: 3.1, 3.2, 3.5, 3.6, 3.7, 3.8
 */

export interface PricingResult {
  unitPrice: number;
  priceTier: 'RETAIL' | 'WHOLESALE';
  lineTotal: number;
}

export interface ProductForPricing {
  retailPrice: number;
  wholesalePrice: number | null;
  wholesaleMinQty: number;
  purchasePrice: number;
}

export interface CartItemForCalculation {
  product: ProductForPricing;
  quantity: number;
}

export interface CheckoutCalculation {
  items: PricingResult[];
  grandTotal: number;
  totalProfit: number;
  totalItems: number;
}

/**
 * Calculate the unit price and tier for a single item based on quantity.
 *
 * Rules:
 * - If qty >= product.wholesaleMinQty AND product has a valid wholesalePrice (non-null, > 0) → WHOLESALE
 * - Otherwise → RETAIL
 * - If wholesalePrice is null or 0 → always RETAIL regardless of quantity
 *
 * Requirements: 3.1, 3.2, 3.7
 */
export function calculateItemPrice(
  product: ProductForPricing,
  quantity: number
): PricingResult {
  const hasWholesalePrice =
    product.wholesalePrice != null && product.wholesalePrice > 0;
  const meetsMinQty = quantity >= product.wholesaleMinQty;

  if (hasWholesalePrice && meetsMinQty) {
    const unitPrice = product.wholesalePrice!;
    return {
      unitPrice,
      priceTier: 'WHOLESALE',
      lineTotal: unitPrice * quantity,
    };
  }

  const unitPrice = product.retailPrice;
  return {
    unitPrice,
    priceTier: 'RETAIL',
    lineTotal: unitPrice * quantity,
  };
}

/**
 * Calculate totals for a full cart of items.
 * Each item's price is calculated independently per-product (Requirement 3.5).
 *
 * Requirements: 3.5, 3.6
 */
export function calculateCartTotal(
  items: CartItemForCalculation[]
): CheckoutCalculation {
  const pricingResults = items.map((item) =>
    calculateItemPrice(item.product, item.quantity)
  );

  const grandTotal = pricingResults.reduce((sum, r) => sum + r.lineTotal, 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalProfit = items.reduce((sum, item, idx) => {
    const profit =
      (pricingResults[idx].unitPrice - item.product.purchasePrice) *
      item.quantity;
    return sum + profit;
  }, 0);

  return {
    items: pricingResults,
    grandTotal,
    totalProfit,
    totalItems,
  };
}

/**
 * Validate that the client-submitted total matches the server-calculated total.
 * Returns true if they match (within floating point tolerance of 0.01).
 *
 * Requirements: 3.8
 */
export function validateClientPrices(
  clientTotal: number,
  serverTotal: number
): boolean {
  return Math.abs(clientTotal - serverTotal) < 0.01;
}
