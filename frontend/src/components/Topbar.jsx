import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, Sun, Moon, UserPlus, LogOut, User as UserIcon, Wifi, WifiOff } from 'lucide-react';
import { useUI } from '../store/ui';
import { useAuth } from '../store/auth';
import { useWorkspace } from '../store/workspace';
import { useNotifications } from '../store/notifications';
import { useSocket } from '../lib/SocketContext';
import Avatar from './Avatar';
import { cx } from '../lib/utils';

const labels = {
  boards: 'Boards', documents: 'Documents', team: 'Team', settings: 'Settings',
  notifications: 'Notifications', 'my-tasks': 'My tasks', b: 'Board', d: 'Document', profile: 'Profile',
};

export default function Topbar({ onInvite }) {
  const { setSearchOpen, setSidebarOpen, theme, toggleTheme } = useUI();
  const { user, logout } = useAuth();
  const { current } = useWorkspace();
  const unread = useNotifications((s) => s.unread);
  const { connected } = useSocket();
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const crumbs = pathname.split('/').slice(3).filter(Boolean).map((p) => labels[p] || null).filter(Boolean);

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070a13]/80 backdrop-blur-xl">
      <div className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
        <button className="rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <Menu size={19} />
        </button>

        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm md:flex">
          <Link to={`/w/${current?._id}`} className="truncate font-semibold text-slate-200 hover:text-white">
            {current?.name}
          </Link>
          {crumbs.map((c) => (
            <span key={c} className="flex items-center gap-1.5 muted">
              <span className="text-slate-600">/</span>
              <span className="truncate">{c}</span>
            </span>
          ))}
        </nav>

        <button
          onClick={() => setSearchOpen(true)}
          className="ml-auto flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-500 transition hover:bg-white/[0.08] md:max-w-xs md:flex-none"
        >
          <Search size={15} />
          <span className="flex-1 text-left">Search tasks and boards</span>
          <kbd className="hidden rounded border border-white/10 px-1.5 text-[10px] md:inline">⌘K</kbd>
        </button>

        <span
          title={connected ? 'Live updates on' : 'Reconnecting'}
          className={cx('hidden rounded-lg p-2 sm:grid', connected ? 'text-emerald-400' : 'text-amber-400')}
        >
          {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
        </span>

        <button onClick={onInvite} className="btn-ghost hidden !px-3 !py-2 sm:inline-flex">
          <UserPlus size={15} /> Invite
        </button>

        <button onClick={toggleTheme} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Switch theme">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <Link to={`/w/${current?._id}/notifications`} className="relative rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label="Notifications">
          <Bell size={17} />
          {unread > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Link>

        <div className="relative">
          <button onClick={() => setMenu((m) => !m)} aria-label="Account menu">
            <Avatar user={user} size="sm" />
          </button>
          {menu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
              <div className="surface absolute right-0 z-20 mt-2 w-56 animate-rise p-1.5">
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                  <p className="truncate text-xs muted">{user?.email}</p>
                </div>
                <button
                  onClick={() => { setMenu(false); navigate('/profile'); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/10"
                >
                  <UserIcon size={15} /> Your profile
                </button>
                <button
                  onClick={() => { logout(); navigate('/login'); }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
