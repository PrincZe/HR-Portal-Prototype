import { cn } from '@/lib/utils';

interface CircularTypeBadgeProps {
  type: 'hrl' | 'hrops' | 'psd';
  className?: string;
}

export function CircularTypeBadge({ type, className }: CircularTypeBadgeProps) {
  const typeLabels = {
    hrl: 'HRL Circular',
    hrops: 'HR Ops Circular',
    psd: 'PSD Circular',
  };

  return (
    <span
      className={cn(
        'inline-block px-3 py-1 bg-[#17A2B8] text-white text-sm font-semibold rounded',
        className
      )}
    >
      • {typeLabels[type]}
    </span>
  );
}
