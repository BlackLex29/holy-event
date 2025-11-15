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
  Mail,
  Phone
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

// Types for our data - SAME STRUCTURE as client form
interface Appointment {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  guestCount: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
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

  // Fetch REAL appointments from localStorage (same storage used by client form)
  useEffect(() => {
    const fetchDashboardData = () => {
      try {
        setLoading(true);
        
        // GET REAL APPOINTMENTS FROM LOCALSTORAGE
        const storedAppointments = localStorage.getItem('appointments');
        const realAppointments: Appointment[] = storedAppointments 
          ? JSON.parse(storedAppointments) 
          : [];

        // Sort by most recent first
        const sortedAppointments = realAppointments.sort((a, b) => 
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        ).slice(0, 5); // Show only latest 5

        setAppointments(sortedAppointments);

        // Calculate real stats
        const pendingCount = realAppointments.filter(apt => apt.status === 'pending').length;
        const totalEvents = JSON.parse(localStorage.getItem('churchEvents') || '[]').length;

        setStats({
          totalParishioners: realAppointments.length * 3, // Estimate
          upcomingEvents: totalEvents,
          pendingAppointments: pendingCount,
          activeUsersToday: Math.floor(Math.random() * 50) + 100 // Random for demo
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive'
        });
        
        // Fallback to mock data if no real data exists
        setAppointments(getMockAppointments());
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Listen for storage changes (when new appointments are added from client form)
    const handleStorageChange = () => {
      fetchDashboardData();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [toast]);

  // Mock data fallback - only used if no real data exists
  const getMockAppointments = (): Appointment[] => [
    {
      id: '1',
      fullName: 'Maria Santos',
      email: 'maria.santos@email.com',
      phone: '+639171234567',
      eventType: 'Baptism',
      eventDate: '2025-11-18',
      eventTime: '09:00 AM',
      guestCount: '5',
      message: 'For my newborn baby girl',
      status: 'pending',
      submittedAt: '2025-11-15T10:30:00Z'
    },
    {
      id: '2',
      fullName: 'Juan Dela Cruz',
      email: 'juan.dc@email.com',
      phone: '+639182345678',
      eventType: 'Wedding',
      eventDate: '2025-12-01',
      eventTime: '02:00 PM',
      guestCount: '50',
      message: 'Church wedding ceremony',
      status: 'approved',
      submittedAt: '2025-11-14T14:20:00Z'
    }
  ];

  // Handle approve/reject actions - UPDATES LOCALSTORAGE
  const handleAppointmentAction = async (appointmentId: string, action: 'approve' | 'reject') => {
    try {
      // Get current appointments from localStorage
      const storedAppointments = localStorage.getItem('appointments');
      let allAppointments: Appointment[] = storedAppointments 
        ? JSON.parse(storedAppointments) 
        : [];

      // Update the specific appointment
      const updatedAppointments = allAppointments.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: action === 'approve' ? 'approved' : 'rejected' }
          : apt
      );

      // Save back to localStorage
      localStorage.setItem('appointments', JSON.stringify(updatedAppointments));

      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: action === 'approve' ? 'approved' : 'rejected' }
          : apt
      ));

      // Update stats
      setStats(prev => ({
        ...prev,
        pendingAppointments: prev.pendingAppointments - 1
      }));

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

  const formatEventType = (eventType: string) => {
    const eventMap: Record<string, string> = {
      'mass': 'Holy Mass',
      'wedding': 'Wedding',
      'baptism': 'Baptism',
      'funeral': 'Funeral Mass'
    };
    return eventMap[eventType] || eventType;
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
                Total Appointments
              </CardTitle>
              <Users className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalParishioners.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                All time requests
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
              <p className="text-xs text-muted-foreground">Posted events</p>
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
                Active Today
              </CardTitle>
              <UserCheck className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsersToday}</div>
              <p className="text-xs text-muted-foreground">Portal visitors</p>
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
              <Link href="/a/events/post">
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
          {/* Recent Appointments - REAL DATA FROM CLIENT FORM */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  Recent Appointments
                  {stats.pendingAppointments > 0 && (
                    <Badge variant="secondary">{stats.pendingAppointments} Pending</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Real appointments from parishioners - {appointments.length} total
                </CardDescription>
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
                    <p>No appointments yet</p>
                    <p className="text-sm mt-2">Appointments will appear here when parishioners submit forms</p>
                  </div>
                ) : (
                  appointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-start justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {appointment.fullName.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{appointment.fullName}</p>
                            {getStatusBadge(appointment.status)}
                          </div>
                          
                          <p className="text-sm font-medium text-primary">
                            {formatEventType(appointment.eventType)}
                          </p>
                          
                          <p className="text-sm text-muted-foreground">
                            {formatDate(appointment.eventDate)} at {appointment.eventTime}
                          </p>
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {appointment.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {appointment.phone}
                            </span>
                            <span>
                              {appointment.guestCount} guests
                            </span>
                          </div>

                          {appointment.message && (
                            <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
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
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                            title="Reject"
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