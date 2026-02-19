import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/shared/api';
import { useAuthStore } from '@/features/auth/model/authStore';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

interface Company {
  companyId: string;
  companyName: string;
  role: string;
}

/** Страница выбора компании при логине (если >1) */
export function SelectCompanyPage() {
  const navigate = useNavigate();
  const { token, setAuth } = useAuthStore();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    apiFetch('/auth/me', { token })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const memberships = (data?.memberships as Company[] | undefined) ?? [];
        setCompanies(memberships);
        if (memberships.length <= 1) {
          navigate('/', { replace: true });
        }
      })
      .catch(() => navigate('/login', { replace: true }))
      .finally(() => setLoading(false));
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !token) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch('/auth/me/active-company', {
        method: 'PATCH',
        body: JSON.stringify({ companyId: selected }),
        token,
      });
      const data = (await res.json().catch(() => ({}))) as {
        accessToken?: string;
        user?: { id: string; email: string; activeCompanyId?: string };
      };
      if (!res.ok) {
        throw new Error('Ошибка выбора компании');
      }
      if (data.accessToken && data.user) {
        setAuth(
          {
            id: data.user.id,
            email: data.user.email,
            activeCompanyId: data.user.activeCompanyId ?? null,
          },
          data.accessToken
        );
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="text-gray-600">Загрузка...</p>;
  }

  return (
    <div className="max-w-md mx-auto">
      <Card className="p-8">
        <h1 className="text-xl font-semibold mb-6">Выберите компанию</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-2">
            {companies.map((c) => (
              <label
                key={c.companyId}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="company"
                  value={c.companyId}
                  checked={selected === c.companyId}
                  onChange={() => setSelected(c.companyId)}
                />
                <span>{c.companyName}</span>
              </label>
            ))}
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <Button type="submit" disabled={!selected || submitting}>
            {submitting ? 'Переход...' : 'Продолжить'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
