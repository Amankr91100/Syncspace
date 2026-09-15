import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2 } from 'lucide-react';
import api, { apiError } from '../lib/api';
import { useUI } from '../store/ui';
import { getSocket } from '../lib/socket';
import { Skeleton, EmptyState } from '../components/States';
import Avatar from '../components/Avatar';
import { timeAgo } from '../lib/utils';

export default function Documents() {
  const { workspaceId } = useParams();
  const { toast, ask } = useUI();
  const navigate = useNavigate();
  const [docs, setDocs] = useState(null);

  const load = () =>
    api.get('/documents', { params: { workspaceId } })
      .then(({ data }) => setDocs(data))
      .catch((err) => toast(apiError(err), 'error'));

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [workspaceId]);

  // Keep the list fresh when teammates add, edit or remove documents.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const refresh = () => load();
    socket.on('document:created', refresh);
    socket.on('document:deleted', refresh);
    socket.on('document:list-changed', refresh);
    return () => {
      socket.off('document:created', refresh);
      socket.off('document:deleted', refresh);
      socket.off('document:list-changed', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const create = async () => {
    try {
      const { data } = await api.post('/documents', { title: 'Untitled document', workspaceId });
      navigate(`/w/${workspaceId}/d/${data._id}`);
    } catch (err) { toast(apiError(err), 'error'); }
  };

  const remove = async (doc) => {
    const yes = await ask({ title: `Delete "${doc.title}"?`, body: 'Everyone in the workspace loses access to it.', confirmLabel: 'Delete document' });
    if (!yes) return;
    try { await api.delete(`/documents/${doc._id}`, { params: { workspaceId } }); toast('Document deleted', 'success'); load(); }
    catch (err) { toast(apiError(err), 'error'); }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Documents</h1>
          <p className="text-sm muted">Notes and specs shared with the whole workspace.</p>
        </div>
        <button className="btn-primary" onClick={create}><Plus size={16} /> New document</button>
      </div>

      {!docs ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}</div>
      ) : docs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          body="Write specs, meeting notes or a plan — everyone in the workspace can read and edit them."
          action={<button className="btn-primary mt-2" onClick={create}>Write the first one</button>}
        />
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d._id} className="surface group flex items-center gap-3 px-4 py-3 transition hover:border-iris-400/40">
              <FileText size={17} className="shrink-0 text-iris-400" />
              <Link to={`/w/${workspaceId}/d/${d._id}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-white">{d.title}</span>
                <span className="block truncate text-xs muted">Edited {timeAgo(d.updatedAt)}</span>
              </Link>
              {d.lastEditedBy && <Avatar user={d.lastEditedBy} size="xs" />}
              <button onClick={() => remove(d)} className="rounded-lg p-1.5 text-slate-500 opacity-0 transition hover:bg-rose-500/15 hover:text-rose-300 focus:opacity-100 group-hover:opacity-100" aria-label="Delete document">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
