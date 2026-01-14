import { cn } from '@/lib/utils';

interface CircularTypeBadgeProps {
  type: 'hrl' | 'hrops' | 'psd' | 'psd_minute';
  className?: string;
}

export function CircularTypeBadge({ type, className }: CircularTypeBadgeProps) {
  const typeLabels = {
    hrl: 'HRL Circular',
    hrops: 'HR Ops Circular',
    psd: 'PSD Circular',
    psd_minute: 'PSD Circular Minute',
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
