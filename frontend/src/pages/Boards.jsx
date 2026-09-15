import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Plus, Trello, Trash2 } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { useUI } from '../store/ui';
import Modal from '../components/Modal';
import { Skeleton, EmptyState } from '../components/States';
import { timeAgo, cx } from '../lib/utils';

const THEMES = [
  { value: 'violet', ring: 'from-iris-500 to-azure-500' },
  { value: 'ocean', ring: 'from-sky-500 to-cyan-400' },
  { value: 'sunset', ring: 'from-amber-500 to-rose-500' },
  { value: 'forest', ring: 'from-emerald-500 to-teal-400' },
];

export const themeRing = (theme) => THEMES.find((t) => t.value === theme)?.ring || THEMES[0].ring;

export default function Boards() {
  const { workspaceId } = useParams();
  const [params, setParams] = useSearchParams();
  const { toast, ask } = useUI();
  const [boards, setBoards] = useState(null);
  const [open, setOpen] = useState(params.get('new') === '1');
  const [form, setForm] = useState({ title: '', description: '', theme: 'violet' });
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.get('/boards', { params: { workspaceId } })
      .then(({ data }) => setBoards(data))
      .catch((err) => toast(apiError(err), 'error'));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspaceId]);

  const closeModal = () => { setOpen(false); if (params.get('new')) setParams({}); };

  const create = async () => {
    if (!form.title.trim()) return toast('Give the board a title', 'error');
    setBusy(true);
    try {
      await api.post('/boards', { ...form, workspaceId });
      toast('Board created with the five default lists', 'success');
      setForm({ title: '', description: '', theme: 'violet' });
      closeModal();
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (board) => {
    const yes = await ask({
      title: `Delete ${board.title}?`,
      body: 'Its lists, tasks and comments are deleted too. This cannot be undone.',
      confirmLabel: 'Delete board',
    });
    if (!yes) return;
    try {
      await api.delete(`/boards/${board._id}`, { params: { workspaceId } });
      toast('Board deleted', 'success');
      load();
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Boards</h1>
          <p className="text-sm muted">Every project in this workspace.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New board</button>
      </div>

      {!boards ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : boards.length === 0 ? (
        <EmptyState
          icon={Trello}
          title="No boards here yet"
          body="A board starts with Backlog, To Do, In Progress, In Review and Done — rename or remove them as you like."
          action={<button className="btn-primary mt-2" onClick={() => setOpen(true)}>Create a board</button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {boards.map((b) => {
            const pct = b.cardCount ? Math.round((b.doneCount / b.cardCount) * 100) : 0;
            return (
              <div key={b._id} className="surface group relative overflow-hidden">
                <div className={cx('h-1.5 w-full bg-gradient-to-r', themeRing(b.theme))} />
                <Link to={`/w/${workspaceId}/b/${b._id}`} className="block p-5">
                  <h3 className="truncate pr-8 text-base font-bold text-white">{b.title}</h3>
                  <p className="mt-1 line-clamp-2 min-h-[2.4rem] text-[13px] muted">{b.description || 'No description yet.'}</p>
                  <div className="mt-4 flex items-center justify-between text-[11px] muted">
                    <span>{b.doneCount}/{b.cardCount} done</span>
                    <span>Updated {timeAgo(b.updatedAt)}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                    <div className={cx('h-full rounded-full bg-gradient-to-r', themeRing(b.theme))} style={{ width: `${pct}%` }} />
                  </div>
                </Link>
                <button
                  onClick={() => remove(b)}
                  className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-rose-500/15 hover:text-rose-300 focus:opacity-100 group-hover:opacity-100"
                  aria-label={`Delete ${b.title}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={open}
        onClose={closeModal}
        title="Create a board"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={closeModal}>Cancel</button>
            <button className="btn-primary" onClick={create} disabled={busy}>{busy ? 'Creating…' : 'Create board'}</button>
          </div>
        }
      >
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Title
            <input className="field mt-1.5" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Website relaunch" />
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Description
            <textarea className="field mt-1.5 min-h-[72px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this board tracks" />
          </label>
          <div>
            <span className="text-xs font-semibold text-slate-300">Cover</span>
            <div className="mt-2 flex gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm({ ...form, theme: t.value })}
                  className={cx(
                    'h-9 flex-1 rounded-xl bg-gradient-to-r transition',
                    t.ring,
                    form.theme === t.value ? 'ring-2 ring-white/70' : 'opacity-60 hover:opacity-100'
                  )}
                  aria-label={t.value}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
