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
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebase-config';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  where,
  updateDoc,
  doc,
  onSnapshot
} from 'firebase/firestore';

// Types for our data
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
  createdAt: any;
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
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Fetch real data from Firebase
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch recent appointments
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          orderBy('createdAt', 'desc'),
          limit(5)
        );

        // Real-time listener for appointments
        const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
          const appointmentsData: Appointment[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            appointmentsData.push({
              id: doc.id,
              fullName: data.fullName || '',
              email: data.email || '',
              phone: data.phone || '',
              eventType: data.eventType || '',
              eventDate: data.eventDate || '',
              eventTime: data.eventTime || '',
              guestCount: data.guestCount || '',
              message: data.message || '',
              status: data.status || 'pending',
              createdAt: data.createdAt
            });
          });
          setAppointments(appointmentsData);
        });

        // Fetch dashboard statistics
        await fetchDashboardStats();

        return () => {
          unsubscribeAppointments();
        };

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load dashboard data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast]);

  // Fetch dashboard statistics
  const fetchDashboardStats = async () => {
    try {
      setRefreshing(true);

      // Fetch total parishioners (users)
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      const totalParishioners = usersSnapshot.size;

      // Fetch pending appointments
      const pendingQuery = query(
        collection(db, 'appointments'),
        where('status', '==', 'pending')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      const pendingAppointments = pendingSnapshot.size;

      // Fetch total appointments for today (for active users)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayQuery = query(
        collection(db, 'appointments'),
        where('createdAt', '>=', today)
      );
      const todaySnapshot = await getDocs(todayQuery);
      const activeUsersToday = todaySnapshot.size;

      // Fetch upcoming events (you can create an 'events' collection later)
      const upcomingEvents = 0; // Placeholder for now

      setStats({
        totalParishioners,
        upcomingEvents,
        pendingAppointments,
        activeUsersToday
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load statistics',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Handle appointment actions
  const handleAppointmentAction = async (appointmentId: string, action: 'approve' | 'reject') => {
    try {
      setRefreshing(true);
      
      // Update in Firebase
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: action === 'approve' ? 'approved' : 'rejected',
        updatedAt: new Date()
      });

      // Update local state
      setAppointments(prev => prev.map(apt => 
        apt.id === appointmentId 
          ? { ...apt, status: action === 'approve' ? 'approved' : 'rejected' }
          : apt
      ));

      // Refresh stats
      await fetchDashboardStats();

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
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh all data
  const handleRefresh = async () => {
    await fetchDashboardStats();
    toast({
      title: 'Refreshed',
      description: 'Dashboard data has been updated.',
    });
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

  const formatEventType = (eventType: string): string => {
    const eventMap: Record<string, string> = {
      'mass': 'Holy Mass',
      'wedding': 'Wedding',
      'baptism': 'Baptism',
      'funeral': 'Funeral Mass',
      'confirmation': 'Confirmation',
      'first-communion': 'First Communion'
    };
    return eventMap[eventType] || eventType;
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
              <Button 
                variant="secondary" 
                size="lg" 
                className="gap-2"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
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
                Registered members
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
              <p className="text-xs text-muted-foreground">Scheduled this week</p>
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
                Today's Activity
              </CardTitle>
              <UserCheck className="w-5 h-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsersToday}</div>
              <p className="text-xs text-muted-foreground">Appointments today</p>
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
          {/* Recent Appointments - REAL DATA FROM FIREBASE */}
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
                  Latest sacrament requests from parishioners • Real-time data
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
                    <p>No appointments found</p>
                    <p className="text-sm mt-2">Appointments will appear here when parishioners submit requests.</p>
                  </div>
                ) : (
                  appointments.map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {appointment.fullName.split(' ').map(n => n[0]).join('').toUpperCase()}
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
                          <p className="text-xs text-muted-foreground mt-1">
                            Submitted: {formatDateTime(appointment.createdAt)}
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
                            disabled={refreshing}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                            disabled={refreshing}
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

          {/* System Status */}
          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current platform statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-200">
                  <div>
                    <p className="font-medium text-green-800">System Online</p>
                    <p className="text-sm text-green-600">All services operational</p>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    Active
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Database Connection</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Connected
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Real-time Updates</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Email Service</span>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Active
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Last Updated</p>
                  <p className="text-sm font-medium">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
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