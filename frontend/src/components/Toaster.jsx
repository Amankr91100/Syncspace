import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { useUI } from '../store/ui';
import { cx } from '../lib/utils';

const tones = {
  success: { icon: CheckCircle2, ring: 'border-emerald-400/30', color: 'text-emerald-300' },
  error: { icon: AlertTriangle, ring: 'border-rose-400/30', color: 'text-rose-300' },
  info: { icon: Info, ring: 'border-iris-400/30', color: 'text-iris-400' },
};

export default function Toaster() {
  const { toasts, dismissToast } = useUI();

  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 space-y-2 sm:left-auto sm:right-4 sm:translate-x-0">
      {toasts.map((t) => {
        const { icon: Icon, ring, color } = tones[t.tone] || tones.info;
        return (
          <div key={t.id} className={cx('surface pointer-events-auto flex animate-rise items-start gap-3 px-4 py-3', ring)}>
            <Icon size={17} className={cx('mt-0.5 shrink-0', color)} />
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            <button onClick={() => dismissToast(t.id)} className="text-slate-500 hover:text-slate-200" aria-label="Dismiss">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
