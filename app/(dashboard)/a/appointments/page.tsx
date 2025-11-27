'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Church,
  Clock,
  User,
  Mail,
  Phone,
  Sparkles
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebase-config';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
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

const ManageAppointmentsPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [refreshEffect, setRefreshEffect] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<string>('');
  const { toast } = useToast();

  // Real-time listener for appointments
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const setupRealTimeListener = () => {
      try {
        setLoading(true);
        
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          orderBy('createdAt', 'desc')
        );

        unsubscribe = onSnapshot(appointmentsQuery, 
          (snapshot) => {
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
            setLoading(false);
            
            // Auto-update last refresh time on real-time updates
            if (!refreshing) {
              setLastRefreshTime(new Date().toLocaleTimeString());
            }
          },
          (error) => {
            console.error('Error in real-time listener:', error);
            toast({
              title: 'Connection Error',
              description: 'Failed to connect to real-time updates',
              variant: 'destructive'
            });
            setLoading(false);
          }
        );

      } catch (error) {
        console.error('Error setting up real-time listener:', error);
        setLoading(false);
      }
    };

    setupRealTimeListener();

    // Cleanup function
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [toast, refreshing]);

  // Filter appointments based on search and status
  useEffect(() => {
    let filtered = appointments;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(appointment => appointment.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(appointment =>
        appointment.fullName.toLowerCase().includes(searchLower) ||
        appointment.email.toLowerCase().includes(searchLower) ||
        appointment.eventType.toLowerCase().includes(searchLower) ||
        appointment.phone.includes(searchTerm)
      );
    }

    setFilteredAppointments(filtered);
  }, [appointments, searchTerm, statusFilter]);

  // Handle appointment actions
  const handleAppointmentAction = async (appointmentId: string, action: 'approve' | 'reject') => {
    try {
      setRefreshing(true);
      
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: action === 'approve' ? 'approved' : 'rejected',
        updatedAt: new Date()
      });

      toast({
        title: `Appointment ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `The appointment has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Error',
        description: `Failed to ${action} appointment`,
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh animation effect
  useEffect(() => {
    if (refreshEffect) {
      const timer = setTimeout(() => {
        setRefreshEffect(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [refreshEffect]);

  // Manual refresh function with visual effects
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setRefreshEffect(true);
      
      // Add a small delay to show the refresh animation
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Force refresh by re-querying the data
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(appointmentsQuery);
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
      setLastRefreshTime(new Date().toLocaleTimeString());
      
      toast({
        title: '✅ Data Refreshed!',
        description: `Appointments updated at ${new Date().toLocaleTimeString()}`,
      });
      
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: '❌ Refresh Failed',
        description: 'Could not refresh appointments data',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <Badge variant="outline" className={`${colors[status as keyof typeof colors]} font-medium`}>
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
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusCount = (status: string) => {
    return appointments.filter(apt => apt.status === status).length;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Calendar className="w-8 h-8 sm:w-10 sm:h-10" />
                Manage Appointments
              </h1>
              <p className="mt-2 text-primary-foreground/80 text-sm sm:text-base">
                Review and manage all sacrament appointment requests
                {lastRefreshTime && (
                  <span className="block text-xs opacity-70 mt-1">
                    Last updated: {lastRefreshTime}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Button 
                variant="secondary" 
                size="sm"
                className={`gap-2 flex-1 sm:flex-none transition-all duration-300 ${
                  refreshEffect ? 'bg-green-100 text-green-700 border-green-200 scale-105' : ''
                } ${
                  refreshing ? 'opacity-70' : 'hover:scale-105'
                }`}
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshEffect ? (
                  <Sparkles className="w-4 h-4 animate-pulse" />
                ) : (
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                )}
                <span className="hidden sm:inline">
                  {refreshing ? 'Refreshing...' : refreshEffect ? 'Refreshed!' : 'Refresh'}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 -mt-2 sm:-mt-4">
        {/* Refresh Animation Overlay */}
        {refreshEffect && (
          <div className="fixed inset-0 bg-green-500/10 pointer-events-none z-50 animate-pulse" />
        )}

        {/* Stats Overview with Refresh Effects */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8 transition-all duration-500 ${
          refreshEffect ? 'scale-105' : 'scale-100'
        }`}>
          <Card className={`border-l-4 border-l-yellow-500 shadow-lg transition-all duration-300 ${
            refreshEffect ? 'animate-bounce' : 'hover:shadow-xl'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{getStatusCount('pending')}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>

          <Card className={`border-l-4 border-l-green-500 shadow-lg transition-all duration-300 ${
            refreshEffect ? 'animate-bounce' : 'hover:shadow-xl'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved
              </CardTitle>
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{getStatusCount('approved')}</div>
              <p className="text-xs text-muted-foreground">Confirmed appointments</p>
            </CardContent>
          </Card>

          <Card className={`border-l-4 border-l-red-500 shadow-lg transition-all duration-300 ${
            refreshEffect ? 'animate-bounce' : 'hover:shadow-xl'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Rejected
              </CardTitle>
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{getStatusCount('rejected')}</div>
              <p className="text-xs text-muted-foreground">Declined requests</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className={`mb-6 sm:mb-8 transition-all duration-300 ${
          refreshEffect ? 'ring-2 ring-green-400' : ''
        }`}>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name, email, or event type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                >
                  Pending
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('approved')}
                >
                  Approved
                </Button>
                <Button
                  variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('rejected')}
                >
                  Rejected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card className={`transition-all duration-500 ${
          refreshEffect ? 'ring-2 ring-blue-400 bg-blue-50/30' : ''
        }`}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg sm:text-xl">All Appointments</CardTitle>
                <CardDescription className="text-sm">
                  {filteredAppointments.length} appointment(s) found
                  {searchTerm && ` for "${searchTerm}"`}
                  {statusFilter !== 'all' && ` (${statusFilter})`}
                </CardDescription>
              </div>
              {refreshing && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating...
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <div className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No appointments found</p>
                  <p className="text-sm">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters' 
                      : 'No appointment requests have been submitted yet.'
                    }
                  </p>
                </div>
              ) : (
                filteredAppointments.map((appointment, index) => (
                  <div 
                    key={appointment.id} 
                    className={`p-4 sm:p-6 rounded-lg border bg-card hover:shadow-lg transition-all duration-200 ${
                      refreshEffect ? 'animate-pulse bg-green-50/50' : ''
                    }`}
                    style={{
                      animationDelay: refreshEffect ? `${index * 0.1}s` : '0s'
                    }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Appointment Details */}
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {appointment.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg truncate">{appointment.fullName}</h3>
                                {getStatusBadge(appointment.status)}
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <span className="font-medium text-primary">
                                    {formatEventType(appointment.eventType)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <span>
                                    {formatDate(appointment.eventDate)} at {appointment.eventTime}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span>{appointment.guestCount} guests</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  <span className="truncate">{appointment.email}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  <span>{appointment.phone}</span>
                                </div>
                              </div>

                              {appointment.message && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                  <p className="text-sm text-muted-foreground italic">
                                    "{appointment.message}"
                                  </p>
                                </div>
                              )}

                              <p className="text-xs text-muted-foreground mt-3">
                                Submitted: {formatDateTime(appointment.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      {appointment.status === 'pending' && (
                        <div className="flex lg:flex-col gap-2 lg:items-end flex-shrink-0">
                          <Button
                            size="sm"
                            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleAppointmentAction(appointment.id, 'approve')}
                            disabled={refreshing}
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleAppointmentAction(appointment.id, 'reject')}
                            disabled={refreshing}
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="mt-8 sm:mt-12 text-center text-xs sm:text-sm text-muted-foreground">
          <p>"Whatever you do, work at it with all your heart, as working for the Lord." — Colossians 3:23</p>
          {lastRefreshTime && (
            <p className="mt-2 text-xs opacity-70">
              Last manual refresh: {lastRefreshTime}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManageAppointmentsPage;