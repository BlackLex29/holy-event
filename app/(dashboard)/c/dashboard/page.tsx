"use client";

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
  CheckCircle,
  XCircle,
  CalendarDays,
  RefreshCw,
  LogOut,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { db, auth } from '@/lib/firebase-config';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
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

const getCurrentSessionId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('currentSessionId');
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

export default function ClientDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ChurchEvent[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [sessionConflict, setSessionConflict] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Session conflict detection and forced logout
  const handleForcedLogout = async () => {
    try {
      console.log('🚨 Starting forced logout due to session conflict...');
      
      // Clear all local storage
      localStorage.removeItem('userRole');
      localStorage.removeItem('authToken');
      localStorage.removeItem('church_appointment_userId');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('church_appointment_userEmail');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('currentSessionId');
      localStorage.removeItem('appointments');
      localStorage.removeItem('churchEvents');
      
      // Sign out from Firebase
      if (auth.currentUser) {
        await signOut(auth);
      }
      
      // Show conflict message - REMOVED DURATION PROPERTY
      toast({
        title: 'Session Conflict Detected',
        description: 'Another user logged into this account. You have been signed out for security.',
        variant: 'destructive',
      });
      
      // Redirect to login page
      setTimeout(() => {
        setSessionConflict(false);
        router.push('/login?session=conflict');
      }, 3000);
      
    } catch (error) {
      console.error('Error during forced logout:', error);
      router.push('/login');
    }
  };

  // Real-time session monitoring
  useEffect(() => {
    let unsubscribeUserListener: () => void = () => {};
    let unsubscribeAuthListener: () => void = () => {};

    const setupSessionMonitoring = async (user: any) => {
      const userId = user.uid;
      setCurrentUserId(userId);
      
      const userDocRef = doc(db, 'users', userId);
      const currentSessionId = getCurrentSessionId();

      console.log('🔐 Setting up session monitoring for user:', userId);
      console.log('📱 Current session ID:', currentSessionId);

      if (!currentSessionId) {
        console.warn('⚠️ No session ID found in localStorage');
        return;
      }

      // Listen for session changes in Firestore
      unsubscribeUserListener = onSnapshot(userDocRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          const firestoreSessionId = userData.currentSessionId;
          
          console.log('🔄 Session check:', {
            local: currentSessionId,
            firestore: firestoreSessionId,
            match: firestoreSessionId === currentSessionId
          });

          // Check if session has been invalidated (another login occurred)
          if (firestoreSessionId && firestoreSessionId !== currentSessionId) {
            console.log('🚨 SESSION CONFLICT DETECTED! Another user logged in.');
            setSessionConflict(true);
            
            // Show immediate toast notification - REMOVED DURATION PROPERTY
            toast({
              title: 'Security Alert',
              description: 'Another login detected from different device.',
              variant: 'destructive',
            });
            
            // Auto logout after short delay
            setTimeout(() => {
              handleForcedLogout();
            }, 2000);
          }
        }
      }, (error) => {
        console.error('❌ Error monitoring user session:', error);
      });
    };

    // Auth state listener
    unsubscribeAuthListener = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await setupSessionMonitoring(user);
      } else {
        // Clean up listeners when user logs out
        unsubscribeUserListener();
      }
    });

    return () => {
      unsubscribeUserListener();
      unsubscribeAuthListener();
    };
  }, [toast, router]);

  // Real-time Firestore listeners - READ ONLY
  useEffect(() => {
    // Don't setup data listeners if session conflict is detected
    if (sessionConflict) {
      return;
    }

    const checkAuthentication = () => {
      const userId = getUserId();
      const userEmail = getUserEmail();
      const sessionId = getCurrentSessionId();
      
      if (!userId || !userEmail || !sessionId) {
        console.log('❌ Authentication missing:', { userId, userEmail, sessionId });
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

    const initializeDashboard = async () => {
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

        // Verify session is still valid
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const currentSessionId = getCurrentSessionId();
            
            if (userData.currentSessionId && userData.currentSessionId !== currentSessionId) {
              console.log('🚨 Session invalid on dashboard load');
              setSessionConflict(true);
              return;
            }
          }
        } catch (error) {
          console.error('Error verifying session:', error);
        }

        // Get user data
        const currentUser: UserData = {
          name: userEmail.split('@')[0] || 'Parishioner',
          email: userEmail,
          phone: '+639171234567'
        };

        setUserData(currentUser);

        console.log('🔄 Setting up READ-ONLY real-time listeners...');

        // REAL-TIME LISTENER FOR APPOINTMENTS (User-specific) - READ ONLY
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );

        const appointmentsUnsubscribe = onSnapshot(
          appointmentsQuery, 
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
                submittedAt: convertTimestampToISO(data.createdAt),
                email: data.email || '',
                fullName: data.fullName || '',
                phone: data.phone || '',
                guestCount: data.guestCount || '',
                message: data.message || '',
                userId: data.userId || '',
                createdAt: data.createdAt
              };
              userAppointments.push(appointment);
            });
            
            console.log('📊 Real-time appointments update:', userAppointments.length);
            
            // Update localStorage with latest appointments
            localStorage.setItem('appointments', JSON.stringify(userAppointments));
            
            // Show only latest 3 appointments for dashboard
            const latestAppointments = userAppointments.slice(0, 3);
            setAppointments(latestAppointments);
            
            // Show toast for status changes
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
            console.error('❌ Firestore appointments error:', error);
            toast({
              title: 'Connection Issue',
              description: 'Using cached appointments data.',
              variant: 'destructive',
            });
            loadAppointmentsFromLocalStorage();
          }
        );

        // REAL-TIME LISTENER FOR CHURCH EVENTS (Public - READ ONLY)
        const setupEventsListener = () => {
          console.log('🎯 Setting up READ-ONLY real-time events listener...');
          
          try {
            // Try multiple collections for events
            const collectionsToTry = ['events', 'churchevents', 'church_events'];
            
            let activeUnsubscribe: (() => void) | null = null;
            
            const tryCollection = (collectionName: string): Promise<boolean> => {
              return new Promise((resolve) => {
                try {
                  // SIMPLIFIED QUERY - No composite index needed
                  // Just get all active events and filter client-side
                  const eventsQuery = query(
                    collection(db, collectionName),
                    where('status', '==', 'active')
                    // Removed orderBy('date', 'asc') to avoid composite index requirement
                  );
                  
                  const eventsUnsubscribe = onSnapshot(
                    eventsQuery, 
                    (querySnapshot) => {
                      console.log(`📡 Real-time PUBLIC events from ${collectionName}:`, querySnapshot.size, 'events');
                      
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
                      
                      if (churchEvents.length > 0) {
                        console.log(`✅ Loaded ${churchEvents.length} PUBLIC events from ${collectionName}`);
                        
                        // Get upcoming 3 events
                        const upcomingThreeEvents = churchEvents.slice(0, 3);
                        
                        setUpcomingEvents(upcomingThreeEvents);
                        
                        // Save to localStorage as backup
                        localStorage.setItem('churchEvents', JSON.stringify(churchEvents.map(event => ({
                          ...event,
                          postedAt: convertTimestampToISO(event.postedAt),
                          createdAt: convertTimestampToISO(event.createdAt),
                          updatedAt: convertTimestampToISO(event.updatedAt)
                        }))));
                        
                        activeUnsubscribe = eventsUnsubscribe;
                        resolve(true);
                      } else {
                        console.log(`📭 No upcoming PUBLIC events found in ${collectionName}`);
                        resolve(false);
                      }
                    },
                    (error) => {
                      console.error(`❌ ${collectionName} listener error:`, error);
                      resolve(false);
                    }
                  );
                  
                } catch (error) {
                  console.error(`❌ Cannot setup ${collectionName} listener:`, error);
                  resolve(false);
                }
              });
            };

            // Try all collections sequentially
            const tryCollectionsSequentially = async () => {
              let success = false;
              for (const collectionName of collectionsToTry) {
                success = await tryCollection(collectionName);
                if (success) break;
              }

              // If all collections fail, load from localStorage
              if (!success) {
                console.log('📭 No events found in any collection, loading from localStorage');
                loadEventsFromLocalStorage();
              }
            };

            tryCollectionsSequentially();

            // Return cleanup function
            return () => {
              if (activeUnsubscribe) {
                activeUnsubscribe();
              }
            };
            
          } catch (error) {
            console.error('❌ Cannot setup PUBLIC events listener:', error);
            loadEventsFromLocalStorage();
          }
        };

        // Setup real-time events listener
        const eventsCleanup = setupEventsListener();

        setLoading(false);

        return () => {
          console.log('🧹 Cleaning up real-time listeners...');
          appointmentsUnsubscribe();
          if (eventsCleanup) eventsCleanup();
        };

      } catch (error) {
        console.error('❌ Error initializing dashboard:', error);
        toast({
          title: 'Initialization Error',
          description: 'Loading cached data...',
          variant: 'destructive',
        });
        loadAppointmentsFromLocalStorage();
        loadEventsFromLocalStorage();
        setLoading(false);
      }
    };

    initializeDashboard();
  }, [toast, router, sessionConflict]);

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
        
        console.log('📱 Loaded appointments from localStorage:', userAppointments.length);
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
        const now = new Date();
        const futureEvents = allEvents
          .filter(event => {
            try {
              const eventDate = new Date(event.date);
              return eventDate >= new Date(now.setHours(0, 0, 0, 0)) && event.status === 'active';
            } catch {
              return false;
            }
          })
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);
        
        setUpcomingEvents(futureEvents);
        console.log('📱 Loaded events from localStorage:', futureEvents.length);
      } else {
        console.log('📱 No events in localStorage');
        setUpcomingEvents([]);
      }
    } catch (error) {
      console.error('Error loading events from localStorage:', error);
      setUpcomingEvents([]);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      rejected: 'destructive',
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

  const handleRefreshData = async () => {
    setRefreshing(true);
    try {
      // Clear localStorage to force fresh data
      localStorage.removeItem('churchEvents');
      localStorage.removeItem('appointments');
      
      // Clear current data
      setAppointments([]);
      setUpcomingEvents([]);
      
      // Reload from Firestore
      toast({
        title: 'Refreshing Data',
        description: 'Fetching latest data from server...',
      });
      
      // The real-time listeners will automatically update the data
      // from Firestore when they reconnect
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: 'Refresh Failed',
        description: 'Please check your connection',
        variant: 'destructive',
      });
    } finally {
      setTimeout(() => setRefreshing(false), 2000);
    }
  };

  // Session Conflict Modal
  if (sessionConflict) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md border-red-300 shadow-xl">
          <CardHeader className="bg-red-500 p-6 rounded-t-lg text-white">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-8 h-8" />
              <div>
                <CardTitle className="text-xl">Security Alert</CardTitle>
                <CardDescription className="text-red-100">
                  Multiple login detected
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="font-semibold text-red-800 mb-2">Another login detected on your account</p>
              <p className="text-sm text-red-700">
                For security reasons, you are being signed out. This usually happens when you log in from another device or browser.
              </p>
            </div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Redirecting to login page...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
          <p className="text-muted-foreground mb-4">Please log in to access your dashboard.</p>
          <Button asChild>
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  const upcomingAppointment = getUpcomingAppointment();

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
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-medium">{userData.name}</p>
                <p className="text-sm text-primary-foreground/80">{userData.email}</p>
                <Badge variant="secondary" className="mt-1 text-xs">
                  🔐 Secure Session
                </Badge>
              </div>
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
                {appointments.filter(apt => apt.status === 'approved').length} approved • Real-time
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

            {/* Recent Appointments */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Recent Appointments</CardTitle>
                  <CardDescription>
                    Your recent sacrament requests • Updates in real-time
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
                              {formatDate(appointment.eventDate)} • {formatTime(appointment.eventTime)}
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
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Upcoming Church Events</CardTitle>
                  <CardDescription>
                    Public events for everyone • Updates automatically
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefreshData}
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </Button>
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
                    upcomingEvents.map((event) => (
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
                    ))
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground text-center">
                    🔄 Public events • Visible to all parishioners
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}