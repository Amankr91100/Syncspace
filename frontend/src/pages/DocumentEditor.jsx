import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Link2, CheckSquare, ArrowLeft, Check,
} from 'lucide-react';
import api, { apiError } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useUI } from '../store/ui';
import { useAuth } from '../store/auth';
import { Skeleton } from '../components/States';
import Avatar from '../components/Avatar';
import { timeAgo } from '../lib/utils';

const Tool = ({ icon: Icon, label, onClick }) => (
  <button onClick={onClick} title={label} aria-label={label} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white">
    <Icon size={16} />
  </button>
);

export default function DocumentEditor() {
  const { workspaceId, documentId } = useParams();
  const toast = useUI((s) => s.toast);
  const me = useAuth((s) => s.user);
  const navigate = useNavigate();

  const [doc, setDoc] = useState(null);
  const [title, setTitle] = useState('');
  const [status, setStatus] = useState('saved'); // saved | saving | conflict
  const [typers, setTypers] = useState([]);
  const editorRef = useRef(null);
  const versionRef = useRef(0);
  const saveTimer = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    api.get(`/documents/${documentId}`, { params: { workspaceId } })
      .then(({ data }) => {
        setDoc(data);
        setTitle(data.title);
        versionRef.current = data.version;
        if (editorRef.current) editorRef.current.innerHTML = data.content || '';
      })
      .catch((err) => { toast(apiError(err), 'error'); navigate(`/w/${workspaceId}/documents`, { replace: true }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  /**
   * Live editing. Remote saves replace the local copy only when the caret is
   * elsewhere — we don't yank text out from under someone mid-sentence, and the
   * version check on the server blocks the stale write instead.
   */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    socket.emit('doc:join', documentId);

    const onUpdated = ({ document: incoming, by }) => {
      versionRef.current = incoming.version;
      setDoc(incoming);
      if (String(by) === String(me?._id)) return;
      // Don't replace text while this person has the caret in the editor.
      const focused = window.document.activeElement === editorRef.current;
      if (!focused && editorRef.current) editorRef.current.innerHTML = incoming.content || '';
      setTitle(incoming.title);
    };
    const onTyping = ({ user, typing }) =>
      setTypers((prev) => (typing ? [...new Set([...prev, user.name])] : prev.filter((n) => n !== user.name)));

    socket.on('document:updated', onUpdated);
    socket.on('doc:typing', onTyping);
    return () => {
      socket.emit('doc:leave', documentId);
      socket.off('document:updated', onUpdated);
      socket.off('doc:typing', onTyping);
    };
  }, [documentId, me?._id]);

  const persist = useCallback(async (patch) => {
    setStatus('saving');
    try {
      const { data } = await api.put(`/documents/${documentId}`, { ...patch, version: versionRef.current, workspaceId });
      versionRef.current = data.version;
      setDoc(data);
      setStatus('saved');
    } catch (err) {
      if (err.response?.status === 409) {
        setStatus('conflict');
        toast('Someone saved a newer version. Reload to see it.', 'error');
      } else {
        setStatus('saved');
        toast(apiError(err), 'error');
      }
    }
  }, [documentId, workspaceId, toast]);

  /** Autosave: one save 900ms after typing stops. */
  const scheduleSave = () => {
    setStatus('saving');
    getSocket()?.emit('doc:typing', { documentId, typing: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => getSocket()?.emit('doc:typing', { documentId, typing: false }), 1200);

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      persist({ title, content: editorRef.current?.innerHTML || '' });
    }, 900);
  };

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const format = (command, value = null) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    scheduleSave();
  };

  const addLink = () => {
    const url = window.prompt('Link address');
    if (url) format('createLink', url);
  };

  const addCheckItem = () => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, '<div>☐ </div>');
    scheduleSave();
  };

  if (!doc) return <div className="space-y-3"><Skeleton className="h-10 w-72" /><Skeleton className="h-96" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate(`/w/${workspaceId}/documents`)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10" aria-label="Back to documents">
          <ArrowLeft size={18} />
        </button>
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); scheduleSave(); }}
          className="min-w-0 flex-1 bg-transparent text-xl font-extrabold tracking-tight text-white outline-none sm:text-2xl"
          placeholder="Untitled document"
        />
        <span className="chip shrink-0">
          {status === 'saving' ? 'Saving…' : status === 'conflict' ? 'Out of date' : <><Check size={12} /> Saved</>}
        </span>
      </div>

      <div className="surface flex flex-wrap items-center gap-0.5 p-1.5">
        <Tool icon={Heading1} label="Heading" onClick={() => format('formatBlock', '<h2>')} />
        <Tool icon={Heading2} label="Subheading" onClick={() => format('formatBlock', '<h3>')} />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <Tool icon={Bold} label="Bold" onClick={() => format('bold')} />
        <Tool icon={Italic} label="Italic" onClick={() => format('italic')} />
        <Tool icon={Underline} label="Underline" onClick={() => format('underline')} />
        <span className="mx-1 h-5 w-px bg-white/10" />
        <Tool icon={List} label="Bulleted list" onClick={() => format('insertUnorderedList')} />
        <Tool icon={ListOrdered} label="Numbered list" onClick={() => format('insertOrderedList')} />
        <Tool icon={CheckSquare} label="Checklist item" onClick={addCheckItem} />
        <Tool icon={Link2} label="Add link" onClick={addLink} />
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={scheduleSave}
        onBlur={() => persist({ title, content: editorRef.current?.innerHTML || '' })}
        className="surface min-h-[55vh] p-5 text-[15px] leading-relaxed text-slate-200 outline-none
                   [&_a]:text-azure-400 [&_a]:underline
                   [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-white
                   [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-white
                   [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
        data-placeholder="Start writing…"
      />

      <div className="flex flex-wrap items-center gap-3 text-xs muted">
        {doc.lastEditedBy && (
          <span className="flex items-center gap-1.5">
            <Avatar user={doc.lastEditedBy} size="xs" /> Last edited by {doc.lastEditedBy.name} {timeAgo(doc.updatedAt)}
          </span>
        )}
        {typers.length > 0 && <span className="italic">{typers.join(', ')} {typers.length > 1 ? 'are' : 'is'} typing…</span>}
      </div>
    </div>
  );
}
