import { expect, test } from "bun:test";
import { ageToYears, ageInput, formatBirdAge } from "../src/lib/bird-age";
test("young birds retain ages in weeks and months through editing", () => {
  const months = ageToYears(6, "months"); expect(months).toBe(0.5); expect(formatBirdAge(months)).toBe("6 months"); expect(ageInput(months)).toEqual({ value: "6", unit: "months" });
  const weeks = ageToYears(3, "weeks"); expect(formatBirdAge(weeks)).toBe("3 weeks"); expect(ageInput(weeks)).toEqual({ value: "3", unit: "weeks" });
  expect(formatBirdAge(0)).toBe("Less than 1 week"); expect(formatBirdAge(null)).toBe("Age not provided"); expect(formatBirdAge(1)).toBe("1 year");
  expect(() => ageToYears(-1, "months")).toThrow(); expect(() => ageToYears(NaN, "years")).toThrow();
});
