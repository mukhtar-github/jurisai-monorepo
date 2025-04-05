import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { useCurrentUser } from '@/lib/hooks/useAuth';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const metadata: Metadata = {
  title: 'JurisAI Admin',
  description: 'Admin dashboard for JurisAI application management'
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="container py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage your JurisAI application settings</p>
      </header>

      <Tabs defaultValue="roles" className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles" asChild>
            <Link href="/admin/roles">Roles</Link>
          </TabsTrigger>
          <TabsTrigger value="permissions" asChild>
            <Link href="/admin/permissions">Permissions</Link>
          </TabsTrigger>
          <TabsTrigger value="users" asChild>
            <Link href="/admin/users">Users</Link>
          </TabsTrigger>
          <TabsTrigger value="system" asChild>
            <Link href="/admin/system">System</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="bg-card rounded-md border shadow-sm p-6">
        {children}
      </div>
    </div>
  );
}

// Server component to handle admin access checks
export async function AdminAccessGuard() {
  // This would be replaced with a server-side check
  // For demo purposes, we'll use client-side redirect
  return null;
}
