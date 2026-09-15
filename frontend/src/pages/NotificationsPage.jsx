import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Trash2, AtSign, MessageSquare, UserPlus, MoveRight, Clock } from 'lucide-react';
import { useNotifications } from '../store/notifications';
import { useUI } from '../store/ui';
import { EmptyState } from '../components/States';
import { timeAgo, cx } from '../lib/utils';

const icons = {
  assigned: UserPlus, comment: MessageSquare, mention: AtSign,
  moved: MoveRight, updated: Bell, invite: UserPlus, due: Clock,
};

export default function NotificationsPage() {
  const { items, unread, load, markRead, markAllRead, clearAll } = useNotifications();
  const toast = useUI((s) => s.toast);
  const navigate = useNavigate();

  useEffect(() => { load(); }, [load]);

  const open = (n) => {
    if (!n.read) markRead(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Notifications</h1>
          <p className="text-sm muted">{unread ? `${unread} unread` : 'You are all caught up.'}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => markAllRead()} disabled={!unread}><CheckCheck size={15} /> Mark all read</button>
          <button className="btn-ghost !text-rose-300" onClick={() => { clearAll(); toast('Notifications cleared', 'success'); }} disabled={!items.length}>
            <Trash2 size={15} /> Clear
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="Nothing to catch up on" body="Assignments, comments and mentions land here as they happen." />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = icons[n.type] || Bell;
            return (
              <button
                key={n._id}
                onClick={() => open(n)}
                className={cx(
                  'surface flex w-full items-start gap-3 px-4 py-3 text-left transition hover:border-iris-400/40',
                  !n.read && 'border-iris-400/30 bg-iris-500/[0.07]'
                )}
              >
                <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-iris-400">
                  <Icon size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cx('block text-sm', n.read ? 'text-slate-300' : 'font-semibold text-white')}>{n.message}</span>
                  <span className="block text-xs muted">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-iris-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
