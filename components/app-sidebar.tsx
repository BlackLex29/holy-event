'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
    LayoutDashboard,
    Settings,
    Users,
    Calendar,
    FileText,
    LogOut
} from 'lucide-react';

export const AppSidebar = () => {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/a/');
    const baseRoute = isAdmin ? '/a' : '/c';

    const navItems = [
        {
            title: 'Dashboard',
            icon: LayoutDashboard,
            href: `${baseRoute}/dashboard`,
        },
        {
            title: 'Settings',
            icon: Settings,
            href: `${baseRoute}/settings`,
        },
    ];

    // Admin-only items
    const adminItems = isAdmin ? [
        {
            title: 'Users',
            icon: Users,
            href: '/a/users',
        },
        {
            title: 'Events',
            icon: Calendar,
            href: '/a/events',
        },
        {
            title: 'Reports',
            icon: FileText,
            href: '/a/reports',
        },
    ] : [];

    return (
        <Sidebar>
            <SidebarHeader className="p-4">
                <h2 className="text-lg font-semibold">
                    {isAdmin ? 'Holy Admin Panel' : 'Holy Client Portal'}
                </h2>
            </SidebarHeader>

            <SidebarContent>
                {/* Main Navigation */}
                <SidebarGroup>
                    {/* <SidebarGroupLabel>Navigation</SidebarGroupLabel> */}
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {navItems.map((item) => (
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

                {/* Admin-only section */}
                {/* {isAdmin && adminItems.length > 0 && (
                    <SidebarGroup>
                        <SidebarGroupLabel>Administration</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {adminItems.map((item) => (
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
                )} */}
            </SidebarContent>

            <SidebarFooter className="p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild>
                            <button
                                onClick={() => {
                                    console.log('Logout clicked');
                                }}
                                className="w-full"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Logout</span>
                            </button>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
        </Sidebar>
    );
}

