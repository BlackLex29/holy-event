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

  // === ADMIN MENU ===
  const adminMenuItems = [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/a/dashboard' },
    { title: 'Manage Users', icon: Users, href: '/a/users' },
    { title: 'Manage Appointments', icon: Calendar, href: '/a/appointments' },
    { title: 'Post Events', icon: PlusCircle, href: '/a/events' },
    { title: 'Profile', icon: Settings, href: '/a/settings' },
  ];

  // ✅ IMPROVED LOGOUT FUNCTION - PRESERVE ALL USER DATA
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // 1. BACKUP ALL USER DATA BEFORE LOGOUT
      const userDataBackup: {[key: string]: string} = {};
      
      // Backup all user-related data including appointments
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('church_') || 
          key.startsWith('appointment') ||
          key.startsWith('event') ||
          key === 'userAppointments' ||
          key === 'userEvents' ||
          key.includes('dashboard') ||
          key.includes('userData')
        )) {
          userDataBackup[key] = localStorage.getItem(key) || '';
        }
      }

      console.log('📦 Backup created for:', Object.keys(userDataBackup));

      // 2. Sign out from Firebase
      if (auth.currentUser) {
        await signOut(auth);
      }

      // 3. CLEAR ONLY AUTHENTICATION DATA
      const authKeysToRemove = [
        'userRole',
        'authToken', 
        'userEmail',
        'currentUser',
        'firebaseUID',
        'loginSecurityState',
        'loginAttempts',
        // HUWAG BURAHAIN: church_appointment_userId, appointments, events
      ];

      authKeysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // 4. RESTORE USER DATA IMMEDIATELY
      Object.keys(userDataBackup).forEach(key => {
        localStorage.setItem(key, userDataBackup[key]);
      });

      // 5. Clear sessionStorage (walang important data dito usually)
      sessionStorage.clear();

      // 6. Clear cookies
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      });

      // 7. Show success message
      toast({
        title: 'Logged out successfully',
        description: 'Your appointments and data have been preserved.',
      });

      // 8. Redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 500);
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Fallback: Minimal cleanup
      const minimalAuthKeys = ['userRole', 'authToken', 'userEmail', 'currentUser'];
      minimalAuthKeys.forEach(key => localStorage.removeItem(key));
      
      toast({
        title: 'Signed out',
        description: 'You have been signed out. Your data is preserved.',
      });
      
      router.push('/login');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Church className="w-5 h-5" />
          {isAdmin ? 'Holy Events Admin' : 'Holy Client Portal'}
        </h2>
      </SidebarHeader>

      <SidebarContent className="pt-2">
        {isAdmin ? (
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
        ) : (
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