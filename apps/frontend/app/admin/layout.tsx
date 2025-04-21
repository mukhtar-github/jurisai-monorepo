import { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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
          <TabsTrigger value="roles">
            <Link href="/admin/roles" className="w-full h-full flex items-center justify-center">Roles</Link>
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Link href="/admin/permissions" className="w-full h-full flex items-center justify-center">Permissions</Link>
          </TabsTrigger>
          <TabsTrigger value="users">
            <Link href="/admin/users" className="w-full h-full flex items-center justify-center">Users</Link>
          </TabsTrigger>
          <TabsTrigger value="system">
            <Link href="/admin/system" className="w-full h-full flex items-center justify-center">System</Link>
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
