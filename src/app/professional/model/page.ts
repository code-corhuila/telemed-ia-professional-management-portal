/** `PaginatedResponse` of the contract: one page of items with its metadata (Anexo H, rule 2). */
export interface Page<T> {
  readonly data: readonly T[];
  readonly meta: PageMeta;
}

export interface PageMeta {
  readonly page: number;
  readonly limit: number;
  /** Every item, across all pages. */
  readonly total: number;
  /** 0 when there are no items. */
  readonly totalPages: number;
}
