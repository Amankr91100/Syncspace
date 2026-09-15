import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { apiError } from '../lib/api';
import Avatar from '../components/Avatar';

export default function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const toast = useUI((s) => s.toast);
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: user?.name || '', title: user?.title || '', avatar: user?.avatar || '', password: '' });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (form.name.trim().length < 2) return toast('Enter your name', 'error');
    if (form.password && form.password.length < 6) return toast('A new password needs at least 6 characters', 'error');
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), title: form.title, avatar: form.avatar };
      if (form.password) payload.password = form.password;
      await updateProfile(payload);
      setForm({ ...form, password: '' });
      toast('Profile updated', 'success');
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-xl px-5 py-8 sm:py-12">
      <div className="mb-6 flex items-center gap-2">
        <Link to="/workspaces" className="rounded-lg p-2 text-slate-400 hover:bg-white/10" aria-label="Back"><ArrowLeft size={18} /></Link>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Your profile</h1>
      </div>

      <section className="surface space-y-4 p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar user={{ ...user, avatar: form.avatar }} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-white">{user?.name}</p>
            <p className="truncate text-sm muted">{user?.email}</p>
          </div>
        </div>

        <label className="block text-xs font-semibold text-slate-300">
          Name
          <input className="field mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>

        <label className="block text-xs font-semibold text-slate-300">
          Job title
          <input className="field mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Frontend engineer" />
        </label>

        <label className="block text-xs font-semibold text-slate-300">
          Avatar image link
          <input className="field mt-1.5" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })} placeholder="https://…" />
        </label>

        <label className="block text-xs font-semibold text-slate-300">
          New password
          <input className="field mt-1.5" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Leave blank to keep the current one" />
        </label>

        <div className="flex flex-wrap gap-2 pt-1">
          <button className="btn-primary" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Saving…' : 'Save changes'}</button>
          <button className="btn-ghost !text-rose-300" onClick={() => { logout(); navigate('/login'); }}>Sign out</button>
        </div>
      </section>
    </div>
  );
}
