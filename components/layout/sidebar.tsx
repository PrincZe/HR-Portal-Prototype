'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FolderOpen,
  Users,
  Calendar,
  Upload,
  User,
  LogOut,
  Megaphone,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { User as UserType } from '@/lib/types/database';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

const allNavigation = [
  { name: 'Home', href: '/', icon: LayoutDashboard, roles: 'all' },
  { name: 'Circulars', href: '/circulars', icon: FileText, roles: 'all' },
  { name: 'Resources', href: '/resources', icon: FolderOpen, roles: 'all' },
  { name: 'FAQs', href: '/faqs', icon: HelpCircle, roles: 'all' },
  { name: 'HRL Meetings', href: '/hrl-meetings', icon: Calendar, roles: ['system_admin', 'hrl_ministry', 'hrl_statboard', 'hrl_rep_ministry', 'hrl_rep_statboard'] },
  { name: 'Account Management', href: '/admin/users', icon: Users, roles: ['system_admin', 'portal_admin'] },
  { name: 'Manage Announcements', href: '/admin/announcements', icon: Megaphone, roles: ['system_admin', 'portal_admin'] },
  { name: 'Manage FAQs', href: '/admin/faqs', icon: HelpCircle, roles: ['system_admin', 'portal_admin'] },
  { name: 'Upload Circular', href: '/circulars/upload', icon: Upload, roles: ['system_admin', 'portal_admin'] },
  { name: 'Upload Resources', href: '/resources/upload', icon: Upload, roles: ['system_admin', 'portal_admin'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const { data: userData } = await supabase
          .from('users')
          .select('*, roles(*)')
          .eq('id', authUser.id)
          .single();
        
        setUser(userData as UserType);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Filter navigation based on user role
  const navigation = allNavigation.filter(item => {
    if (item.roles === 'all') return true;
    if (!user) return false;
    return item.roles.includes(user.roles.name);
  });

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white">
      {/* Logo/Title */}
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">HR Portal</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User Profile Section */}
      <div className="border-t p-4">
        {loading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ) : user ? (
          <>
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user.roles.display_name}</p>
              </div>
            </Link>
            <button
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <User className="h-5 w-5" />
            Sign In
          </Link>
        )}
      </div>
    </div>
  );
}
