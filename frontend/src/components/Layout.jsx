import { useEffect, useState } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import SearchDialog from './SearchDialog';
import InviteModal from './InviteModal';
import { Skeleton } from './States';
import { useWorkspace } from '../store/workspace';
import { useNotifications } from '../store/notifications';
import { useUI } from '../store/ui';
import { apiError } from '../lib/api';

/** The signed-in shell: sidebar, top bar, and whichever workspace page is active. */
export default function Layout() {
  const { workspaceId } = useParams();
  const { current, selectWorkspace, loadWorkspaces } = useWorkspace();
  const { load: loadNotifications, checkDueSoon } = useNotifications();
  const toast = useUI((s) => s.toast);
  const navigate = useNavigate();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReady(false);
      try {
        await Promise.all([loadWorkspaces(), selectWorkspace(workspaceId)]);
        await loadNotifications();
        checkDueSoon();
      } catch (err) {
        toast(apiError(err), 'error');
        navigate('/workspaces', { replace: true });
        return;
      }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-[270px]">
        <Topbar onInvite={() => setInviteOpen(true)} />
        <main className="px-4 py-5 sm:px-6 sm:py-7">
          {ready && current ? (
            <Outlet />
          ) : (
            <div className="space-y-4">
              <Skeleton className="h-9 w-56" />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
              </div>
              <Skeleton className="h-64" />
            </div>
          )}
        </main>
      </div>

      <SearchDialog />
      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
