import { apiFetch } from '@/shared/api';

export async function login(data: { email: string; password: string }) {
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    const msg =
      'message' in json
        ? (json as { message: string }).message
        : 'Ошибка входа';
    const err = new Error(msg);
    if (
      res.status === 403 &&
      (msg.includes('Подтвердите email') || msg.includes('email'))
    ) {
      (err as Error & { showResend?: boolean }).showResend = true;
    }
    throw err;
  }
  return json;
}

export async function register(data: {
  email: string;
  password: string;
  name?: string;
}) {
  const res = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      'message' in json
        ? (json as { message: string }).message
        : 'Ошибка регистрации'
    );
  }
  return json;
}

export async function forgotPassword(email: string) {
  const res = await apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      'message' in json
        ? (json as { message: string }).message
        : 'Ошибка запроса'
    );
  }
  return json;
}

export async function resetPassword(token: string, password: string) {
  const res = await apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      'message' in json
        ? (json as { message: string }).message
        : 'Ошибка сброса'
    );
  }
  return json;
}

export async function resendVerification(email: string) {
  const res = await apiFetch('/auth/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      'message' in json
        ? (json as { message: string }).message
        : 'Ошибка отправки'
    );
  }
  return json;
}

export async function switchActiveCompany(
  companyId: string,
  token: string
): Promise<{
  accessToken: string;
  user: { id: string; email: string; activeCompanyId?: string | null };
  memberships: {
    companyId: string;
    companyName: string;
    role: string;
    isActive: boolean;
  }[];
}> {
  const res = await apiFetch('/auth/me/active-company', {
    method: 'PATCH',
    body: JSON.stringify({ companyId }),
    token,
  });
  const data = (await res.json().catch(() => ({}))) as {
    accessToken?: string;
    user?: { id: string; email: string; activeCompanyId?: string | null };
    memberships?: {
      companyId: string;
      companyName: string;
      role: string;
      isActive: boolean;
    }[];
  };
  if (!res.ok || !data.accessToken || !data.user) {
    throw new Error('Не удалось сменить компанию');
  }
  return data as {
    accessToken: string;
    user: { id: string; email: string; activeCompanyId?: string | null };
    memberships: {
      companyId: string;
      companyName: string;
      role: string;
      isActive: boolean;
    }[];
  };
}
