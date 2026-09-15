import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, ListTodo, Plus, Trello } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { useWorkspace } from '../store/workspace';
import { useUI } from '../store/ui';
import { useSocket } from '../lib/SocketContext';
import { Skeleton, EmptyState } from '../components/States';
import Avatar from '../components/Avatar';
import { timeAgo, cx } from '../lib/utils';

const Stat = ({ icon: Icon, label, value, tone }) => (
  <div className="surface p-4 sm:p-5">
    <span className={cx('grid h-9 w-9 place-items-center rounded-xl', tone)}>
      <Icon size={17} />
    </span>
    <p className="mt-3 text-2xl font-extrabold text-white">{value}</p>
    <p className="text-[12px] font-medium muted">{label}</p>
  </div>
);

export default function Dashboard() {
  const { workspaceId } = useParams();
  const { current, members, online } = useWorkspace();
  const { liveActivity } = useSocket();
  const toast = useUI((s) => s.toast);
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [quickTitle, setQuickTitle] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/workspaces/${workspaceId}/overview`)
      .then(({ data: d }) => setData(d))
      .catch((err) => toast(apiError(err), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  /** Quick add drops a task into the first list of the most recent board. */
  const quickAdd = async () => {
    if (!quickTitle.trim()) return;
    const board = data?.boards?.[0];
    if (!board) return toast('Create a board first', 'error');

    setBusy(true);
    try {
      const { data: boardData } = await api.get(`/boards/${board._id}`, { params: { workspaceId } });
      const list = boardData.lists.find((l) => /to do/i.test(l.title)) || boardData.lists[0];
      if (!list) return toast('That board has no lists yet', 'error');

      await api.post('/cards', { title: quickTitle.trim(), listId: list._id, workspaceId });
      toast(`Added to ${board.title}`, 'success');
      setQuickTitle('');
      const { data: refreshed } = await api.get(`/workspaces/${workspaceId}/overview`);
      setData(refreshed);
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  if (!data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-52" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-60" />
      </div>
    );
  }

  const { stats } = data;
  const progress = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const activity = [...liveActivity, ...data.activity].slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{current?.name}</h1>
          <p className="text-sm muted">{current?.description || 'Everything your team is working on.'}</p>
        </div>
        <div className="flex -space-x-2">
          {members.slice(0, 6).map((m) => (
            <Avatar key={m.user._id} user={m.user} size="sm" online={online.includes(String(m.user._id))} />
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={ListTodo} label="Total tasks" value={stats.total} tone="bg-iris-500/15 text-iris-400" />
        <Stat icon={Clock} label="In progress" value={stats.inProgress} tone="bg-azure-500/15 text-azure-400" />
        <Stat icon={CheckCircle2} label="Completed" value={stats.completed} tone="bg-emerald-500/15 text-emerald-400" />
        <Stat icon={AlertTriangle} label="Overdue" value={stats.overdue} tone="bg-rose-500/15 text-rose-400" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="surface p-5">
            <h2 className="text-sm font-bold text-white">Add a task without leaving this page</h2>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="field"
                value={quickTitle}
                onChange={(e) => setQuickTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
                placeholder="What needs doing?"
              />
              <button className="btn-primary shrink-0" onClick={quickAdd} disabled={busy}>
                <Plus size={16} /> Add task
              </button>
            </div>
            {data.boards[0] && <p className="mt-2 text-xs muted">Goes to {data.boards[0].title}.</p>}
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Active boards</h2>
              <Link to={`/w/${workspaceId}/boards`} className="text-xs font-semibold text-iris-400 hover:underline">See all</Link>
            </div>

            {data.boards.length === 0 ? (
              <EmptyState
                icon={Trello}
                title="No boards yet"
                body="Boards hold your lists and tasks. Create the first one for this workspace."
                action={<button className="btn-primary mt-2" onClick={() => navigate(`/w/${workspaceId}/boards?new=1`)}>Create a board</button>}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.boards.map((b) => (
                  <Link key={b._id} to={`/w/${workspaceId}/b/${b._id}`} className="surface p-4 transition hover:border-iris-400/40">
                    <h3 className="truncate text-sm font-bold text-white">{b.title}</h3>
                    <p className="mt-1 line-clamp-1 text-xs muted">{b.description || 'No description'}</p>
                    <p className="mt-3 text-[11px] muted">Updated {timeAgo(b.updatedAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="surface p-5">
            <h2 className="text-sm font-bold text-white">Progress</h2>
            <p className="mt-3 text-3xl font-extrabold text-white">{progress}%</p>
            <p className="text-xs muted">{stats.completed} of {stats.total} tasks done</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-iris-500 to-azure-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </section>

          <section className="surface p-5">
            <h2 className="text-sm font-bold text-white">Recent activity</h2>
            {activity.length === 0 ? (
              <p className="mt-3 text-sm muted">Activity from your team will show up here.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {activity.map((a) => (
                  <li key={a._id} className="flex gap-2.5">
                    <Avatar user={a.user} size="xs" />
                    <div className="min-w-0">
                      <p className="text-[13px] leading-snug text-slate-300">{a.message}</p>
                      <p className="text-[11px] muted">{timeAgo(a.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
