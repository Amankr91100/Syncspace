import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trello, FileText, User, Columns3, SquareCheck } from 'lucide-react';
import api from '../lib/api';
import { useUI } from '../store/ui';
import { useWorkspace } from '../store/workspace';
import { PRIORITIES, cx } from '../lib/utils';

export default function SearchDialog() {
  const { searchOpen, setSearchOpen } = useUI();
  const { current, members } = useWorkspace();
  const [q, setQ] = useState('');
  const [priority, setPriority] = useState('');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('');
  const [results, setResults] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  // ⌘K / Ctrl+K opens search from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setSearchOpen]);

  useEffect(() => { if (searchOpen) setTimeout(() => inputRef.current?.focus(), 30); }, [searchOpen]);

  // Debounced query so typing doesn't fire a request per keystroke.
  useEffect(() => {
    if (!searchOpen || !current) return undefined;
    if (!q && !priority && !assignee && !status) { setResults(null); return undefined; }

    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const { data } = await api.get('/search', {
          params: { workspaceId: current._id, q, priority, assignee, status },
        });
        setResults(data);
        setCursor(0);
      } finally {
        setBusy(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [q, priority, assignee, status, searchOpen, current]);

  if (!searchOpen) return null;

  const flat = results
    ? [
        ...results.cards.map((c) => ({ kind: 'Task', icon: SquareCheck, label: c.title, sub: `${c.board?.title || ''} · ${c.list?.title || ''}`, to: `/w/${current._id}/b/${c.board?._id}` })),
        ...results.boards.map((b) => ({ kind: 'Board', icon: Trello, label: b.title, sub: b.description, to: `/w/${current._id}/b/${b._id}` })),
        ...results.lists.map((l) => ({ kind: 'List', icon: Columns3, label: l.title, sub: l.board?.title, to: `/w/${current._id}/b/${l.board?._id}` })),
        ...results.documents.map((d) => ({ kind: 'Doc', icon: FileText, label: d.title, sub: 'Document', to: `/w/${current._id}/d/${d._id}` })),
        ...results.members.map((m) => ({ kind: 'Person', icon: User, label: m.name, sub: m.email, to: `/w/${current._id}/team` })),
      ]
    : [];

  const go = (item) => { setSearchOpen(false); setQ(''); navigate(item.to); };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && flat[cursor]) go(flat[cursor]);
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center p-4 pt-[8vh]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
      <div className="surface relative w-full max-w-2xl animate-rise overflow-hidden">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Search size={17} className="text-slate-500" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tasks, boards, documents and people"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
          />
          {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-iris-400" />}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 px-4 py-2.5">
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="field !w-auto !py-1.5 !text-xs">
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="field !w-auto !py-1.5 !text-xs">
            <option value="">Anyone</option>
            {members.map((m) => <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field !w-auto !py-1.5 !text-xs">
            <option value="">Any status</option>
            <option value="open">Open</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-2">
          {!results && <p className="px-3 py-8 text-center text-sm muted">Start typing to search this workspace.</p>}
          {results && flat.length === 0 && (
            <p className="px-3 py-8 text-center text-sm muted">Nothing matched. Try a different word or clear the filters.</p>
          )}
          {flat.map((item, i) => (
            <button
              key={`${item.kind}-${item.label}-${i}`}
              onClick={() => go(item)}
              onMouseEnter={() => setCursor(i)}
              className={cx(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition',
                i === cursor ? 'bg-white/[0.09]' : 'hover:bg-white/[0.05]'
              )}
            >
              <item.icon size={16} className="shrink-0 text-iris-400" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-100">{item.label}</span>
                {item.sub && <span className="block truncate text-xs muted">{item.sub}</span>}
              </span>
              <span className="chip">{item.kind}</span>
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-4 border-t border-white/10 px-4 py-2 text-[11px] muted sm:flex">
          <span>↑↓ to move</span><span>↵ to open</span><span>esc to close</span>
        </div>
      </div>
    </div>
  );
}
