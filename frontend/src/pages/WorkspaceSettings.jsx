import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Trash2 } from 'lucide-react';
import { useWorkspace } from '../store/workspace';
import { useUI } from '../store/ui';
import { apiError } from '../lib/api';

const ICONS = ['🚀', '🎯', '🧭', '🛠️', '📦', '🌱', '⚡', '🧩'];

export default function WorkspaceSettings() {
  const { current, role, updateWorkspace, deleteWorkspace } = useWorkspace();
  const { toast, ask } = useUI();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', icon: '🚀' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (current) setForm({ name: current.name, description: current.description || '', icon: current.icon });
  }, [current]);

  const canEdit = role === 'owner' || role === 'admin';

  const save = async () => {
    if (!form.name.trim()) return toast('The workspace needs a name', 'error');
    setBusy(true);
    try { await updateWorkspace(form); toast('Settings saved', 'success'); }
    catch (err) { toast(apiError(err), 'error'); }
    finally { setBusy(false); }
  };

  const destroy = async () => {
    const yes = await ask({
      title: `Delete ${current.name}?`,
      body: 'Every board, task, comment and document in this workspace is permanently removed.',
      confirmLabel: 'Delete workspace',
    });
    if (!yes) return;
    try { await deleteWorkspace(); toast('Workspace deleted', 'success'); navigate('/workspaces', { replace: true }); }
    catch (err) { toast(apiError(err), 'error'); }
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Workspace settings</h1>
        <p className="text-sm muted">{canEdit ? 'Change how this workspace appears to your team.' : 'Only owners and admins can change these.'}</p>
      </div>

      <section className="surface space-y-4 p-5">
        <div>
          <span className="text-xs font-semibold text-slate-300">Icon</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {ICONS.map((i) => (
              <button
                key={i}
                disabled={!canEdit}
                onClick={() => setForm({ ...form, icon: i })}
                className={`grid h-10 w-10 place-items-center rounded-xl border text-lg transition disabled:opacity-40 ${
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
          <input className="field mt-1.5" disabled={!canEdit} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </label>

        <label className="block text-xs font-semibold text-slate-300">
          Description
          <textarea className="field mt-1.5 min-h-[90px]" disabled={!canEdit} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </label>

        {canEdit && (
          <button className="btn-primary" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Saving…' : 'Save changes'}</button>
        )}
      </section>

      {role === 'owner' && (
        <section className="surface space-y-3 border-rose-400/20 p-5">
          <h2 className="text-sm font-bold text-rose-300">Delete this workspace</h2>
          <p className="text-[13px] leading-relaxed muted">
            This removes every board, task, comment and document inside it. There is no undo.
          </p>
          <button className="btn-danger" onClick={destroy}><Trash2 size={15} /> Delete workspace</button>
        </section>
      )}
    </div>
  );
}
