/**
 * Pagination helpers shared by every list endpoint.
 *
 * Centralises the `(page - 1) * limit` arithmetic and the response envelope so
 * the offset math lives in exactly one place.
 */

/** Standard paginated response envelope returned by list endpoints. */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Convert a 1-based `page` and `limit` into Prisma `{ skip, take }`.
 * Guards against non-positive or fractional inputs.
 */
export function toSkipTake(
  page: number,
  limit: number,
): { skip: number; take: number } {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const safeLimit = Math.max(1, Math.floor(limit) || 1);
  return { skip: (safePage - 1) * safeLimit, take: safeLimit };
}
