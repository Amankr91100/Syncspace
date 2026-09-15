import { cx } from '../lib/utils';

export const Skeleton = ({ className = '' }) => (
  <div className={cx('relative overflow-hidden rounded-xl bg-white/[0.05]', className)}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

export const BoardSkeleton = () => (
  <div className="flex gap-4 overflow-hidden">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="w-72 shrink-0 space-y-3">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    ))}
  </div>
);

export const EmptyState = ({ icon: Icon, title, body, action }) => (
  <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
    {Icon && (
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-iris-500/20 to-azure-500/20 text-iris-400">
        <Icon size={22} />
      </span>
    )}
    <h3 className="text-base font-bold">{title}</h3>
    {body && <p className="max-w-sm text-sm leading-relaxed muted">{body}</p>}
    {action}
  </div>
);
