import { initials, cx } from '../lib/utils';

const sizes = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-lg' };

export default function Avatar({ user, size = 'sm', online = false, className = '' }) {
  const name = user?.name || 'Unknown';
  return (
    <span className={cx('relative inline-flex shrink-0', className)}>
      {user?.avatar ? (
        <img src={user.avatar} alt={name} className={cx(sizes[size], 'rounded-full object-cover ring-1 ring-white/15')} />
      ) : (
        <span
          className={cx(
            sizes[size],
            'grid place-items-center rounded-full font-bold text-white ring-1 ring-white/15',
            'bg-gradient-to-br from-iris-500 to-azure-500'
          )}
          title={name}
        >
          {initials(name)}
        </span>
      )}
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-[#070a13]" />
      )}
    </span>
  );
}
