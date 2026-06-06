import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

describe("Fast-check Setup", () => {
  it("should run property-based tests with fast-check", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        expect(a + b).toBe(b + a);
      }),
      { numRuns: 100 }
    );
  });
});
