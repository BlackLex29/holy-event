'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Church,
  Clock,
  UserCheck,
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
  onSnapshot,
  Timestamp
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
  upcomingEvents: number;
  pendingAppointments: number;
  activeUsersToday: number;
}

const AdminDashboardPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
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

      // Fetch ALL appointments first to debug
      const allAppointmentsQuery = query(collection(db, 'appointments'));
      const allAppointmentsSnapshot = await getDocs(allAppointmentsQuery);
      console.log(`📋 Total appointments in database: ${allAppointmentsSnapshot.size}`);
      
      // Log all appointment statuses
      const statusCounts: Record<string, number> = {};
      allAppointmentsSnapshot.forEach(doc => {
        const status = doc.data().status || 'no-status';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('📊 Appointments by status:', statusCounts);

      // Fetch pending appointments
      let pendingAppointments = 0;
      try {
        const pendingQuery = query(
          collection(db, 'appointments'),
          where('status', '==', 'pending')
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        pendingAppointments = pendingSnapshot.size;
        console.log(`⏳ Pending appointments: ${pendingAppointments}`);
      } catch (error) {
        console.error('Error fetching pending appointments:', error);
        // Fallback: count manually
        pendingAppointments = statusCounts['pending'] || 0;
      }

      // Fetch total appointments for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let activeUsersToday = 0;
      
      try {
        const todayQuery = query(
          collection(db, 'appointments'),
          where('createdAt', '>=', Timestamp.fromDate(today))
        );
        const todaySnapshot = await getDocs(todayQuery);
        activeUsersToday = todaySnapshot.size;
        console.log(`👥 Today's appointments: ${activeUsersToday}`);
      } catch (error) {
        console.error('Error fetching today appointments:', error);
        // Fallback: count manually
        allAppointmentsSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.createdAt) {
            const createdDate = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
            if (createdDate >= today) {
              activeUsersToday++;
            }
          }
        });
      }

      // Fetch upcoming events
      let upcomingEvents = 0;
      const eventCollections = ['events', 'churchevents', 'church_events', 'church-events'];
      
      for (const collectionName of eventCollections) {
        try {
          console.log(`🔍 Checking '${collectionName}' collection...`);
          const eventsCollectionRef = collection(db, collectionName);
          const allEventsSnapshot = await getDocs(eventsCollectionRef);
          
          console.log(`📚 Total documents in '${collectionName}': ${allEventsSnapshot.size}`);
          
          if (allEventsSnapshot.size > 0) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            // Check all documents and try different date field names
            const futureEvents = allEventsSnapshot.docs.filter(doc => {
              const data = doc.data();
              
              // Try different status values
              const isActive = !data.status || data.status === 'active' || data.status === 'published';
              
              // Try different date field names
              let eventDate = data.date || data.eventDate || data.startDate || data.start_date;
              
              if (!eventDate) {
                console.log(`⚠️ No date field found for event ${doc.id}`);
                return false;
              }
              
              try {
                const eventDateObj = new Date(eventDate);
                const isFuture = eventDateObj >= now;
                return isFuture && isActive;
              } catch (error) {
                console.error(`❌ Error parsing date for event ${doc.id}:`, error);
                return false;
              }
            });
            
            if (futureEvents.length > 0) {
              upcomingEvents = futureEvents.length;
              console.log(`✅ Found ${upcomingEvents} upcoming events in '${collectionName}'`);
              break;
            }
          }
        } catch (error) {
          console.log(`ℹ️ Collection '${collectionName}' not found:`, error);
          continue;
        }
      }

      const newStats = {
        upcomingEvents,
        pendingAppointments,
        activeUsersToday
      };

      setStats(newStats);

      console.log('📊 Final Dashboard Stats:', newStats);

    } catch (error) {
      console.error('❌ Error fetching stats:', error);
      toast({
        title: 'Error',
        description: 'Failed to load statistics',
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
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatEventType = (eventType: string): string => {
    const eventMap: Record<string, string> = {
      'mass': 'Holy Mass',
      'wedding': 'Wedding',
      'baptism': 'Baptism',
      'funeral': 'Funeral Mass',
      'confirmation': 'Confirmation',
      'first-communion': 'First Communion',
      'confession': 'Confession',
      'rosary': 'Holy Rosary',
      'adoration': 'Adoration',
      'recollection': 'Recollection',
      'fiesta': 'Barangay Fiesta',
      'simbang-gabi': 'Simbang Gabi',
      'school-mass': 'School Mass'
    };
    return eventMap[eventType] || eventType;
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
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
              <Avatar className="ring-4 ring-background">
                <AvatarImage src="/admin-avatar.jpg" />
                <AvatarFallback>FR</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 -mt-6">
        {/* Stats Grid - 3 columns na lang */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-blue-500 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Events
              </CardTitle>
              <Calendar className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
              <p className="text-xs text-muted-foreground">Active public events</p>
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

        <Separator className="my-8" />

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Appointments - VIEW ONLY */}
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
                    <span className="text-sm text-muted-foreground">Appointments</span>
                    <Badge variant="outline" className={stats.pendingAppointments > 0 ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}>
                      {stats.pendingAppointments > 0 ? `${stats.pendingAppointments} Pending` : 'All Processed'}
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