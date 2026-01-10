import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Clock, TrendingUp, Upload, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import { isAdmin } from '@/lib/roles';

async function getDashboardStats(userId: string, roleName: string) {
  const supabase = await createClient();
  
  // Get user count (admin only)
  let userCount = 0;
  let pendingCount = 0;
  if (isAdmin(roleName as any)) {
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    const { count: pending } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');
    
    userCount = totalUsers || 0;
    pendingCount = pending || 0;
  }
  
  // Get circular count
  const { count: circularCount } = await supabase
    .from('circulars')
    .select('*', { count: 'exact', head: true });
  
  // Get resource count
  const { count: resourceCount } = await supabase
    .from('resources')
    .select('*', { count: 'exact', head: true });
  
  // Get recent circulars
  const { data: recentCirculars } = await supabase
    .from('circulars')
    .select('*')
    .order('uploaded_at', { ascending: false })
    .limit(5);
  
  return {
    userCount,
    pendingCount,
    circularCount: circularCount || 0,
    resourceCount: resourceCount || 0,
    recentCirculars: recentCirculars || [],
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const stats = await getDashboardStats(user.id, user.roles.name);
  const isUserAdmin = isAdmin(user.roles.name);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome to the HR Portal. Here's an overview of your workspace.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isUserAdmin && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.userCount}</div>
                <p className="text-xs text-muted-foreground">
                  Across all agencies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.pendingCount}</div>
                <p className="text-xs text-muted-foreground">
                  Awaiting review
                </p>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Circulars</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.circularCount}</div>
            <p className="text-xs text-muted-foreground">
              Available documents
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resourceCount}</div>
            <p className="text-xs text-muted-foreground">
              HR materials
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isUserAdmin && (
            <>
              <Link href="/admin/upload">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <Upload className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Upload Circular</CardTitle>
                    <CardDescription>
                      Add new circulars or documents to the portal
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/admin/users">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <Users className="h-8 w-8 text-primary mb-2" />
                    <CardTitle>Manage Users</CardTitle>
                    <CardDescription>
                      View and manage user accounts and permissions
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}

          <Link href="/circulars">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <FileText className="h-8 w-8 text-primary mb-2" />
                <CardTitle>View Circulars</CardTitle>
                <CardDescription>
                  Browse HRL, HR OPS, and PSD circulars
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>

          <Link href="/resources">
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader>
                <FolderOpen className="h-8 w-8 text-primary mb-2" />
                <CardTitle>HR Resources</CardTitle>
                <CardDescription>
                  Access templates, guides, and tools
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Circulars</h2>
        <Card>
          <CardContent className="p-0">
            {stats.recentCirculars.length > 0 ? (
              <div className="divide-y">
                {stats.recentCirculars.map((circular: any) => (
                  <div key={circular.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{circular.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {circular.circular_number} • {new Date(circular.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link href="/circulars">
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No circulars available yet</p>
                {isUserAdmin && (
                  <Link href="/admin/upload">
                    <Button variant="outline" className="mt-4">
                      Upload First Circular
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
