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
  Heart,
  CheckCircle,
  XCircle,
  CalendarDays
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';

interface Appointment {
  id: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  email: string;
}

interface ChurchEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
}

interface UserData {
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  parishionerId: string;
}

export default function ClientDashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<ChurchEvent[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchDashboardData = () => {
      try {
        setLoading(true);
        
        // Get user data from localStorage or authentication context
        const storedUser = localStorage.getItem('currentUser');
        let currentUser: UserData;

        if (storedUser) {
          currentUser = JSON.parse(storedUser);
        } else {
          // Fallback: Get user from appointments or use default
          const storedAppointments = localStorage.getItem('appointments');
          const appointments: Appointment[] = storedAppointments ? JSON.parse(storedAppointments) : [];
          
          if (appointments.length > 0) {
            // Use the first appointment's user data
            const latestAppointment = appointments[0];
            currentUser = {
              name: latestAppointment.email.split('@')[0], // Use email username as fallback name
              email: latestAppointment.email,
              phone: '+639171234567',
              joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              parishionerId: `P-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
            };
          } else {
            // Default user data if no appointments found
            currentUser = {
              name: 'Parishioner',
              email: 'user@example.com',
              phone: '+639171234567',
              joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
              parishionerId: `P-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
            };
          }
          
          // Save user to localStorage for future use
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        setUserData(currentUser);

        // Get appointments from localStorage
        const storedAppointments = localStorage.getItem('appointments');
        const userAppointments: Appointment[] = storedAppointments 
          ? JSON.parse(storedAppointments)
              .filter((apt: Appointment) => apt.email === currentUser.email)
              .sort((a: Appointment, b: Appointment) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
          : [];

        setAppointments(userAppointments.slice(0, 3)); // Show only latest 3

        // Get church events from localStorage
        const storedEvents = localStorage.getItem('churchEvents');
        const churchEvents: ChurchEvent[] = storedEvents 
          ? JSON.parse(storedEvents)
              .slice(0, 3) // Show only latest 3
          : [];

        setUpcomingEvents(churchEvents);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        
        // Fallback mock data
        setUserData({
          name: 'Parishioner',
          email: 'user@example.com',
          phone: '+639171234567',
          joinDate: 'January 2024',
          parishionerId: 'P-2024-00123'
        });
        setAppointments(getMockAppointments());
        setUpcomingEvents(getMockEvents());
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getMockAppointments = (): Appointment[] => [
    {
      id: '1',
      eventType: 'Baptism',
      eventDate: '2025-11-18',
      eventTime: '09:00 AM',
      status: 'approved',
      submittedAt: '2025-11-15T10:30:00Z',
      email: 'user@example.com'
    },
    {
      id: '2',
      eventType: 'Wedding',
      eventDate: '2025-12-01',
      eventTime: '02:00 PM',
      status: 'approved',
      submittedAt: '2025-11-14T14:20:00Z',
      email: 'user@example.com'
    }
  ];

  const getMockEvents = (): ChurchEvent[] => [
    {
      id: '1',
      title: 'Feast of Christ the King',
      date: '2025-11-24',
      time: '9:00 AM',
      location: 'Main Sanctuary',
      description: 'Special mass celebration'
    },
    {
      id: '2',
      title: 'Advent Recollection',
      date: '2025-12-07',
      time: '2:00 PM',
      location: 'Parish Hall',
      description: 'Preparation for Christmas season'
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'secondary',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getUpcomingAppointment = () => {
    const approvedAppointments = appointments.filter(apt => apt.status === 'approved');
    const upcoming = approvedAppointments
      .filter(apt => new Date(apt.eventDate) >= new Date())
      .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime())[0];
    
    return upcoming;
  };

  const upcomingAppointment = getUpcomingAppointment();

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
              <Calendar className="w-5 h-5 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{appointments.length}</div>
              <p className="text-xs text-muted-foreground">
                Total bookings
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
              <p className="text-xs text-muted-foreground">This month</p>
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

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button asChild size="lg" className="h-24 flex flex-col gap-2 bg-gradient-to-br from-primary to-primary/80 hover:from-primary/80 hover:to-primary text-primary-foreground shadow-lg">
              <Link href="/c/appointments">
                <Calendar className="w-8 h-8" />
                <span className="text-sm">Book Appointment</span>
              </Link>
            </Button>

            <Button asChild size="lg" className="h-24 flex flex-col gap-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg">
              <Link href="/c/tour">
                <MapPin className="w-8 h-8" />
                <span className="text-sm">Virtual Tour</span>
              </Link>
            </Button>

            <Button asChild size="lg" className="h-24 flex flex-col gap-2 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg">
              <Link href="/c/about">
                <Church className="w-8 h-8" />
                <span className="text-sm">About Church</span>
              </Link>
            </Button>

            <Button asChild size="lg" variant="outline" className="h-24 flex flex-col gap-2 border-2 hover:border-primary shadow-lg">
              <Link href="/c/settings">
                <Heart className="w-8 h-8" />
                <span className="text-sm">My Profile</span>
              </Link>
            </Button>
          </div>
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
                        {upcomingAppointment.eventType}
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
                  <CardDescription>Your recent sacrament requests</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link href="/c/appointments">
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
                      <Button asChild className="mt-4">
                        <Link href="/c/appointments">
                          Book Your First Appointment
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    appointments.map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            appointment.status === 'approved' ? 'bg-green-100 text-green-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {appointment.status === 'approved' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="font-medium">{appointment.eventType}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(appointment.eventDate)} • {appointment.eventTime}
                            </p>
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
                <CardDescription>Join our community activities</CardDescription>
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
                        </div>
                        <Badge variant="outline">Event</Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Welcome Message for New Users */}
        {appointments.length === 0 && (
          <Card className="mt-8 bg-primary/5 border-primary/20">
            <CardContent className="p-8 text-center">
              <Church className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-bold mb-2">Welcome to Saint Augustine Parish!</h3>
              <p className="text-muted-foreground mb-6">
                We're thrilled to have you as part of our community. Get started by booking your first appointment or exploring our church.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/c/appointments">
                    <Calendar className="w-5 h-5" />
                    Book First Appointment
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="gap-2">
                  <Link href="/c/tour">
                    <MapPin className="w-5 h-5" />
                    Take Virtual Tour
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}