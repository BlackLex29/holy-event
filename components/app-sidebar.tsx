'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  Users,
  Calendar,
  PlusCircle,
  Settings,
  Church,
  LogOut,
  LayoutDashboard,
  MapPin,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export const AppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isAdmin = pathname?.startsWith('/a/');
  const baseRoute = isAdmin ? '/a' : '/c';

  // === CLIENT MENU ===
  const clientMenuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, href: `${baseRoute}/dashboard` },
    { title: 'Event Appointment', icon: Calendar, href: `${baseRoute}/appointments` },
    { title: 'Visual Tour', icon: MapPin, href: `${baseRoute}/tour` },
    { title: 'About Church', icon: Church, href: `${baseRoute}/about` },
    { title: 'Settings', icon: Settings, href: `${baseRoute}/settings` },
  ];

  // === ADMIN MENU: NOW WITH DASHBOARD AT TOP ===
  const adminMenuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/a/dashboard' },
    { title: 'Manage Users', icon: Users, href: '/a/users' },
    { title: 'Manage Appointments', icon: Calendar, href: '/a/appointments' },
    { title: 'Post Events', icon: PlusCircle, href: '/a/events' },
    { title: 'Profile', icon: Settings, href: '/a/settings' },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
      localStorage.removeItem('userRole');
      localStorage.removeItem('authToken');
      sessionStorage.clear();
      toast({
        title: 'Logged out successfully',
        description: 'You have been signed out.',
      });
      router.push('/login');
    } catch (error) {
      toast({
        title: 'Logout failed',
        description: 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Church className="w-5 h-5" />
          {isAdmin ? 'Holy Events' : 'Holy Client Portal'}
        </h2>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        {/* ADMIN MENU */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminMenuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* CLIENT MENU */}
        {!isAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {clientMenuItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                    >
                      <Link href={item.href}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Logout */}
      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="w-full text-left flex items-center gap-2 text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                <LogOut className="w-4 h-4" />
                <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};