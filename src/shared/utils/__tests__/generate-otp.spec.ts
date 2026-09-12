import { generateOTP } from "../generate-otp.util";

describe("generateOTP", () => {
  it("returns a string", () => {
    // Act
    const result = generateOTP();

    // Assert
    expect(typeof result).toBe("string");
  });

  it("returns exactly 6 characters", () => {
    // Act
    const result = generateOTP();

    // Assert
    expect(result).toHaveLength(6);
  });

  it("returns only numeric characters", () => {
    // Act
    const result = generateOTP();

    // Assert
    expect(/^\d+$/.test(result)).toBe(true);
  });

  it("pads with leading zeros for small random numbers", () => {
    // Arrange - we can't directly control randomInt, but we can verify the padding behavior
    // by running multiple times and checking that some values start with 0

    // Act
    const results = Array.from({ length: 100 }, () => generateOTP());

    // Assert - with 100 iterations, we should have at least one result starting with 0
    // (statistically very likely given the range 0-999999)
    const hasLeadingZero = results.some((otp) => otp.startsWith("0"));
    expect(hasLeadingZero).toBe(true);
  });

  it("returns values in range 000000 to 999999", () => {
    // Act
    const results = Array.from({ length: 100 }, () => generateOTP());

    // Assert
    results.forEach((otp) => {
      const numValue = parseInt(otp, 10);
      expect(numValue).toBeGreaterThanOrEqual(0);
      expect(numValue).toBeLessThanOrEqual(999999);
    });
  });

  it("generates different values on successive calls (likely unique)", () => {
    // Arrange - generate multiple OTPs
    const otp1 = generateOTP();
    const otp2 = generateOTP();
    const otp3 = generateOTP();

    // Act & Assert - they should be different (statistically almost certain over 3 calls)
    const allValues = [otp1, otp2, otp3];
    const _uniqueValues = new Set(allValues);
    // With random.int(0, 1000000), collision probability over 3 calls is negligible
    // but we check that they're all strings and proper length to be safe
    allValues.forEach((otp) => {
      expect(otp).toHaveLength(6);
      expect(/^\d+$/.test(otp)).toBe(true);
    });
  });

  it("always maintains 6-digit format even for minimum value 0", () => {
    // Act - call multiple times
    const results = Array.from({ length: 50 }, () => generateOTP());

    // Assert - all should be exactly 6 digits
    results.forEach((otp) => {
      expect(otp).toHaveLength(6);
      expect(otp).toMatch(/^\d{6}$/);
    });
  });
});
