import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { apiError } from '../lib/api';

export default function Register() {
  const { register } = useAuth();
  const toast = useUI((s) => s.toast);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Tell us your name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (form.password.length < 6) next.password = 'Use at least 6 characters';
    setErrors(next);
    return !Object.keys(next).length;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await register(form);
      toast('Account created', 'success');
      navigate('/workspaces', { replace: true });
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
            <h1 className="text-xl font-extrabold text-white">Create your account</h1>
            <p className="mt-1 text-sm muted">Set up a workspace and invite your team in a minute.</p>
          </div>

          <label className="block text-xs font-semibold text-slate-300">
            Full name
            <input
              className="field mt-1.5"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Aman Verma"
            />
            {errors.name && <span className="mt-1 block text-[11px] font-medium text-rose-300">{errors.name}</span>}
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            Email
            <input
              className="field mt-1.5"
              type="email"
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
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
            />
            {errors.password && <span className="mt-1 block text-[11px] font-medium text-rose-300">{errors.password}</span>}
          </label>

          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</button>

          <p className="text-center text-xs muted">
            Already registered? <Link to="/login" className="font-semibold text-iris-400 hover:underline">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
