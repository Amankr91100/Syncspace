import { useState } from 'react';
import { UserPlus, Trash2, Mail } from 'lucide-react';
import { useWorkspace } from '../store/workspace';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { apiError } from '../lib/api';
import InviteModal from '../components/InviteModal';
import Avatar from '../components/Avatar';
import { cx } from '../lib/utils';

export default function Team() {
  const { current, members, online, role, removeMember, changeRole } = useWorkspace();
  const me = useAuth((s) => s.user);
  const { toast, ask } = useUI();
  const [inviteOpen, setInviteOpen] = useState(false);

  const canManage = role === 'owner' || role === 'admin';

  const remove = async (member) => {
    const yes = await ask({
      title: `Remove ${member.user.name}?`,
      body: 'They lose access to every board and document in this workspace.',
      confirmLabel: 'Remove member',
    });
    if (!yes) return;
    try { await removeMember(member.user._id); toast('Member removed', 'success'); }
    catch (err) { toast(apiError(err), 'error'); }
  };

  const setRole = async (member, value) => {
    try { await changeRole(member.user._id, value); toast(`${member.user.name} is now ${value === 'admin' ? 'an admin' : 'a member'}`, 'success'); }
    catch (err) { toast(apiError(err), 'error'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Team</h1>
          <p className="text-sm muted">{members.length} {members.length === 1 ? 'person' : 'people'} in {current?.name}</p>
        </div>
        {canManage && <button className="btn-primary" onClick={() => setInviteOpen(true)}><UserPlus size={16} /> Invite</button>}
      </div>

      <div className="space-y-2">
        {members.map((m) => {
          const isOnline = online.includes(String(m.user._id));
          return (
            <div key={m.user._id} className="surface flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar user={m.user} size="md" online={isOnline} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {m.user.name}{String(m.user._id) === String(me?._id) && <span className="ml-1.5 text-xs muted">(you)</span>}
                </p>
                <p className="truncate text-xs muted">{m.user.email}</p>
              </div>
              <span className={cx('chip', isOnline ? '!text-emerald-300' : '')}>{isOnline ? 'Online' : 'Offline'}</span>

              {canManage && m.role !== 'owner' ? (
                <select
                  className="field !w-auto !py-1.5 !text-xs"
                  value={m.role}
                  onChange={(e) => setRole(m, e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              ) : (
                <span className="chip capitalize">{m.role}</span>
              )}

              {canManage && m.role !== 'owner' && (
                <button onClick={() => remove(m)} className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-500/15 hover:text-rose-300" aria-label={`Remove ${m.user.name}`}>
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {(current?.invites || []).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold text-white">Pending invites</h2>
          <div className="space-y-2">
            {current.invites.map((i) => (
              <div key={i._id} className="surface flex items-center gap-3 px-4 py-3 text-sm">
                <Mail size={16} className="text-iris-400" />
                <span className="flex-1 truncate">{i.email}</span>
                <span className="chip capitalize">{i.role}</span>
                <span className="chip">Waiting to sign up</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
}
