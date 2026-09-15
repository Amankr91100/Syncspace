import { useEffect, useRef, useState } from 'react';
import {
  Trash2, Plus, Send, CalendarDays, Flag, User as UserIcon, Tag, CheckSquare, Paperclip, X,
} from 'lucide-react';
import Modal from './Modal';
import Avatar from './Avatar';
import api, { apiError } from '../lib/api';
import { getSocket } from '../lib/socket';
import { useBoard } from '../store/board';
import { useWorkspace } from '../store/workspace';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { PRIORITIES, timeAgo, cx } from '../lib/utils';

/**
 * Task detail panel. Joins the card's own socket room so comments and edits
 * from other people appear while it's open, and leaves it on close.
 */
export default function CardModal({ cardId, onClose }) {
  const workspaceId = useWorkspace((s) => s.current?._id);
  const members = useWorkspace((s) => s.members);
  const lists = useBoard((s) => s.lists);
  const patchCard = useBoard((s) => s.patchCard);
  const removeCard = useBoard((s) => s.removeCard);
  const moveCard = useBoard((s) => s.moveCard);
  const me = useAuth((s) => s.user);
  const { toast, ask } = useUI();

  const [card, setCard] = useState(null);
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState('');
  const [typers, setTypers] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const [newItem, setNewItem] = useState('');
  const [newFile, setNewFile] = useState({ name: '', url: '' });
  const typingTimer = useRef(null);
  const commentsEnd = useRef(null);

  useEffect(() => {
    let alive = true;
    api.get(`/cards/${cardId}`, { params: { workspaceId } })
      .then(({ data }) => { if (alive) { setCard(data.card); setComments(data.comments); } })
      .catch((err) => { toast(apiError(err), 'error'); onClose(); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    socket.emit('card:join', cardId);

    const onComment = (c) => setComments((prev) => (prev.some((x) => x._id === c._id) ? prev : [...prev, c]));
    const onCommentDeleted = ({ commentId }) => setComments((prev) => prev.filter((c) => c._id !== commentId));
    const onDetail = (updated) => setCard((prev) => (prev ? { ...prev, ...updated } : updated));
    const onTyping = ({ user, typing }) =>
      setTypers((prev) => (typing ? [...new Set([...prev, user.name])] : prev.filter((n) => n !== user.name)));

    socket.on('comment:created', onComment);
    socket.on('comment:deleted', onCommentDeleted);
    socket.on('card:detail-updated', onDetail);
    socket.on('card:typing', onTyping);

    return () => {
      socket.emit('card:leave', cardId);
      socket.off('comment:created', onComment);
      socket.off('comment:deleted', onCommentDeleted);
      socket.off('card:detail-updated', onDetail);
      socket.off('card:typing', onTyping);
    };
  }, [cardId]);

  useEffect(() => { commentsEnd.current?.scrollIntoView({ block: 'nearest' }); }, [comments.length]);

  if (!card) {
    return <Modal open title="Loading task" onClose={onClose}><p className="py-10 text-center text-sm muted">Fetching the task…</p></Modal>;
  }

  const save = async (patch) => {
    setCard((prev) => ({ ...prev, ...patch }));
    try {
      const updated = await patchCard(cardId, patch, workspaceId);
      setCard(updated);
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  const changeList = async (toListId) => {
    if (toListId === String(card.list)) return;
    setCard((prev) => ({ ...prev, list: toListId }));
    try {
      await moveCard({ cardId, toListId, position: 0 }, workspaceId);
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  const signalTyping = () => {
    const socket = getSocket();
    socket?.emit('card:typing', { cardId, typing: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket?.emit('card:typing', { cardId, typing: false }), 1200);
  };

  const sendComment = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    getSocket()?.emit('card:typing', { cardId, typing: false });
    try {
      const { data } = await api.post('/comments', { text, cardId, workspaceId });
      setComments((prev) => (prev.some((c) => c._id === data._id) ? prev : [...prev, data]));
    } catch (err) {
      toast(apiError(err), 'error');
      setDraft(text);
    }
  };

  const deleteComment = async (id) => {
    setComments((prev) => prev.filter((c) => c._id !== id));
    try { await api.delete(`/comments/${id}`, { params: { workspaceId } }); }
    catch (err) { toast(apiError(err), 'error'); }
  };

  const toggleItem = async (itemId) => {
    try {
      const { data } = await api.put(`/cards/${cardId}/checklist/${itemId}`, { workspaceId });
      setCard(data);
    } catch (err) { toast(apiError(err), 'error'); }
  };

  const addItem = () => {
    if (!newItem.trim()) return;
    save({ checklist: [...(card.checklist || []), { text: newItem.trim(), done: false }] });
    setNewItem('');
  };

  const addLabel = () => {
    const l = newLabel.trim();
    if (!l || (card.labels || []).includes(l)) return setNewLabel('');
    save({ labels: [...(card.labels || []), l] });
    setNewLabel('');
  };

  const addAttachment = () => {
    if (!newFile.name.trim() || !newFile.url.trim()) return toast('Add both a name and a link', 'error');
    save({ attachments: [...(card.attachments || []), newFile] });
    setNewFile({ name: '', url: '' });
  };

  const destroy = async () => {
    const yes = await ask({ title: `Delete "${card.title}"?`, body: 'The task and its comments are removed for everyone.', confirmLabel: 'Delete task' });
    if (!yes) return;
    try { await removeCard(cardId, workspaceId); toast('Task deleted', 'success'); onClose(); }
    catch (err) { toast(apiError(err), 'error'); }
  };

  const doneCount = (card.checklist || []).filter((i) => i.done).length;
  const total = (card.checklist || []).length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title="Task details"
      footer={
        <div className="flex items-center justify-between gap-2">
          <button className="btn-ghost !text-rose-300" onClick={destroy}><Trash2 size={15} /> Delete task</button>
          <button className="btn-primary" onClick={onClose}>Done</button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-5">
          <input
            className="w-full bg-transparent text-lg font-extrabold text-white outline-none"
            value={card.title}
            onChange={(e) => setCard({ ...card, title: e.target.value })}
            onBlur={(e) => e.target.value.trim() && e.target.value !== card.title && save({ title: e.target.value.trim() })}
          />

          <label className="block text-xs font-semibold text-slate-300">
            Description
            <textarea
              className="field mt-1.5 min-h-[110px]"
              value={card.description || ''}
              onChange={(e) => setCard({ ...card, description: e.target.value })}
              onBlur={(e) => save({ description: e.target.value })}
              placeholder="Add context, links or acceptance criteria"
            />
          </label>

          <section>
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold text-slate-300"><CheckSquare size={14} /> Checklist</h3>
              {total > 0 && <span className="text-[11px] muted">{doneCount}/{total}</span>}
            </div>
            {total > 0 && (
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-iris-500 to-azure-500" style={{ width: `${pct}%` }} />
              </div>
            )}
            <ul className="mt-3 space-y-1.5">
              {(card.checklist || []).map((item) => (
                <li key={item._id} className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-white/5">
                  <input type="checkbox" checked={item.done} onChange={() => toggleItem(item._id)} className="h-4 w-4 accent-iris-500" />
                  <span className={cx('flex-1 text-[13px]', item.done ? 'text-slate-500 line-through' : 'text-slate-200')}>{item.text}</span>
                  <button
                    onClick={() => save({ checklist: card.checklist.filter((i) => i._id !== item._id) })}
                    className="text-slate-600 hover:text-rose-300"
                    aria-label="Remove item"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex gap-2">
              <input className="field !py-2 !text-[13px]" value={newItem} onChange={(e) => setNewItem(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addItem()} placeholder="Add a subtask" />
              <button className="btn-ghost !px-3 !py-2" onClick={addItem}><Plus size={15} /></button>
            </div>
          </section>

          <section>
            <h3 className="flex items-center gap-2 text-xs font-bold text-slate-300"><Paperclip size={14} /> Attachments</h3>
            <ul className="mt-2 space-y-1.5">
              {(card.attachments || []).map((a, i) => (
                <li key={`${a.url}-${i}`} className="flex items-center gap-2 text-[13px]">
                  <a href={a.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-azure-400 hover:underline">{a.name}</a>
                  <button onClick={() => save({ attachments: card.attachments.filter((_, idx) => idx !== i) })} className="text-slate-600 hover:text-rose-300"><X size={14} /></button>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input className="field !py-2 !text-[13px]" value={newFile.name} onChange={(e) => setNewFile({ ...newFile, name: e.target.value })} placeholder="File name" />
              <input className="field !py-2 !text-[13px]" value={newFile.url} onChange={(e) => setNewFile({ ...newFile, url: e.target.value })} placeholder="https://link-to-file" />
              <button className="btn-ghost !px-3 !py-2" onClick={addAttachment}><Plus size={15} /></button>
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-slate-300">Comments</h3>
            <ul className="mt-3 space-y-3">
              {comments.map((c) => (
                <li key={c._id} className="flex gap-2.5">
                  <Avatar user={c.author} size="xs" />
                  <div className="min-w-0 flex-1 rounded-xl bg-white/[0.04] px-3 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold text-white">{c.author?.name}</span>
                      <span className="text-[11px] muted">{timeAgo(c.createdAt)}</span>
                      {String(c.author?._id) === String(me?._id) && (
                        <button onClick={() => deleteComment(c._id)} className="ml-auto text-slate-600 hover:text-rose-300"><X size={13} /></button>
                      )}
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap text-[13px] leading-snug text-slate-300">{c.text}</p>
                  </div>
                </li>
              ))}
              <div ref={commentsEnd} />
            </ul>

            {typers.length > 0 && (
              <p className="mt-2 text-[11px] italic muted">{typers.join(', ')} {typers.length > 1 ? 'are' : 'is'} typing…</p>
            )}

            <div className="mt-3 flex gap-2">
              <input
                className="field !py-2 !text-[13px]"
                value={draft}
                onChange={(e) => { setDraft(e.target.value); signalTyping(); }}
                onKeyDown={(e) => e.key === 'Enter' && sendComment()}
                placeholder="Write a comment — use @name to mention someone"
              />
              <button className="btn-primary !px-3 !py-2" onClick={sendComment} aria-label="Send comment"><Send size={15} /></button>
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><UserIcon size={13} /> Assignee</span>
            <select
              className="field mt-1.5 !py-2 !text-[13px]"
              value={card.assignee?._id || card.assignee || ''}
              onChange={(e) => save({ assignee: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {members.map((m) => <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><Flag size={13} /> Priority</span>
            <select className="field mt-1.5 !py-2 !text-[13px]" value={card.priority} onChange={(e) => save({ priority: e.target.value })}>
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            List
            <select className="field mt-1.5 !py-2 !text-[13px]" value={String(card.list)} onChange={(e) => changeList(e.target.value)}>
              {lists.map((l) => <option key={l._id} value={l._id}>{l.title}</option>)}
            </select>
          </label>

          <label className="block text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><CalendarDays size={13} /> Due date</span>
            <input
              type="date"
              className="field mt-1.5 !py-2 !text-[13px]"
              value={card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ''}
              onChange={(e) => save({ dueDate: e.target.value || null })}
            />
          </label>

          <div className="text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5"><Tag size={13} /> Labels</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {(card.labels || []).map((l) => (
                <span key={l} className="chip">
                  {l}
                  <button onClick={() => save({ labels: card.labels.filter((x) => x !== l) })} className="text-slate-500 hover:text-rose-300"><X size={11} /></button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input className="field !py-1.5 !text-[12px]" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addLabel()} placeholder="design, api…" />
              <button className="btn-ghost !px-2.5 !py-1.5" onClick={addLabel}><Plus size={14} /></button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <input type="checkbox" className="h-4 w-4 accent-emerald-500" checked={!!card.completed} onChange={(e) => save({ completed: e.target.checked })} />
            Mark as complete
          </label>

          <div className="border-t border-white/10 pt-3">
            <h3 className="text-xs font-bold text-slate-300">Activity</h3>
            <ul className="mt-2 space-y-2">
              {[...(card.activity || [])].reverse().slice(0, 8).map((a) => (
                <li key={a._id} className="text-[11px] leading-snug muted">
                  {a.message} · {timeAgo(a.createdAt)}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] muted">Created {timeAgo(card.createdAt)} · Updated {timeAgo(card.updatedAt)}</p>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
