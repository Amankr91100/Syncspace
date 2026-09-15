import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckSquare, CalendarDays } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { useUI } from '../store/ui';
import { Skeleton, EmptyState } from '../components/States';
import { cx, priorityTone, shortDate, dueState } from '../lib/utils';

export default function MyTasks() {
  const { workspaceId } = useParams();
  const toast = useUI((s) => s.toast);
  const [cards, setCards] = useState(null);
  const [filter, setFilter] = useState('open');

  useEffect(() => {
    api.get(`/workspaces/${workspaceId}/my-tasks`)
      .then(({ data }) => setCards(data))
      .catch((err) => toast(apiError(err), 'error'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const shown = (cards || []).filter((c) =>
    filter === 'all' ? true : filter === 'open' ? !c.completed : c.completed
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">My tasks</h1>
          <p className="text-sm muted">Everything assigned to you in this workspace.</p>
        </div>
        <div className="flex gap-1.5">
          {['open', 'completed', 'all'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition',
                filter === f ? 'bg-iris-500/25 text-white' : 'text-slate-400 hover:bg-white/10')}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {!cards ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : shown.length === 0 ? (
        <EmptyState icon={CheckSquare} title="Nothing assigned to you" body="Tasks people assign to you will collect here." />
      ) : (
        <div className="space-y-2">
          {shown.map((c) => {
            const state = dueState(c.dueDate, c.completed);
            return (
              <Link key={c._id} to={`/w/${workspaceId}/b/${c.board?._id}`} className="surface flex flex-wrap items-center gap-3 px-4 py-3 transition hover:border-iris-400/40">
                <span className={cx('chip border', priorityTone(c.priority))}>{c.priority}</span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block truncate text-sm font-semibold', c.completed ? 'text-slate-500 line-through' : 'text-white')}>{c.title}</span>
                  <span className="block truncate text-xs muted">{c.board?.title} · {c.list?.title}</span>
                </span>
                {c.dueDate && (
                  <span className={cx('chip', state === 'overdue' && '!text-rose-300', state === 'today' && '!text-amber-300')}>
                    <CalendarDays size={12} /> {shortDate(c.dueDate)}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
