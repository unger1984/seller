/** Расширение Express Request.user для JWT payload */
export interface JwtUser {
  userId: string;
  email: string;
  activeCompanyId?: string;
}

/* eslint-disable @typescript-eslint/no-namespace, @typescript-eslint/no-empty-object-type */
declare global {
  namespace Express {
    interface User extends JwtUser {}
  }
}
