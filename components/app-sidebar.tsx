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
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-config';

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
    { title: 'Visual View', icon: MapPin, href: `${baseRoute}/tour` },
    { title: 'About Church', icon: Church, href: `${baseRoute}/about` },
    { title: 'Profile', icon: Settings, href: `${baseRoute}/settings` },
  ];

  // === ADMIN MENU: NOW WITH DASHBOARD AT TOP ===
  const adminMenuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/a/dashboard' },
    { title: 'Manage Users', icon: Users, href: '/a/users' },
    { title: 'Manage Appointments', icon: Calendar, href: '/a/appointments' },
    { title: 'Post Events', icon: PlusCircle, href: '/a/events' },
    { title: 'Profile', icon: Settings, href: '/a/settings' },
  ];

  // ✅ COMPLETE LOGOUT FUNCTION
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. Sign out from Firebase first
      if (auth.currentUser) {
        await signOut(auth);
      }

      // 2. Clear ALL authentication data from localStorage
      const keysToRemove = [
        'userRole',
        'authToken', 
        'userEmail',
        'currentUser',
        'firebaseUID',
        'church_appointment_userId',
        'church_appointment_userEmail',
        'church_appointment_userFullName',
        'church_appointment_userPhone',
        'loginSecurityState',
        'loginAttempts'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // 3. Clear sessionStorage
      sessionStorage.clear();

      // 4. Clear cookies (if any)
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      });

      // 5. Wait a bit for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 6. Show success message
      toast({
        title: 'Logged out successfully',
        description: 'You have been signed out.',
      });

      // 7. Redirect to login page with cache busting
      router.push('/login?t=' + Date.now());
      
      // 8. Force reload to clear any cached state
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);

    } catch (error) {
      console.error('Logout error:', error);
      
      // Fallback: Clear storage and redirect even if Firebase signout fails
      localStorage.clear();
      sessionStorage.clear();
      
      toast({
        title: 'Signed out',
        description: 'You have been signed out.',
      });
      
      router.push('/login');
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
                className="w-full text-left flex items-center gap-2 text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors duration-200"
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