'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Church,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  CalendarDays,
  User,
  Users,
  Phone,
  Mail
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { db, auth } from '@/lib/firebase-config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';

interface Appointment {
  id: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  status: 'pending' | 'approved' | 'rejected' | 'confirmed' | 'cancelled';
  submittedAt: string;
  email: string;
  fullName?: string;
  phone?: string;
  guestCount?: string;
  message?: string;
  userId?: string;
  userEmail?: string;
  createdAt?: any;
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
  postedAt: any;
  createdAt?: any;
  updatedAt?: any;
}

interface UserData {
  name: string;
  email: string;
  phone: string;
  userId: string;
}

// Helper function to format event type
const formatEventType = (eventType: string): string => {
  const eventTypeMap: Record<string, string> = {
    mass: 'Holy Mass',
    wedding: 'Wedding',
    baptism: 'Baptism',
    funeral: 'Funeral Mass',
    confirmation: 'Confirmation',
  };
  return eventTypeMap[eventType] || eventType;
};

// Helper to convert Firestore timestamp to ISO string
const convertTimestampToISO = (timestamp: any): string => {
  if (timestamp?.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return new Date().toISOString();
};

// Helper to get user's permanent account identifier
const getPermanentUserIdentifier = (): string | null => {
  if (typeof window === 'undefined') return null;
  let deviceId = localStorage.getItem('holy_event_device_id');
  if (!deviceId) {
    deviceId = 'device_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('holy_event_device_id', deviceId);
  }
  return `user_${deviceId}@holyevent.com`;
};

export default function ClientDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ChurchEvent[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [viewAllAppointments, setViewAllAppointments] = useState(false);
  const [viewAllEvents, setViewAllEvents] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Check authentication using the same system as booking page
  const checkAuthentication = useCallback(() => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      setIsAuthenticated(true);
      return true;
    }
    
    // Check if we have permanent account credentials
    const permanentEmail = getPermanentUserIdentifier();
    const permanentPassword = localStorage.getItem('holy_event_permanent_password');
    
    if (permanentEmail && permanentPassword) {
      // User has permanent account but not logged in yet
      setIsAuthenticated(false);
      return false;
    }
    
    setIsAuthenticated(false);
    router.push('/login?redirect=' + encodeURIComponent('/c/dashboard'));
    return false;
  }, [router]);

  // Load appointments from Firebase using the same logic as booking page
  const loadAppointmentsFromFirebase = async (userEmail: string, userId: string): Promise<Appointment[]> => {
    try {
      if (!db) {
        console.error('Firebase not available');
        return [];
      }

      console.log('🔄 Loading appointments from Firebase for:', { userEmail, userId });
      
      const appointmentsRef = collection(db, 'appointments');
      const appointments: Appointment[] = [];
      
      // Strategy 1: Query by userId (most reliable)
      try {
        const q1 = query(appointmentsRef, where('userId', '==', userId));
        const querySnapshot1 = await getDocs(q1);
        
        querySnapshot1.forEach((doc) => {
          const data = doc.data();
          appointments.push({
            id: doc.id,
            eventType: data.eventType || '',
            eventDate: data.eventDate || '',
            eventTime: data.eventTime || '',
            status: data.status || 'pending',
            submittedAt: convertTimestampToISO(data.createdAt),
            email: data.email || '',
            fullName: data.fullName || '',
            phone: data.phone || '',
            guestCount: data.guestCount || '',
            message: data.message || '',
            userId: data.userId || '',
            userEmail: data.userEmail || '',
            createdAt: data.createdAt
          });
        });
        
        console.log(`✅ Found ${querySnapshot1.size} appointments by userId`);
      } catch (error) {
        console.log('❌ Query by userId failed:', error);
      }
      
      // Strategy 2: Query by userEmail (backup)
      try {
        const q2 = query(appointmentsRef, where('userEmail', '==', userEmail));
        const querySnapshot2 = await getDocs(q2);
        
        querySnapshot2.forEach((doc) => {
          const data = doc.data();
          const appointment = {
            id: doc.id,
            eventType: data.eventType || '',
            eventDate: data.eventDate || '',
            eventTime: data.eventTime || '',
            status: data.status || 'pending',
            submittedAt: convertTimestampToISO(data.createdAt),
            email: data.email || '',
            fullName: data.fullName || '',
            phone: data.phone || '',
            guestCount: data.guestCount || '',
            message: data.message || '',
            userId: data.userId || '',
            userEmail: data.userEmail || '',
            createdAt: data.createdAt
          };
          
          // Check if appointment already exists to avoid duplicates
          if (!appointments.find(a => a.id === doc.id)) {
            appointments.push(appointment);
          }
        });
        
        console.log(`✅ Found ${querySnapshot2.size} appointments by userEmail`);
      } catch (error) {
        console.log('❌ Query by userEmail failed:', error);
      }
      
      // Strategy 3: Query by email (legacy field)
      try {
        const q3 = query(appointmentsRef, where('email', '==', userEmail));
        const querySnapshot3 = await getDocs(q3);
        
        querySnapshot3.forEach((doc) => {
          const data = doc.data();
          const appointment = {
            id: doc.id,
            eventType: data.eventType || '',
            eventDate: data.eventDate || '',
            eventTime: data.eventTime || '',
            status: data.status || 'pending',
            submittedAt: convertTimestampToISO(data.createdAt),
            email: data.email || '',
            fullName: data.fullName || '',
            phone: data.phone || '',
            guestCount: data.guestCount || '',
            message: data.message || '',
            userId: data.userId || '',
            userEmail: data.userEmail || '',
            createdAt: data.createdAt
          };
          
          // Check if appointment already exists to avoid duplicates
          if (!appointments.find(a => a.id === doc.id)) {
            appointments.push(appointment);
          }
        });
        
        console.log(`✅ Found ${querySnapshot3.size} appointments by email`);
      } catch (error) {
        console.log('❌ Query by email failed:', error);
      }
      
      // Remove duplicates and sort by creation date (newest first)
      const uniqueAppointments = Array.from(new Map(appointments.map(item => [item.id, item])).values());
      
      uniqueAppointments.sort((a, b) => {
        const dateA = new Date(a.submittedAt);
        const dateB = new Date(b.submittedAt);
        return dateB.getTime() - dateA.getTime();
      });
      
      console.log(`✅ Total unique appointments loaded: ${uniqueAppointments.length}`);
      
      return uniqueAppointments;
      
    } catch (error: any) {
      console.error('❌ Error loading appointments from Firebase:', error);
      return [];
    }
  };

  // Main dashboard initialization
  useEffect(() => {
    let appointmentsUnsubscribe: (() => void) | null = null;
    let eventsUnsubscribe: (() => void) | null = null;

    const initializeDashboard = async () => {
      try {
        setLoading(true);
        
        // Wait for auth state to be determined
        const authCheck = await new Promise<boolean>((resolve) => {
          const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (user) {
              console.log('✅ User authenticated:', user.email);
              
              // Get user data from permanent account system
              const currentUser: UserData = {
                name: user.displayName || user.email?.split('@')[0] || 'Parishioner',
                email: user.email || '',
                phone: '+639171234567', // Default phone
                userId: user.uid
              };

              setUserData(currentUser);
              setIsAuthenticated(true);

              // Load appointments
              loadAppointmentsFromFirebase(user.email || '', user.uid).then(appts => {
                setAppointments(appts);
                console.log('✅ Appointments loaded:', appts.length);
              });

              resolve(true);
            } else {
              console.log('❌ No user authenticated');
              setIsAuthenticated(false);
              
              // Check if we have permanent account data
              const permanentEmail = getPermanentUserIdentifier();
              if (permanentEmail) {
                const tempUser: UserData = {
                  name: 'Church Event User',
                  email: permanentEmail,
                  phone: '09123456789',
                  userId: 'temp_' + permanentEmail
                };
                setUserData(tempUser);
                
                // Try to load appointments with permanent email
                loadAppointmentsFromFirebase(permanentEmail, 'temp_' + permanentEmail).then(appts => {
                  setAppointments(appts);
                  console.log('✅ Appointments loaded with permanent email:', appts.length);
                });
              }
              
              resolve(false);
            }
          });
        });

        if (!authCheck) {
          toast({
            title: 'Using Guest Access',
            description: 'Some features may be limited. Book appointments to get full access.',
            variant: 'default',
          });
        }

        console.log('🔄 Setting up real-time listeners...');

        // REAL-TIME LISTENER FOR APPOINTMENTS
        const setupAppointmentsListener = () => {
          try {
            const currentUser = auth.currentUser;
            if (currentUser) {
              const appointmentsQuery = query(
                collection(db, 'appointments'),
                where('userId', '==', currentUser.uid)
              );

              appointmentsUnsubscribe = onSnapshot(
                appointmentsQuery, 
                (querySnapshot) => {
                  const userAppointments: Appointment[] = [];
                  querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    userAppointments.push({
                      id: doc.id,
                      eventType: data.eventType || '',
                      eventDate: data.eventDate || '',
                      eventTime: data.eventTime || '',
                      status: data.status || 'pending',
                      submittedAt: convertTimestampToISO(data.createdAt),
                      email: data.email || '',
                      fullName: data.fullName || '',
                      phone: data.phone || '',
                      guestCount: data.guestCount || '',
                      message: data.message || '',
                      userId: data.userId || '',
                      userEmail: data.userEmail || '',
                      createdAt: data.createdAt
                    });
                  });

                  // Sort by date client-side
                  userAppointments.sort((a, b) => {
                    const dateA = new Date(a.submittedAt);
                    const dateB = new Date(b.submittedAt);
                    return dateB.getTime() - dateA.getTime();
                  });
                  
                  console.log('📊 Real-time appointments update:', userAppointments.length);
                  setAppointments(userAppointments);
                },
                (error) => {
                  console.error('❌ Firestore appointments error:', error);
                }
              );
            }
          } catch (error) {
            console.error('❌ Cannot setup appointments listener:', error);
          }
        };

        // REAL-TIME LISTENER FOR CHURCH EVENTS
        const setupEventsListener = () => {
          try {
            const eventsQuery = query(
              collection(db, 'events'),
              where('status', '==', 'active')
            );

            eventsUnsubscribe = onSnapshot(
              eventsQuery, 
              (querySnapshot) => {
                const churchEvents: ChurchEvent[] = [];
                const now = new Date();
                
                querySnapshot.forEach((doc) => {
                  const data = doc.data();
                  const eventDate = data.date;
                  
                  try {
                    const eventDateObj = new Date(eventDate);
                    const isFutureEvent = eventDateObj >= new Date(now.setHours(0, 0, 0, 0));
                    
                    if (isFutureEvent && data.status === 'active') {
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
                        isPublic: data.isPublic !== false,
                        postedAt: data.postedAt,
                        createdAt: data.createdAt,
                        updatedAt: data.updatedAt
                      });
                    }
                  } catch (error) {
                    console.error('Error processing event date:', error);
                  }
                });
                
                // Sort by date client-side
                churchEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                
                console.log('📊 Real-time events update:', churchEvents.length);
                setUpcomingEvents(churchEvents);
              },
              (error) => {
                console.error('❌ Firestore events error:', error);
              }
            );
          } catch (error) {
            console.error('❌ Cannot setup events listener:', error);
          }
        };

        setupAppointmentsListener();
        setupEventsListener();

        setLoading(false);

      } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
        setLoading(false);
        toast({
          title: 'Dashboard Error',
          description: 'Failed to load dashboard data.',
          variant: 'destructive',
        });
      }
    };

    initializeDashboard();

    return () => {
      console.log('🧹 Cleaning up real-time listeners...');
      if (appointmentsUnsubscribe) appointmentsUnsubscribe();
      if (eventsUnsubscribe) eventsUnsubscribe();
    };
  }, [toast]);

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      confirmed: 'default', 
      rejected: 'destructive',
      cancelled: 'destructive',
      pending: 'secondary'
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

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const formattedHour = hour % 12 || 12;
      return `${formattedHour}:${minutes} ${ampm}`;
    } catch (error) {
      return timeString;
    }
  };

  const getUpcomingAppointment = () => {
    const approvedAppointments = appointments.filter(apt => 
      apt.status === 'approved' || apt.status === 'confirmed'
    );
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
  const displayAppointments = viewAllAppointments ? appointments : appointments.slice(0, 3);
  const displayEvents = viewAllEvents ? upcomingEvents : upcomingEvents.slice(0, 3);

  const renderAppointmentDetails = (appointment: Appointment) => (
    <Card key={appointment.id} className="border-l-4 border-l-primary mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">
                {formatEventType(appointment.eventType)}
              </h3>
              {getStatusBadge(appointment.status)}
            </div>
            <div className="text-xs text-muted-foreground">
              Submitted: {formatDate(appointment.submittedAt)}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">Date</div>
                <div className="text-muted-foreground">
                  {formatDate(appointment.eventDate)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">Time</div>
                <div className="text-muted-foreground">{formatTime(appointment.eventTime)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">Guests</div>
                <div className="text-muted-foreground">{appointment.guestCount} people</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">Name</div>
                <div className="text-muted-foreground">{appointment.fullName}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">Phone</div>
                <div className="text-muted-foreground">{appointment.phone}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              <div>
                <div className="font-medium">Email</div>
                <div className="text-muted-foreground">{appointment.email}</div>
              </div>
            </div>
          </div>

          {appointment.message && (
            <div className="bg-muted/50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-1">Additional Notes:</div>
              <div className="text-sm text-muted-foreground">"{appointment.message}"</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
          <p className="text-sm text-muted-foreground mt-2">Setting up real-time updates</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Church className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h2 className="text-2xl font-bold mb-2">Account Not Found</h2>
          <p className="text-muted-foreground mb-4">Please book an appointment first to create your account.</p>
          <Button asChild>
            <Link href="/c/appointments">Book Your First Appointment</Link>
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
                Welcome back! We're glad to have you with us.
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <User className="w-4 h-4" />
                <span>{userData.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {isAuthenticated ? 'Authenticated' : 'Guest Access'}
                </Badge>
              </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="border-l-4 border-l-primary shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                My Appointments
              </CardTitle>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                <Badge variant="secondary" className="text-xs">
                  Live
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground">
                {appointments.filter(apt => apt.status === 'approved' || apt.status === 'confirmed').length} approved • Real-time
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upcoming Events
              </CardTitle>
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <Badge variant="secondary" className="text-xs">
                  Public
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingEvents.length}</div>
              <p className="text-xs text-muted-foreground">Public events • All users can see</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - APPOINTMENTS */}
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
                        <span>{formatTime(upcomingAppointment.eventTime)}</span>
                      </p>
                      {upcomingAppointment.fullName && (
                        <p className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span>{upcomingAppointment.fullName}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* All Appointments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My Appointments</CardTitle>
                  <CardDescription>
                    {viewAllAppointments ? 'All your appointments' : 'Your recent appointments'} • Updates in real-time
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    Total: {appointments.length}
                  </div>
                  {appointments.length > 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewAllAppointments(!viewAllAppointments)}
                    >
                      {viewAllAppointments ? 'Show Less' : 'View All'}
                    </Button>
                  )}
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
                    <>
                      {displayAppointments.map(renderAppointmentDetails)}
                      
                      {appointments.length > 3 && !viewAllAppointments && (
                        <div className="text-center pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setViewAllAppointments(true)}
                          >
                            View All {appointments.length} Appointments
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - EVENTS */}
          <div className="space-y-8">
            {/* Upcoming Events */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Upcoming Church Events</CardTitle>
                  <CardDescription>
                    {viewAllEvents ? 'All upcoming events' : 'Recent upcoming events'} • Updates automatically
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    Total: {upcomingEvents.length}
                  </div>
                  {upcomingEvents.length > 3 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewAllEvents(!viewAllEvents)}
                    >
                      {viewAllEvents ? 'Show Less' : 'View All'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No upcoming events</p>
                      <p className="text-sm mt-2">New events will appear here automatically</p>
                      <p className="text-xs mt-1">Public events for all users</p>
                    </div>
                  ) : (
                    <>
                      {displayEvents.map((event) => (
                        <div key={event.id} className="flex items-start justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors border">
                          <div className="flex-1">
                            <p className="font-medium">{event.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(event.date)} • {formatTime(event.time)}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </p>
                            {event.priest && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <CheckCircle className="w-3 h-3" />
                                {event.priest}
                              </p>
                            )}
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline" className="ml-2 flex-shrink-0">
                            {formatEventType(event.type)}
                          </Badge>
                        </div>
                      ))}
                      
                      {upcomingEvents.length > 3 && !viewAllEvents && (
                        <div className="text-center pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => setViewAllEvents(true)}
                          >
                            View All {upcomingEvents.length} Events
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    🔄 Public events • Visible to all parishioners
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Book New Appointment Card */}
            <Card>
              <CardHeader>
                <CardTitle>Book New Appointment</CardTitle>
                <CardDescription>
                  Schedule your next church service or sacrament
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full">
                  <Link href="/c/appointments">
                    <Calendar className="w-4 h-4 mr-2" />
                    Book Appointment
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}