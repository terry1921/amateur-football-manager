import { expect } from "vitest";

export function expectRlsDenied(result: {
  data: unknown;
  error: { code?: string } | null;
}) {
  expect(result.data).toBeNull();
  expect(result.error?.code).toBe("42501");
}

export function expectNoRowsAffected(result: {
  data: unknown[] | null;
  error: unknown;
}) {
  expect(result.error).toBeNull();
  expect(result.data).toEqual([]);
}

export function expectForeignKeyDenied(result: {
  data: unknown;
  error: { code?: string } | null;
}) {
  expect(result.data).toBeNull();
  expect(result.error?.code).toBe("23503");
}
