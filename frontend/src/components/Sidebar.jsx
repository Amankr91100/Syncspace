import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Trello, FileText, Users, Bell, Settings, ChevronsUpDown, Plus, X,
} from 'lucide-react';
import { useWorkspace } from '../store/workspace';
import { useUI } from '../store/ui';
import { useNotifications } from '../store/notifications';
import { cx } from '../lib/utils';

const Item = ({ to, icon: Icon, label, badge, onNavigate }) => (
  <NavLink
    to={to}
    end
    onClick={onNavigate}
    className={({ isActive }) =>
      cx(
        'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
        isActive
          ? 'bg-gradient-to-r from-iris-500/25 to-azure-500/10 text-white shadow-[inset_0_0_0_1px_rgba(167,139,250,.25)]'
          : 'text-slate-400 hover:bg-white/[0.06] hover:text-slate-100'
      )
    }
  >
    <Icon size={17} className="shrink-0" />
    <span className="flex-1 truncate">{label}</span>
    {badge > 0 && (
      <span className="rounded-full bg-iris-500 px-1.5 py-0.5 text-[10px] font-bold text-white">{badge}</span>
    )}
  </NavLink>
);

export default function Sidebar() {
  const { current, workspaces } = useWorkspace();
  const { sidebarOpen, setSidebarOpen } = useUI();
  const unread = useNotifications((s) => s.unread);
  const navigate = useNavigate();

  if (!current) return null;
  const base = `/w/${current._id}`;
  const close = () => setSidebarOpen(false);

  return (
    <>
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={close} />}

      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[270px] flex-col gap-4 border-r border-white/10 bg-[#0a0d18]/95 p-4 backdrop-blur-xl transition-transform duration-200',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/workspaces')} className="flex items-center gap-2.5 rounded-xl px-1 py-1">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-iris-500 to-azure-500 text-sm font-extrabold text-white">
              S
            </span>
            <span className="text-[15px] font-extrabold tracking-tight text-white">SyncSpace</span>
          </button>
          <button className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden" onClick={close} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <button
          onClick={() => navigate('/workspaces')}
          className="surface flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-white/[0.08]"
        >
          <span className="text-xl leading-none">{current.icon}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-white">{current.name}</span>
            <span className="block text-[11px] muted">
              {workspaces.length} workspace{workspaces.length === 1 ? '' : 's'}
            </span>
          </span>
          <ChevronsUpDown size={15} className="text-slate-500" />
        </button>

        <nav className="flex-1 space-y-1 overflow-y-auto">
          <Item to={base} icon={LayoutDashboard} label="Overview" onNavigate={close} />
          <Item to={`${base}/my-tasks`} icon={CheckSquare} label="My tasks" onNavigate={close} />
          <Item to={`${base}/boards`} icon={Trello} label="Boards" onNavigate={close} />
          <Item to={`${base}/documents`} icon={FileText} label="Documents" onNavigate={close} />
          <Item to={`${base}/team`} icon={Users} label="Team" onNavigate={close} />
          <Item to={`${base}/notifications`} icon={Bell} label="Notifications" badge={unread} onNavigate={close} />
          <Item to={`${base}/settings`} icon={Settings} label="Workspace settings" onNavigate={close} />
        </nav>

        <button
          onClick={() => { close(); navigate(`${base}/boards?new=1`); }}
          className="btn-primary w-full"
        >
          <Plus size={16} /> New board
        </button>
      </aside>
    </>
  );
}
