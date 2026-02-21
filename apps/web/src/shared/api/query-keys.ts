/** Фабрики query keys для TanStack Query */
export const queryKeys = {
  products: (companyId: string, page: number, search: string) =>
    ['products', companyId, { page, search }] as const,
  accounts: (companyId: string) => ['accounts', companyId] as const,
  syncImportStatus: (companyId: string) =>
    ['sync-import-status', companyId] as const,
};
