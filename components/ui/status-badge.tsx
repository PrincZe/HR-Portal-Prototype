import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'valid' | 'obsolete';
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center text-lg font-semibold',
        status === 'valid' ? 'text-green-600' : 'text-red-600',
        className
      )}
    >
      {status === 'valid' ? '✓' : '✕'}
    </span>
  );
}
