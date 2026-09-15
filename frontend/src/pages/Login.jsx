import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { apiError } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const toast = useUI((s) => s.toast);
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const next = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (form.password.length < 6) next.password = 'Password needs at least 6 characters';
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await login(form);
      toast('Signed in', 'success');
      navigate(location.state?.from || '/workspaces', { replace: true });
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-5">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-7 flex items-center justify-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-iris-500 to-azure-500 font-extrabold text-white">S</span>
          <span className="text-lg font-extrabold tracking-tight text-white">SyncSpace</span>
        </Link>

        <form onSubmit={submit} className="surface space-y-4 p-6 sm:p-7">
          <div>
            <h1 className="text-xl font-extrabold text-white">Sign in</h1>
            <p className="mt-1 text-sm muted">Pick up where your team left off.</p>
          </div>

          <label className="block text-xs font-semibold text-slate-300">
            Email
            <input
              className="field mt-1.5"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
            />
            {errors.email && <span className="mt-1 block text-[11px] font-medium text-rose-300">{errors.email}</span>}
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Password
            <input
              className="field mt-1.5"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
            {errors.password && <span className="mt-1 block text-[11px] font-medium text-rose-300">{errors.password}</span>}
          </label>

          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>

          <p className="text-center text-xs muted">
            New here? <Link to="/register" className="font-semibold text-iris-400 hover:underline">Create an account</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
