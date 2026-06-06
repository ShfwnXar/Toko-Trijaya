import { describe, it, expect } from "vitest"
import { createProductSchema, updateProductSchema } from "@/lib/validations/product"

describe("Product Validation Schema (createProductSchema)", () => {
  const validProduct = {
    barcode: "8901234567890",
    name: "Indomie Goreng",
    category: "Makanan",
    purchasePrice: 2500,
    retailPrice: 3500,
    unit: "pcs",
  }

  it("should accept valid product with required fields only", () => {
    const result = createProductSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.wholesaleMinQty).toBe(12)
      expect(result.data.stock).toBe(0)
      expect(result.data.minStock).toBe(10)
      expect(result.data.unit).toBe("pcs")
      expect(result.data.isActive).toBe(true)
    }
  })

  it("should accept valid product with all fields", () => {
    const input = {
      ...validProduct,
      wholesalePrice: 3000,
      wholesaleMinQty: 24,
      stock: 100,
      minStock: 20,
      supplierId: "supplier-1",
      isActive: true,
      imageUrl: "https://example.com/image.jpg",
    }
    const result = createProductSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it("should apply default values for optional fields", () => {
    const result = createProductSchema.safeParse(validProduct)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.wholesaleMinQty).toBe(12)
      expect(result.data.stock).toBe(0)
      expect(result.data.minStock).toBe(10)
      expect(result.data.isActive).toBe(true)
    }
  })

  it("should reject empty barcode", () => {
    const input = { ...validProduct, barcode: "" }
    const result = createProductSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("should reject barcode longer than 50 characters", () => {
    const input = { ...validProduct, barcode: "x".repeat(51) }
    const result = createProductSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("should reject empty name", () => {
    const input = { ...validProduct, name: "" }
    const result = createProductSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("should reject name longer than 255 characters", () => {
    const input = { ...validProduct, name: "x".repeat(256) }
    const result = createProductSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("should reject empty category", () => {
    const input = { ...validProduct, category: "" }
    const result = createProductSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("should reject missing required fields", () => {
    const result = createProductSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  // Price constraint tests
  describe("Price constraints", () => {
    it("should reject purchasePrice = 0", () => {
      const input = { ...validProduct, purchasePrice: 0 }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should reject negative purchasePrice", () => {
      const input = { ...validProduct, purchasePrice: -100 }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should reject retailPrice = 0", () => {
      const input = { ...validProduct, retailPrice: 0 }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should reject retailPrice less than or equal to purchasePrice", () => {
      const input = { ...validProduct, purchasePrice: 3000, retailPrice: 3000 }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should reject retailPrice less than purchasePrice", () => {
      const input = { ...validProduct, purchasePrice: 3000, retailPrice: 2500 }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should accept retailPrice greater than purchasePrice", () => {
      const input = { ...validProduct, purchasePrice: 2500, retailPrice: 3500 }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should reject wholesalePrice less than or equal to purchasePrice", () => {
      const input = { ...validProduct, purchasePrice: 2500, wholesalePrice: 2500 }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should reject wholesalePrice less than purchasePrice", () => {
      const input = { ...validProduct, purchasePrice: 2500, wholesalePrice: 2000 }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it("should accept wholesalePrice greater than purchasePrice", () => {
      const input = { ...validProduct, purchasePrice: 2500, retailPrice: 3500, wholesalePrice: 3000 }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should accept null wholesalePrice", () => {
      const input = { ...validProduct, wholesalePrice: null }
      const result = createProductSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should accept undefined wholesalePrice (not provided)", () => {
      const result = createProductSchema.safeParse(validProduct)
      expect(result.success).toBe(true)
    })
  })
})

describe("Product Update Schema (updateProductSchema)", () => {
  it("should accept partial updates", () => {
    const result = updateProductSchema.safeParse({ name: "Updated Name" })
    expect(result.success).toBe(true)
  })

  it("should accept empty object (no changes)", () => {
    const result = updateProductSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it("should validate price constraints when both prices provided", () => {
    const input = { purchasePrice: 3000, retailPrice: 2500 }
    const result = updateProductSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it("should pass when only retailPrice provided (can't cross-check)", () => {
    const result = updateProductSchema.safeParse({ retailPrice: 5000 })
    expect(result.success).toBe(true)
  })

  it("should reject invalid barcode", () => {
    const result = updateProductSchema.safeParse({ barcode: "" })
    expect(result.success).toBe(false)
  })

  it("should reject negative stock", () => {
    const result = updateProductSchema.safeParse({ stock: -1 })
    expect(result.success).toBe(false)
  })
})
