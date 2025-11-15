// app/a/dashboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Calendar, 
  PlusCircle, 
  Settings,
  Church,
  Bell,
  TrendingUp,
  Clock,
  UserCheck,
  CheckCircle,
  XCircle,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

// Types for our data
interface Appointment {
  id: string;
  name: string;
  email: string;
  phone: string;
  eventType: string;
  preferredDate: string;
  preferredTime: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface DashboardStats {
  totalParishioners: number;
  upcomingEvents: number;
  pendingAppointments: number;
  activeUsersToday: number;
}

const AdminDashboardPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalParishioners: 0,
    upcomingEvents: 0,
    pendingAppointments: 0,
    activeUsersToday: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Fetch real data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Simulate API calls - replace with your actual API endpoints
        const [appointmentsRes, statsRes] = await Promise.all([
          fetch('/api/appointments?limit=5'),
          fetch('/api/dashboard/stats')
        ]);

        const appointmentsData = await appointmentsRes.json();
        const statsData = await statsRes.json();

        setAppointments(appointmentsData.appointments || []);
        setStats(statsData.stats || {
          totalParishioners: 1284,
          upcomingEvents: 8,
          pendingAppointments: 5,
          activeUsersToday: 142
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive'
        });
        
        // Fallback mock data
        setAppointments(getMockAppointments());
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  // Mock data fallback
  const getMockAppointments = (): Appointment[] => [
    {
      id: '1',
      name: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '+639171234567',
      eventType: 'Baptism',
      preferredDate: '2025-11-18',
      preferredTime: '09:00 AM',
      message: 'For my newborn baby girl',
      status: 'pending',
      createdAt: '2025-11-15T10:30:00Z'
    },
    {
      id: '2',
      name: 'Juan Dela Cruz',
      email: 'juan.dc@email.com',
      phone: '+639182345678',
      eventType: 'Wedding',
      preferredDate: '2025-12-01',
      preferredTime: '02:00 PM',
      message: 'Church wedding ceremony',
      status: 'approved',
      createdAt: '2025-11-14T14:20:00Z'
    },
    {
      id: '3',
      name: 'Ana Lim',
      email: 'ana.lim@email.com',
      phone: '+639193456789',
      eventType: 'First Communion',
      preferredDate: '2025-11-25',
      preferredTime: '10:30 AM',
      message: 'For my 7-year-old son',
      status: 'pending',
      createdAt: '2025-11-16T09:15:00Z'
    },
    {
      id: '4',
      name: 'Roberto Garcia',
      email: 'robert.g@email.com',
      phone: '+639204567890',
      eventType: 'Confirmation',
      preferredDate: '2025-11-20',
      preferredTime: '03:00 PM',
      status: 'pending',
      createdAt: '2025-11-16T16:45:00Z'
    },
    {
      id: '5',
      name: 'Sofia Reyes',
      email: 'sofia.reyes@email.com',
      phone: '+639215678901',
      eventType: 'Funeral Mass',
      preferredDate: '2025-11-19',
      preferredTime: '08:00 AM',
      message: 'For my late father',
      status: 'approved',
      createdAt: '2025-11-15T11:20:00Z'
    }
  ];

  const handleAppointmentAction = async (appointmentId: string, action: 'approve' | 'reject') => {
    try {
      // Simulate API call
      await fetch(`/api/appointments/${appointmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action === 'approve' ? 'approved' : 'rejected' })
      });

      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: action === 'approve' ? 'approved' : 'rejected' }
          : apt
      ));

      toast({
        title: `Appointment ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `The appointment has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${action} appointment`,
        variant: 'destructive'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      approved: 'secondary',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    return timeString; // Assuming time is already in readable format
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Church className="w-10 h-10" />
                Admin Dashboard
              </h1>
              <p className="mt-2 text-primary-foreground/80">
                Welcome back, Father! Manage your parish with grace.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="secondary" size="lg" className="gap-2">
                <Bell className="w-5 h-5" />
                <span>{stats.pendingAppointments} Pending</span>
              </Button>
              <Avatar className="ring-4 ring-background">
                <AvatarImage src="/admin-avatar.jpg" />
                <AvatarFallback>FR</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 -mt-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Parishioners
              </CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParishioners.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Events
              </CardTitle>
              <Calendar className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Appointments
              </CardTitle>
              <Clock className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingAppointments}</div>
              <p className="text-xs text-muted-foreground">Need approval</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Users Today
              </CardTitle>
              <UserCheck className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsersToday}</div>
              <p className="text-xs text-muted-foreground">Online now</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild size="lg" className="h-24 flex flex-col gap-2 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground shadow-lg">
              <Link href="/a/users">
                <Users className="w-8 h-8" />
                <span className="text-sm">Manage Users</span>
              </Link>
            </Button>

            <Button asChild size="lg" className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg">
              <Link href="/a/appointments">
                <Calendar className="w-8 h-8" />
                <span className="text-sm">Manage Appointments</span>
              </Link>
            </Button>

            <Button asChild size="lg" className="h-24 flex flex-col gap-2 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg">
              <Link href="/a/events">
                <PlusCircle className="w-8 h-8" />
                <span className="text-sm">Post New Event</span>
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" className="h-24 flex flex-col gap-2 border-2 hover:border-primary shadow-lg">
              <Link href="/a/settings">
                <Settings className="w-8 h-8" />
                <span className="text-sm">System Settings</span>
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Appointments - NOW WITH REAL DATA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Recent Appointments
                  {stats.pendingAppointments > 0 && (
                    <Badge variant="secondary">{stats.pendingAppointments} Pending</Badge>
                  )}
                </CardTitle>
                <CardDescription>Latest sacrament requests from parishioners</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/a/appointments">
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No appointments found</p>
                  </div>
                ) : (
                  appointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {appointment.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{appointment.name}</p>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <p className="text-sm font-medium text-primary">{appointment.eventType}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(appointment.preferredDate)} at {formatTime(appointment.preferredTime)}
                          </p>
                          {appointment.message && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              "{appointment.message}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {appointment.status === 'pending' && (
                        <div className="flex gap-1 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleAppointmentAction(appointment.id, 'approve')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Events */}
          <Card>
            <CardHeader>
              <CardTitle>Recently Posted Events</CardTitle>
              <CardDescription>Visible to all parishioners</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Feast of Christ the King", date: "Nov 24, 2025", attendees: "500+" },
                  { title: "Advent Recollection", date: "Dec 7, 2025", attendees: "120" },
                  { title: "Simbang Gabi Schedule", date: "Dec 16–24, 2025", attendees: "All" },
                ].map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-muted-foreground">{event.date}</p>
                    </div>
                    <Badge variant="outline">{event.attendees} expected</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>"Go and make disciples of all nations." — Matthew 28:19</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;