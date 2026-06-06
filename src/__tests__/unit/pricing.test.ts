import { describe, it, expect } from 'vitest';
import {
  calculateItemPrice,
  calculateCartTotal,
  validateClientPrices,
  type ProductForPricing,
  type CartItemForCalculation,
} from '@/lib/utils/pricing';

describe('calculateItemPrice', () => {
  const baseProduct: ProductForPricing = {
    retailPrice: 5000,
    wholesalePrice: 4000,
    wholesaleMinQty: 12,
    purchasePrice: 3000,
  };

  it('should apply retail price when qty < wholesaleMinQty', () => {
    const result = calculateItemPrice(baseProduct, 5);

    expect(result.unitPrice).toBe(5000);
    expect(result.priceTier).toBe('RETAIL');
    expect(result.lineTotal).toBe(25000);
  });

  it('should apply retail price when qty = wholesaleMinQty - 1', () => {
    const result = calculateItemPrice(baseProduct, 11);

    expect(result.unitPrice).toBe(5000);
    expect(result.priceTier).toBe('RETAIL');
    expect(result.lineTotal).toBe(55000);
  });

  it('should apply wholesale price when qty = wholesaleMinQty', () => {
    const result = calculateItemPrice(baseProduct, 12);

    expect(result.unitPrice).toBe(4000);
    expect(result.priceTier).toBe('WHOLESALE');
    expect(result.lineTotal).toBe(48000);
  });

  it('should apply wholesale price when qty > wholesaleMinQty', () => {
    const result = calculateItemPrice(baseProduct, 24);

    expect(result.unitPrice).toBe(4000);
    expect(result.priceTier).toBe('WHOLESALE');
    expect(result.lineTotal).toBe(96000);
  });

  it('should fallback to retail price when wholesalePrice is null', () => {
    const product: ProductForPricing = {
      ...baseProduct,
      wholesalePrice: null,
    };
    const result = calculateItemPrice(product, 100);

    expect(result.unitPrice).toBe(5000);
    expect(result.priceTier).toBe('RETAIL');
    expect(result.lineTotal).toBe(500000);
  });

  it('should fallback to retail price when wholesalePrice is 0', () => {
    const product: ProductForPricing = {
      ...baseProduct,
      wholesalePrice: 0,
    };
    const result = calculateItemPrice(product, 50);

    expect(result.unitPrice).toBe(5000);
    expect(result.priceTier).toBe('RETAIL');
    expect(result.lineTotal).toBe(250000);
  });

  it('should calculate lineTotal as unitPrice * quantity', () => {
    const result = calculateItemPrice(baseProduct, 7);

    expect(result.lineTotal).toBe(result.unitPrice * 7);
  });
});

describe('calculateCartTotal - pricing independence', () => {
  it('should calculate price tier independently per product', () => {
    const productA: ProductForPricing = {
      retailPrice: 10000,
      wholesalePrice: 8000,
      wholesaleMinQty: 12,
      purchasePrice: 6000,
    };
    const productB: ProductForPricing = {
      retailPrice: 5000,
      wholesalePrice: 4000,
      wholesaleMinQty: 24,
      purchasePrice: 3000,
    };

    const items: CartItemForCalculation[] = [
      { product: productA, quantity: 15 }, // meets wholesale (>= 12)
      { product: productB, quantity: 10 }, // does NOT meet wholesale (< 24)
    ];

    const result = calculateCartTotal(items);

    // Product A should get wholesale
    expect(result.items[0].priceTier).toBe('WHOLESALE');
    expect(result.items[0].unitPrice).toBe(8000);

    // Product B should get retail (qty 10 < wholesaleMinQty 24)
    expect(result.items[1].priceTier).toBe('RETAIL');
    expect(result.items[1].unitPrice).toBe(5000);
  });

  it('should not let product A quantity affect product B pricing', () => {
    const productA: ProductForPricing = {
      retailPrice: 10000,
      wholesalePrice: 8000,
      wholesaleMinQty: 5,
      purchasePrice: 6000,
    };
    const productB: ProductForPricing = {
      retailPrice: 3000,
      wholesalePrice: 2500,
      wholesaleMinQty: 20,
      purchasePrice: 2000,
    };

    // Even though product A has qty 50 (well above B's minQty),
    // product B should still use its own quantity (3) for tier determination
    const items: CartItemForCalculation[] = [
      { product: productA, quantity: 50 },
      { product: productB, quantity: 3 },
    ];

    const result = calculateCartTotal(items);

    expect(result.items[0].priceTier).toBe('WHOLESALE');
    expect(result.items[1].priceTier).toBe('RETAIL');
    expect(result.items[1].unitPrice).toBe(3000);
  });
});

describe('calculateCartTotal - totals', () => {
  it('should calculate grandTotal as sum of all lineTotals', () => {
    const items: CartItemForCalculation[] = [
      {
        product: {
          retailPrice: 5000,
          wholesalePrice: 4000,
          wholesaleMinQty: 12,
          purchasePrice: 3000,
        },
        quantity: 5, // retail: 5000 * 5 = 25000
      },
      {
        product: {
          retailPrice: 8000,
          wholesalePrice: 6500,
          wholesaleMinQty: 10,
          purchasePrice: 5000,
        },
        quantity: 10, // wholesale: 6500 * 10 = 65000
      },
    ];

    const result = calculateCartTotal(items);

    expect(result.grandTotal).toBe(25000 + 65000);
  });

  it('should calculate totalItems as sum of all quantities', () => {
    const items: CartItemForCalculation[] = [
      {
        product: {
          retailPrice: 5000,
          wholesalePrice: 4000,
          wholesaleMinQty: 12,
          purchasePrice: 3000,
        },
        quantity: 5,
      },
      {
        product: {
          retailPrice: 8000,
          wholesalePrice: 6500,
          wholesaleMinQty: 10,
          purchasePrice: 5000,
        },
        quantity: 10,
      },
    ];

    const result = calculateCartTotal(items);

    expect(result.totalItems).toBe(15);
  });

  it('should calculate totalProfit correctly', () => {
    const items: CartItemForCalculation[] = [
      {
        product: {
          retailPrice: 5000,
          wholesalePrice: 4000,
          wholesaleMinQty: 12,
          purchasePrice: 3000,
        },
        quantity: 5, // retail: profit = (5000 - 3000) * 5 = 10000
      },
      {
        product: {
          retailPrice: 8000,
          wholesalePrice: 6500,
          wholesaleMinQty: 10,
          purchasePrice: 5000,
        },
        quantity: 10, // wholesale: profit = (6500 - 5000) * 10 = 15000
      },
    ];

    const result = calculateCartTotal(items);

    expect(result.totalProfit).toBe(10000 + 15000);
  });

  it('should handle empty cart', () => {
    const result = calculateCartTotal([]);

    expect(result.items).toEqual([]);
    expect(result.grandTotal).toBe(0);
    expect(result.totalProfit).toBe(0);
    expect(result.totalItems).toBe(0);
  });
});

describe('validateClientPrices', () => {
  it('should return true when prices match exactly', () => {
    expect(validateClientPrices(50000, 50000)).toBe(true);
  });

  it('should return true when difference is within tolerance (< 0.01)', () => {
    expect(validateClientPrices(50000.005, 50000)).toBe(true);
    expect(validateClientPrices(50000, 50000.009)).toBe(true);
  });

  it('should return false when prices differ significantly', () => {
    expect(validateClientPrices(50000, 45000)).toBe(false);
  });

  it('should return false when difference exceeds tolerance', () => {
    expect(validateClientPrices(50000.02, 50000)).toBe(false);
  });

  it('should handle zero values', () => {
    expect(validateClientPrices(0, 0)).toBe(true);
    expect(validateClientPrices(0, 100)).toBe(false);
  });
});
