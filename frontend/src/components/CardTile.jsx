import { Draggable } from 'react-beautiful-dnd';
import { CalendarDays, CheckSquare, MessageSquare, Paperclip } from 'lucide-react';
import Avatar from './Avatar';
import { cx, priorityTone, shortDate, dueState } from '../lib/utils';

const dueTone = {
  overdue: 'text-rose-300 bg-rose-500/15',
  today: 'text-amber-300 bg-amber-500/15',
  upcoming: 'text-slate-300 bg-white/10',
  none: 'text-slate-400 bg-white/[0.06]',
};

export default function CardTile({ card, index, onOpen }) {
  const done = (card.checklist || []).filter((i) => i.done).length;
  const total = (card.checklist || []).length;
  const state = dueState(card.dueDate, card.completed);

  return (
    <Draggable draggableId={String(card._id)} index={index}>
      {(provided, snapshot) => (
        <article
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => onOpen(card)}
          onKeyDown={(e) => { if (e.key === 'Enter') onOpen(card); }}
          role="button"
          tabIndex={0}
          className={cx(
            'cursor-pointer rounded-xl border bg-[#0d1120] p-3 transition',
            snapshot.isDragging
              ? 'border-iris-400/60 shadow-lift rotate-[.6deg]'
              : 'border-white/10 hover:border-iris-400/40'
          )}
        >
          <div className="flex items-start gap-2">
            <span className={cx('chip !px-2 !py-0.5 border', priorityTone(card.priority))}>{card.priority}</span>
            {card.completed && <span className="chip !px-2 !py-0.5 border border-emerald-400/25 bg-emerald-500/15 text-emerald-300">done</span>}
          </div>

          <h4 className="mt-2 text-[13px] font-semibold leading-snug text-slate-100">{card.title}</h4>

          {(card.labels || []).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {card.labels.slice(0, 3).map((l) => <span key={l} className="chip !py-0.5 !text-[10px]">{l}</span>)}
            </div>
          )}

          <div className="mt-3 flex items-center gap-2.5 text-[11px] muted">
            {card.dueDate && (
              <span className={cx('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium', dueTone[state])}>
                <CalendarDays size={11} /> {shortDate(card.dueDate)}
              </span>
            )}
            {total > 0 && <span className="inline-flex items-center gap-1"><CheckSquare size={11} /> {done}/{total}</span>}
            {card.commentCount > 0 && <span className="inline-flex items-center gap-1"><MessageSquare size={11} /> {card.commentCount}</span>}
            {(card.attachments || []).length > 0 && (
              <span className="inline-flex items-center gap-1"><Paperclip size={11} /> {card.attachments.length}</span>
            )}
            <span className="ml-auto">{card.assignee && <Avatar user={card.assignee} size="xs" />}</span>
          </div>
        </article>
      )}
    </Draggable>
  );
}
