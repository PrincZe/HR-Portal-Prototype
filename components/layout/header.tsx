'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types/database';
import { Skeleton } from '@/components/ui/skeleton';

export function Header() {
  const [user, setUser] = useState<User | null>(null);
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
        
        setUser(userData as User);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (roleName: string) => {
    if (roleName.includes('admin')) return 'bg-purple-100 text-purple-800';
    if (roleName.includes('hrl')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-6">
      {/* Left Section - Welcome Message */}
      <div className="flex items-center gap-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        ) : user ? (
          <div>
            <h2 className="text-lg font-semibold">
              Welcome back, {user.full_name?.split(' ')[0] || 'User'}
            </h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className={getRoleBadgeColor(user.roles.name)}>
                {user.roles.display_name}
              </Badge>
              {user.agency && (
                <span className="text-sm text-muted-foreground">• {user.agency}</span>
              )}
            </div>
          </div>
        ) : (
          <h2 className="text-lg font-semibold">HR Portal</h2>
        )}
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* Notification badge - hidden for now */}
          {/* <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" /> */}
        </Button>

        {/* User Avatar */}
        {loading ? (
          <Skeleton className="h-10 w-10 rounded-full" />
        ) : user ? (
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getInitials(user.full_name)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>
    </header>
  );
}
