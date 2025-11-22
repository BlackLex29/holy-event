'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Church,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
  XCircle,
  CalendarDays
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebase-config';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface Appointment {
  id: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  email: string;
  fullName?: string;
  phone?: string;
  guestCount?: string;
  message?: string;
  userId?: string;
}

interface ChurchEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  priest?: string;
  status: 'active' | 'cancelled';
  isPublic: boolean;
  postedAt: string;
}

interface UserData {
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  parishionerId: string;
}

// Helper functions for user identification
const getUserId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('church_appointment_userId');
};

const getUserEmail = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('church_appointment_userEmail');
};

// Helper function to format event type
const formatEventType = (eventType: string): string => {
  const eventTypeMap: Record<string, string> = {
    mass: 'Holy Mass',
    wedding: 'Wedding',
    baptism: 'Baptism',
    funeral: 'Funeral Mass',
    confirmation: 'Confirmation',
    confession: 'Confession',
    rosary: 'Holy Rosary',
    adoration: 'Adoration',
    recollection: 'Recollection',
    fiesta: 'Barangay Fiesta',
    'simbang-gabi': 'Simbang Gabi',
    'school-mass': 'School Mass'
  };
  return eventTypeMap[eventType] || eventType;
};

export default function ClientDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ChurchEvent[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const checkAuthentication = () => {
      const userRole = localStorage.getItem('userRole');
      const authToken = localStorage.getItem('authToken');
      const userId = getUserId();
      
      if (!userRole || !authToken || !userId) {
        setIsAuthenticated(false);
        router.push('/login?redirect=' + encodeURIComponent('/c/dashboard'));
        return false;
      }
      
      setIsAuthenticated(true);
      return true;
    };

    if (!checkAuthentication()) {
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        const userId = getUserId();
        const userEmail = getUserEmail();
        
        if (!userId || !userEmail) {
          toast({
            title: 'Authentication Required',
            description: 'Please log in again.',
            variant: 'destructive',
          });
          router.push('/login');
          return;
        }

        // Get user data
        const currentUser: UserData = {
          name: userEmail.split('@')[0] || 'Parishioner',
          email: userEmail,
          phone: '+639171234567',
          joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          parishionerId: `P-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
        };

        setUserData(currentUser);

        // REAL-TIME LISTENER FOR APPOINTMENTS FROM FIREBASE
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const appointmentsUnsubscribe = onSnapshot(appointmentsQuery, 
          (querySnapshot) => {
            const userAppointments: Appointment[] = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const appointment: Appointment = {
                id: doc.id,
                eventType: data.eventType || '',
                eventDate: data.eventDate || '',
                eventTime: data.eventTime || '',
                status: data.status || 'pending',
                submittedAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                email: data.email || '',
                fullName: data.fullName || '',
                phone: data.phone || '',
                guestCount: data.guestCount || '',
                message: data.message || '',
                userId: data.userId || ''
              };
              userAppointments.push(appointment);
            });
            
            console.log('📊 Dashboard appointments loaded:', userAppointments.length);
            
            // Update localStorage with latest appointments
            localStorage.setItem('appointments', JSON.stringify(userAppointments));
            
            // Show only latest 3 appointments for dashboard
            setAppointments(userAppointments.slice(0, 3));
            
            // Show toast when new appointments are approved
            userAppointments.forEach(apt => {
              if (apt.status === 'approved') {
                const wasPending = appointments.find(oldApt => 
                  oldApt.id === apt.id && oldApt.status === 'pending'
                );
                
                if (wasPending) {
                  toast({
                    title: 'Appointment Approved! 🎉',
                    description: `Your ${formatEventType(apt.eventType)} on ${formatDate(apt.eventDate)} has been approved.`,
                  });
                }
              }
            });
          },
          (error) => {
            console.error('Firebase appointments error:', error);
            // Fallback to localStorage
            loadAppointmentsFromLocalStorage();
          }
        );

        // REAL-TIME LISTENER FOR CHURCH EVENTS FROM FIREBASE
        const eventsQuery = query(
          collection(db, 'events'),
          where('status', '==', 'active'),
          where('isPublic', '==', true),
          orderBy('date', 'asc')
        );

        const eventsUnsubscribe = onSnapshot(eventsQuery, 
          (querySnapshot) => {
            const churchEvents: ChurchEvent[] = [];
            querySnapshot.forEach((doc) => {
              const data = doc.data();
              const eventDate = data.date;
              
              // Show only future events
              if (new Date(eventDate) >= new Date()) {
                churchEvents.push({
                  id: doc.id,
                  type: data.type || '',
                  title: data.title || '',
                  description: data.description || '',
                  date: eventDate,
                  time: data.time || '',
                  location: data.location || '',
                  priest: data.priest || '',
                  status: data.status || 'active',
                  isPublic: data.isPublic || false,
                  postedAt: data.postedAt?.toDate?.()?.toISOString() || new Date().toISOString()
                });
              }
            });
            
            // Show only upcoming 3 events
            setUpcomingEvents(churchEvents.slice(0, 3));
          },
          (error) => {
            console.error('Firebase events error:', error);
            // Fallback to localStorage
            loadEventsFromLocalStorage();
          }
        );

        return () => {
          appointmentsUnsubscribe();
          eventsUnsubscribe();
        };

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setAppointments([]);
        loadEventsFromLocalStorage();
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [toast, router]);

  const loadAppointmentsFromLocalStorage = () => {
    try {
      const storedAppointments = localStorage.getItem('appointments');
      if (storedAppointments) {
        const allAppointments: Appointment[] = JSON.parse(storedAppointments);
        const userId = getUserId();
        const userEmail = getUserEmail();
        
        // Filter appointments for current user
        const userAppointments = allAppointments.filter((apt: Appointment) => 
          apt.userId === userId || apt.email === userEmail
        );
        
        console.log('📱 LocalStorage appointments loaded:', userAppointments.length);
        setAppointments(userAppointments.slice(0, 3));
      } else {
        setAppointments([]);
      }
    } catch (error) {
      console.error('Error loading appointments from localStorage:', error);
      setAppointments([]);
    }
  };

  const loadEventsFromLocalStorage = () => {
    try {
      const storedEvents = localStorage.getItem('churchEvents');
      if (storedEvents) {
        const allEvents: ChurchEvent[] = JSON.parse(storedEvents);
        const futureEvents = allEvents
          .filter(event => new Date(event.date) >= new Date())
          .slice(0, 3);
        setUpcomingEvents(futureEvents);
      } else {
        setUpcomingEvents(getMockEvents());
      }
    } catch (error) {
      console.error('Error loading events from localStorage:', error);
      setUpcomingEvents(getMockEvents());
    }
  };

  const getMockEvents = (): ChurchEvent[] => [
    {
      id: '1',
      type: 'mass',
      title: 'Sunday Mass',
      description: 'Regular Sunday celebration',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      time: '09:00',
      location: 'Main Sanctuary',
      status: 'active',
      isPublic: true,
      postedAt: new Date().toISOString()
    },
    {
      id: '2',
      type: 'confession',
      title: 'Confession Schedule',
      description: 'Sacrament of Reconciliation',
      date: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Day after tomorrow
      time: '14:00',
      location: 'Confession Room',
      status: 'active',
      isPublic: true,
      postedAt: new Date().toISOString()
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'secondary',
      rejected: 'destructive',
      pending: 'default'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getUpcomingAppointment = () => {
    const approvedAppointments = appointments.filter(apt => apt.status === 'approved');
    const upcoming = approvedAppointments
      .filter(apt => {
        try {
          return new Date(apt.eventDate) >= new Date();
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())[0];
    
    return upcoming;
  };

  const upcomingAppointment = getUpcomingAppointment();

  // Handle manual refresh of appointments
  const handleRefreshAppointments = () => {
    setLoading(true);
    loadAppointmentsFromLocalStorage();
    setTimeout(() => setLoading(false), 1000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Church className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">Please log in to access your dashboard.</p>
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Church className="w-10 h-10" />
                Parishioner Dashboard
              </h1>
              <p className="mt-2 text-primary-foreground/80">
                Welcome back, {userData.name}! We're glad to have you with us.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Avatar className="ring-4 ring-background">
                <AvatarFallback>
                  {userData.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 -mt-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My Appointments
              </CardTitle>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefreshAppointments}
                  className="h-6 w-6 p-0"
                >
                  🔄
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground">
                {appointments.filter(apt => apt.status === 'approved').length} approved
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Events
              </CardTitle>
              <CalendarDays className="w-5 h-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingEvents.length}</div>
              <p className="text-xs text-muted-foreground">Live from parish</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Member Since
              </CardTitle>
              <Users className="w-5 h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{userData.joinDate}</div>
              <p className="text-xs text-muted-foreground">Parishioner ID: {userData.parishionerId}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-8">
            {/* Upcoming Appointment */}
            {upcomingAppointment && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Your Next Appointment
                  </CardTitle>
                  <CardDescription>
                    We're looking forward to seeing you!
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-lg text-green-900">
                        {formatEventType(upcomingAppointment.eventType)}
                      </h3>
                      {getStatusBadge(upcomingAppointment.status)}
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span className="font-semibold">{formatDate(upcomingAppointment.eventDate)}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-green-600" />
                        <span>{upcomingAppointment.eventTime}</span>
                      </p>
                      {upcomingAppointment.fullName && (
                        <p className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-green-600" />
                          <span>{upcomingAppointment.fullName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Appointments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Appointments</CardTitle>
                  <CardDescription>
                    Your recent sacrament requests • Real-time updates
                    {appointments.length > 0 && ` • Showing ${appointments.length} of ${localStorage.getItem('appointments') ? JSON.parse(localStorage.getItem('appointments')!).length : 0} total`}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/c/appointments">
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {appointments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No appointments yet</p>
                      <p className="text-sm mb-4">Your appointments will appear here after booking</p>
                      <Button asChild className="mt-2">
                        <Link href="/c/appointments">
                          Book Your First Appointment
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    appointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            appointment.status === 'approved' ? 'bg-green-100 text-green-600' :
                            appointment.status === 'rejected' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            {appointment.status === 'approved' ? <CheckCircle className="w-4 h-4" /> : 
                             appointment.status === 'rejected' ? <XCircle className="w-4 h-4" /> :
                             <Clock className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{formatEventType(appointment.eventType)}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(appointment.eventDate)} • {appointment.eventTime}
                            </p>
                            {appointment.fullName && (
                              <p className="text-xs text-muted-foreground">
                                {appointment.fullName}
                              </p>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(appointment.status)}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Church Events</CardTitle>
                <CardDescription>Live events from the parish</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No upcoming events</p>
                      <p className="text-sm mt-2">Check back later for new events</p>
                    </div>
                  ) : (
                    upcomingEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer">
                        <div>
                          <p className="font-medium">{event.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(event.date)} • {event.time}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </p>
                          {event.priest && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <Users className="w-3 h-3" />
                              {event.priest}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">{formatEventType(event.type)}</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Status Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Appointment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Approved - Your appointment is confirmed</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>Pending - Waiting for admin approval</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>Rejected - Please contact the parish for details</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button asChild className="w-full">
                    <Link href="/c/appointments">
                      <Calendar className="w-4 h-4 mr-2" />
                      Book New Appointment
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/c/tour">
                      <MapPin className="w-4 h-4 mr-2" />
                      Church Virtual View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}