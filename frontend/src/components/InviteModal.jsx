import { useState } from 'react';
import Modal from './Modal';
import { useWorkspace } from '../store/workspace';
import { useUI } from '../store/ui';
import { apiError } from '../lib/api';

export default function InviteModal({ open, onClose }) {
  const { invite, current } = useWorkspace();
  const toast = useUI((s) => s.toast);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim()) return toast('Enter an email address', 'error');
    setBusy(true);
    try {
      await invite(email.trim(), role);
      toast(`Invite sent to ${email}`, 'success');
      setEmail('');
      onClose();
    } catch (err) {
      toast(apiError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={`Invite someone to ${current?.name || 'this workspace'}`}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={busy}>{busy ? 'Sending…' : 'Send invite'}</button>
        </div>
      }
    >
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-slate-300">
          Email address
          <input
            className="field mt-1.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="teammate@company.com"
          />
        </label>
        <label className="block text-xs font-semibold text-slate-300">
          Role
          <select className="field mt-1.5" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member — can work on boards</option>
            <option value="admin">Admin — can also manage the workspace</option>
          </select>
        </label>
        <p className="text-xs muted">
          If they already have a SyncSpace account they join right away. Otherwise the invite waits for them to sign up with this email.
        </p>
      </div>
    </Modal>
  );
}
