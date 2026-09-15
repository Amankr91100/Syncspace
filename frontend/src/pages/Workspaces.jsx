import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, LogOut, Mail, ArrowRight } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { useWorkspace } from '../store/workspace';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import Modal from '../components/Modal';
import { Skeleton, EmptyState } from '../components/States';
import Avatar from '../components/Avatar';

const ICONS = ['🚀', '🎯', '🧭', '🛠️', '📦', '🌱', '⚡', '🧩'];

export default function Workspaces() {
  const { workspaces, loadWorkspaces, createWorkspace, loading } = useWorkspace();
  const { user, logout } = useAuth();
  const toast = useUI((s) => s.toast);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', icon: '🚀' });
  const [busy, setBusy] = useState(false);
  const [invites, setInvites] = useState([]);

  useEffect(() => {
    loadWorkspaces().catch((err) => toast(apiError(err), 'error'));
    api.get('/workspaces/invites/mine').then(({ data }) => setInvites(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const create = async () => {
    if (!form.name.trim()) return toast('Give the workspace a name', 'error');
    setBusy(true);
    try {
      const ws = await createWorkspace(form);
      toast('Workspace created', 'success');
      navigate(`/w/${ws._id}`);
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const accept = async (id) => {
    try {
      await api.post(`/workspaces/${id}/invites/accept`);
      toast('You joined the workspace', 'success');
      setInvites(invites.filter((i) => i._id !== id));
      loadWorkspaces();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-5 py-8 sm:py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar user={user} size="md" />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">Hello, {user?.name?.split(' ')[0]}</h1>
            <p className="text-sm muted">Choose a workspace to open.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/profile" className="btn-ghost">Profile</Link>
          <button className="btn-ghost" onClick={() => { logout(); navigate('/login'); }}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>

      {invites.length > 0 && (
        <section className="mb-7 space-y-2">
          <h2 className="text-sm font-bold text-white">Waiting for you</h2>
          {invites.map((w) => (
            <div key={w._id} className="surface flex items-center gap-3 px-4 py-3">
              <Mail size={17} className="text-iris-400" />
              <span className="flex-1 text-sm">
                You've been invited to <strong className="text-white">{w.name}</strong>
              </span>
              <button className="btn-primary !py-2" onClick={() => accept(w._id)}>Join</button>
            </div>
          ))}
        </section>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : workspaces.length === 0 ? (
        <EmptyState
          icon={Plus}
          title="No workspaces yet"
          body="A workspace holds your boards, documents and team. Create one to get started."
          action={<button className="btn-primary mt-2" onClick={() => setOpen(true)}>Create a workspace</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((w) => (
            <button
              key={w._id}
              onClick={() => navigate(`/w/${w._id}`)}
              className="surface group p-5 text-left transition hover:border-iris-400/40"
            >
              <span className="text-3xl leading-none">{w.icon}</span>
              <h3 className="mt-3 truncate text-base font-bold text-white">{w.name}</h3>
              <p className="mt-1 line-clamp-2 min-h-[2.4rem] text-[13px] muted">
                {w.description || 'No description yet.'}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {(w.members || []).slice(0, 4).map((m) => (
                    <Avatar key={m.user?._id || m.user} user={m.user} size="xs" />
                  ))}
                </div>
                <ArrowRight size={16} className="text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-iris-400" />
              </div>
            </button>
          ))}

          <button
            onClick={() => setOpen(true)}
            className="grid min-h-[168px] place-items-center rounded-2xl border border-dashed border-white/15 text-sm font-semibold text-slate-400 transition hover:border-iris-400/50 hover:text-iris-400"
          >
            <span className="flex flex-col items-center gap-2"><Plus size={20} /> New workspace</span>
          </button>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a workspace"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create workspace'}</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <span className="text-xs font-semibold text-slate-300">Icon</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  onClick={() => setForm({ ...form, icon: i })}
                  className={`grid h-10 w-10 place-items-center rounded-xl border text-lg transition ${
                    form.icon === i ? 'border-iris-400 bg-iris-500/20' : 'border-white/10 bg-white/[0.04] hover:bg-white/10'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <label className="block text-xs font-semibold text-slate-300">
            Name
            <input className="field mt-1.5" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product team" />
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Description
            <textarea className="field mt-1.5 min-h-[80px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What the team works on" />
          </label>
        </div>
      </Modal>
    </div>
  );
}
