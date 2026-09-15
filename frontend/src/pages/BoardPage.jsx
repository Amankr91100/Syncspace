import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Plus, MoreHorizontal, Trash2, Filter, X, GripVertical, ArrowLeft } from 'lucide-react';
import { useBoard, selectListCards } from '../store/board';
import { useWorkspace } from '../store/workspace';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { getSocket } from '../lib/socket';
import { apiError } from '../lib/api';
import CardTile from '../components/CardTile';
import CardModal from '../components/CardModal';
import Avatar from '../components/Avatar';
import { BoardSkeleton } from '../components/States';
import { PRIORITIES, reorder, cx } from '../lib/utils';

export default function BoardPage() {
  const { workspaceId, boardId } = useParams();
  const board = useBoard((s) => s.board);
  const lists = useBoard((s) => s.lists);
  const loading = useBoard((s) => s.loading);
  const filters = useBoard((s) => s.filters);
  const store = useBoard();
  const { members, online } = useWorkspace();
  const me = useAuth((s) => s.user);
  const { toast, ask } = useUI();
  const navigate = useNavigate();

  const [openCardId, setOpenCardId] = useState(null);
  const [composing, setComposing] = useState(null); // listId currently showing the new-card input
  const [draftTitle, setDraftTitle] = useState('');
  const [addingList, setAddingList] = useState(false);
  const [listTitle, setListTitle] = useState('');
  const [menuFor, setMenuFor] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewers, setViewers] = useState([]);

  useEffect(() => {
    store.load(boardId, workspaceId).catch((err) => {
      toast(apiError(err), 'error');
      navigate(`/w/${workspaceId}/boards`, { replace: true });
    });
    return () => store.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, workspaceId]);

  /**
   * Board room subscription. Every handler ignores events this client caused
   * (`by === me`) because the optimistic update already applied them.
   */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    socket.emit('board:join', { workspaceId, boardId });

    const mine = (by) => String(by) === String(me?._id);

    const onCardCreated = (card) => store.applyCardCreated(card);
    const onCardUpdated = (card) => store.applyCardUpdated(card);
    const onCardDeleted = ({ cardId }) => {
      store.applyCardDeleted(cardId);
      setOpenCardId((open) => (open === cardId ? null : open));
    };
    const onCardMoved = (payload) => { if (!mine(payload.by)) store.applyCardMoved(payload); };
    const onListCreated = (list) => store.applyListCreated(list);
    const onListUpdated = (list) => store.applyListUpdated(list);
    const onListDeleted = ({ listId }) => store.applyListDeleted(listId);
    const onListReordered = ({ order, by }) => { if (!mine(by)) store.applyListReordered(order); };
    const onBoardUpdated = (b) => store.applyBoardUpdated(b);
    const onViewerJoined = (user) => setViewers((v) => (v.some((x) => x.id === user.id) ? v : [...v, user]));
    const onViewerLeft = (user) => setViewers((v) => v.filter((x) => x.id !== user.id));

    socket.on('card:created', onCardCreated);
    socket.on('card:updated', onCardUpdated);
    socket.on('card:deleted', onCardDeleted);
    socket.on('card:moved', onCardMoved);
    socket.on('list:created', onListCreated);
    socket.on('list:updated', onListUpdated);
    socket.on('list:deleted', onListDeleted);
    socket.on('list:reordered', onListReordered);
    socket.on('board:updated', onBoardUpdated);
    socket.on('board:viewer-joined', onViewerJoined);
    socket.on('board:viewer-left', onViewerLeft);

    // Cleanup matters: without this, revisiting a board stacks duplicate listeners.
    return () => {
      socket.emit('board:leave', boardId);
      socket.off('card:created', onCardCreated);
      socket.off('card:updated', onCardUpdated);
      socket.off('card:deleted', onCardDeleted);
      socket.off('card:moved', onCardMoved);
      socket.off('list:created', onListCreated);
      socket.off('list:updated', onListUpdated);
      socket.off('list:deleted', onListDeleted);
      socket.off('list:reordered', onListReordered);
      socket.off('board:updated', onBoardUpdated);
      socket.off('board:viewer-joined', onViewerJoined);
      socket.off('board:viewer-left', onViewerLeft);
      setViewers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId, workspaceId, me?._id]);

  const onDragEnd = async (result) => {
    const { source, destination, draggableId, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    try {
      if (type === 'LIST') {
        const order = reorder(lists.map((l) => l._id), source.index, destination.index);
        await store.reorderLists(order, workspaceId);
      } else {
        await store.moveCard(
          { cardId: draggableId, toListId: destination.droppableId, position: destination.index },
          workspaceId
        );
      }
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  const createCard = async (listId) => {
    const title = draftTitle.trim();
    if (!title) return setComposing(null);
    setDraftTitle('');
    try {
      await store.addCard(listId, { title }, workspaceId);
    } catch (err) {
      toast(apiError(err), 'error');
    }
  };

  const createList = async () => {
    const title = listTitle.trim();
    if (!title) return setAddingList(false);
    setListTitle('');
    setAddingList(false);
    try { await store.addList(title, workspaceId); }
    catch (err) { toast(apiError(err), 'error'); }
  };

  const deleteList = async (list) => {
    setMenuFor(null);
    const yes = await ask({ title: `Delete ${list.title}?`, body: 'Every task in this list is deleted too.', confirmLabel: 'Delete list' });
    if (!yes) return;
    try { await store.removeList(list._id, workspaceId); toast('List deleted', 'success'); }
    catch (err) { toast(apiError(err), 'error'); }
  };

  const rename = async (list, title) => {
    if (!title.trim() || title === list.title) return;
    try { await store.renameList(list._id, title.trim(), workspaceId); }
    catch (err) { toast(apiError(err), 'error'); }
  };

  const allLabels = [...new Set(useBoard.getState().cards.flatMap((c) => c.labels || []))];
  const filtersActive = filters.q || filters.assignee || filters.priority || filters.label;

  if (loading) return <BoardSkeleton />;

  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={() => navigate(`/w/${workspaceId}/boards`)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 lg:hidden">
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-extrabold tracking-tight text-white sm:text-2xl">{board?.title}</h1>
          {board?.description && <p className="truncate text-sm muted">{board.description}</p>}
        </div>

        <div className="flex items-center gap-2">
          {viewers.length > 0 && (
            <div className="hidden -space-x-2 sm:flex" title="Also viewing this board">
              {viewers.slice(0, 4).map((v) => <Avatar key={v.id} user={v} size="xs" online />)}
            </div>
          )}
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={cx('btn-ghost !px-3 !py-2', filtersActive && '!border-iris-400/50 !text-iris-300')}
          >
            <Filter size={15} /> Filter
          </button>
        </div>
      </header>

      {showFilters && (
        <div className="surface mb-4 flex flex-wrap items-center gap-2 p-3">
          <input
            className="field !w-auto flex-1 !py-2 !text-[13px] sm:min-w-[200px]"
            value={filters.q}
            onChange={(e) => store.setFilters({ q: e.target.value })}
            placeholder="Filter cards on this board"
          />
          <select className="field !w-auto !py-2 !text-[13px]" value={filters.assignee} onChange={(e) => store.setFilters({ assignee: e.target.value })}>
            <option value="">Anyone</option>
            {members.map((m) => <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
          </select>
          <select className="field !w-auto !py-2 !text-[13px]" value={filters.priority} onChange={(e) => store.setFilters({ priority: e.target.value })}>
            <option value="">Any priority</option>
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <select className="field !w-auto !py-2 !text-[13px]" value={filters.label} onChange={(e) => store.setFilters({ label: e.target.value })}>
            <option value="">Any label</option>
            {allLabels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          {filtersActive && (
            <button className="btn-ghost !px-3 !py-2" onClick={store.resetFilters}><X size={14} /> Clear</button>
          )}
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="LIST">
          {(dropProvided) => (
            <div
              ref={dropProvided.innerRef}
              {...dropProvided.droppableProps}
              className="flex flex-1 gap-3 overflow-x-auto pb-4 sm:gap-4"
            >
              {lists.map((list, listIndex) => (
                <Draggable key={list._id} draggableId={`list-${list._id}`} index={listIndex}>
                  {(listProvided) => (
                    <section
                      ref={listProvided.innerRef}
                      {...listProvided.draggableProps}
                      className="flex max-h-full w-[280px] shrink-0 flex-col rounded-2xl border border-white/10 bg-white/[0.03] sm:w-[300px]"
                    >
                      <header className="flex items-center gap-2 px-3 py-2.5">
                        <span {...listProvided.dragHandleProps} className="cursor-grab text-slate-600 hover:text-slate-400" aria-label="Reorder list">
                          <GripVertical size={15} />
                        </span>
                        <input
                          defaultValue={list.title}
                          onBlur={(e) => rename(list, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                          className="min-w-0 flex-1 truncate rounded-md bg-transparent px-1 py-0.5 text-[13px] font-bold text-white outline-none focus:bg-white/10"
                          aria-label="List title"
                        />
                        <span className="chip !px-2 !py-0.5">{selectListCards(useBoard.getState(), list._id).length}</span>
                        <div className="relative">
                          <button onClick={() => setMenuFor(menuFor === list._id ? null : list._id)} className="rounded-md p-1 text-slate-500 hover:bg-white/10 hover:text-slate-200" aria-label="List options">
                            <MoreHorizontal size={15} />
                          </button>
                          {menuFor === list._id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setMenuFor(null)} />
                              <div className="surface absolute right-0 z-20 mt-1 w-40 p-1.5">
                                <button onClick={() => { setMenuFor(null); setComposing(list._id); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-slate-300 hover:bg-white/10">
                                  <Plus size={14} /> Add task
                                </button>
                                <button onClick={() => deleteList(list)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] text-rose-300 hover:bg-rose-500/10">
                                  <Trash2 size={14} /> Delete list
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </header>

                      <Droppable droppableId={list._id} type="CARD">
                        {(cardDrop, cardSnap) => (
                          <div
                            ref={cardDrop.innerRef}
                            {...cardDrop.droppableProps}
                            className={cx(
                              'flex-1 space-y-2 overflow-y-auto px-2.5 pb-2 transition-colors',
                              cardSnap.isDraggingOver && 'bg-iris-500/[0.07]'
                            )}
                          >
                            {selectListCards(useBoard.getState(), list._id).map((card, i) => (
                              <CardTile key={card._id} card={card} index={i} onOpen={(c) => setOpenCardId(c._id)} />
                            ))}
                            {cardDrop.placeholder}

                            {selectListCards(useBoard.getState(), list._id).length === 0 && composing !== list._id && (
                              <p className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[12px] muted">
                                Nothing here yet.
                              </p>
                            )}
                          </div>
                        )}
                      </Droppable>

                      <div className="px-2.5 pb-2.5">
                        {composing === list._id ? (
                          <div className="space-y-2">
                            <textarea
                              autoFocus
                              className="field !py-2 !text-[13px]"
                              rows={2}
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); createCard(list._id); }
                                if (e.key === 'Escape') { setComposing(null); setDraftTitle(''); }
                              }}
                              placeholder="Task title, then Enter"
                            />
                            <div className="flex gap-2">
                              <button className="btn-primary !py-1.5 !text-[12px]" onClick={() => createCard(list._id)}>Add task</button>
                              <button className="btn-ghost !py-1.5 !text-[12px]" onClick={() => { setComposing(null); setDraftTitle(''); }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setComposing(list._id); setDraftTitle(''); }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-[13px] font-medium text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                          >
                            <Plus size={15} /> Add a task
                          </button>
                        )}
                      </div>
                    </section>
                  )}
                </Draggable>
              ))}
              {dropProvided.placeholder}

              <div className="w-[280px] shrink-0 sm:w-[300px]">
                {addingList ? (
                  <div className="surface space-y-2 p-3">
                    <input
                      autoFocus
                      className="field !py-2 !text-[13px]"
                      value={listTitle}
                      onChange={(e) => setListTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') setAddingList(false); }}
                      placeholder="List name"
                    />
                    <div className="flex gap-2">
                      <button className="btn-primary !py-1.5 !text-[12px]" onClick={createList}>Add list</button>
                      <button className="btn-ghost !py-1.5 !text-[12px]" onClick={() => setAddingList(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingList(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/15 py-3 text-[13px] font-semibold text-slate-400 hover:border-iris-400/50 hover:text-iris-300"
                  >
                    <Plus size={16} /> Add a list
                  </button>
                )}
              </div>
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {openCardId && <CardModal cardId={openCardId} onClose={() => setOpenCardId(null)} />}
    </div>
  );
}
