interface RequestOptions extends RequestInit {
  token?: string | null;
}
/** Выполнить запрос к API с поддержкой JWT */
export declare function apiFetch(
  path: string,
  options?: RequestOptions
): Promise<Response>;
export {};
//# sourceMappingURL=client.d.ts.map
