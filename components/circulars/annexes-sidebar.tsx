import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';

interface AnnexesSidebarProps {
  annexes: Array<{ url: string; filename: string; path: string }>;
  className?: string;
}

export function AnnexesSidebar({ annexes, className }: AnnexesSidebarProps) {
  if (!annexes || annexes.length === 0) {
    return null;
  }

  return (
    <aside className={cn('w-80', className)}>
      <div className="bg-[#FFF4D4] border border-[#E5D4A0] rounded-lg p-6 sticky top-6">
        <h3 className="text-xl font-bold mb-4 text-gray-900">Annexes</h3>

        <ul className="space-y-3">
          {annexes.map((annex, index) => (
            <li key={index}>
              <a
                href={annex.url}
                download
                className="flex items-start gap-2 text-[#17A2B8] hover:underline group"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FileText className="h-4 w-4 flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <span className="text-sm break-all">{annex.filename}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-4 border-t border-[#E5D4A0]">
          <p className="text-xs text-gray-600">
            Click on any annex to download or view
          </p>
        </div>
      </div>
    </aside>
  );
}
