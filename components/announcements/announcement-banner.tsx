'use client';

import { AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'hrportal_banner_dismissed';
const EXPIRY_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface DismissedBannerData {
  [id: string]: {
    dismissedAt: number;
    expiresAt: number;
  };
}

interface Announcement {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  dismissible: boolean;
}

interface AnnouncementBannerProps {
  announcements?: Announcement[];
}

function getDismissedData(): DismissedBannerData {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function saveDismissedData(data: DismissedBannerData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

export function AnnouncementBanner({ announcements = [] }: AnnouncementBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // On mount, check localStorage and filter out expired dismissals
  useEffect(() => {
    const now = Date.now();
    const stored = getDismissedData();
    const validDismissals: DismissedBannerData = {};
    const validIds: string[] = [];

    for (const [id, data] of Object.entries(stored)) {
      if (data.expiresAt > now) {
        validDismissals[id] = data;
        validIds.push(id);
      }
    }

    // Clean up expired entries
    if (Object.keys(validDismissals).length !== Object.keys(stored).length) {
      saveDismissedData(validDismissals);
    }

    setDismissedIds(validIds);
  }, []);

  if (!announcements || announcements.length === 0) {
    return null;
  }

  const activeAnnouncements = announcements.filter(
    (a) => !dismissedIds.includes(a.id)
  );

  if (activeAnnouncements.length === 0) {
    return null;
  }

  const handleDismiss = (id: string) => {
    const now = Date.now();
    const stored = getDismissedData();
    stored[id] = {
      dismissedAt: now,
      expiresAt: now + EXPIRY_DURATION,
    };
    saveDismissedData(stored);
    setDismissedIds([...dismissedIds, id]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="space-y-3">
      {activeAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={cn(
            'flex items-start gap-3 p-4 border rounded-lg',
            getStyles(announcement.type)
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(announcement.type)}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium leading-relaxed">
              {announcement.message}
            </p>
          </div>
          {announcement.dismissible && (
            <button
              onClick={() => handleDismiss(announcement.id)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
              aria-label="Dismiss announcement"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
