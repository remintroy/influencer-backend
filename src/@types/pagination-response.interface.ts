export interface PaginationResponse<T> {
  totalDocs: number;
  page: number;
  limit: number;
  docs: T[];
}
