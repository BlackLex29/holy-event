// app/a/appointments/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Mail,
  Phone,
  Download,
  Printer,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { db } from '@/lib/firebase-config';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  where,
  onSnapshot 
} from 'firebase/firestore';

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
  updatedAt: any;
}

export default function ManageAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Real-time listener for appointments
  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true);
        const appointmentsQuery = query(
          collection(db, 'appointments'),
          orderBy('createdAt', 'desc')
        );

        // Real-time listener
        const unsubscribe = onSnapshot(appointmentsQuery, (querySnapshot) => {
          const appointmentsData: Appointment[] = [];
          querySnapshot.forEach((doc) => {
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
              createdAt: data.createdAt,
              updatedAt: data.updatedAt
            });
          });
          
          setAppointments(appointmentsData);
          setLoading(false);
          setRefreshing(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching appointments:', error);
        toast({
          title: 'Error',
          description: 'Failed to load appointments from Firebase',
          variant: 'destructive'
        });
        setLoading(false);
        setRefreshing(false);
        
        // Fallback to localStorage
        const storedAppointments = localStorage.getItem('appointments');
        if (storedAppointments) {
          try {
            const localAppointments: Appointment[] = JSON.parse(storedAppointments);
            setAppointments(localAppointments);
          } catch (e) {
            console.error('Failed to load from localStorage:', e);
          }
        }
      }
    };

    fetchAppointments();
  }, [toast]);

  // Filter appointments based on search and status
  useEffect(() => {
    let filtered = appointments;

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(apt =>
        apt.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.eventType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apt.phone.includes(searchTerm)
      );
    }

    setFilteredAppointments(filtered);
  }, [appointments, searchTerm, statusFilter]);

  // Update appointment status in Firebase
  const handleStatusUpdate = async (appointmentId: string, newStatus: 'approved' | 'rejected') => {
    try {
      setRefreshing(true);
      
      // Update in Firebase
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      // Also update localStorage as backup
      const updatedAppointments = appointments.map(apt =>
        apt.id === appointmentId ? { ...apt, status: newStatus } : apt
      );
      localStorage.setItem('appointments', JSON.stringify(updatedAppointments));

      const appointment = appointments.find(apt => apt.id === appointmentId);
      
      toast({
        title: `Appointment ${newStatus === 'approved' ? 'Approved' : 'Rejected'}`,
        description: `${appointment?.fullName}'s ${formatEventType(appointment?.eventType || '')} has been ${newStatus}.`,
      });

    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: 'Error',
        description: `Failed to update appointment status`,
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Refresh data manually
  const handleRefresh = () => {
    setRefreshing(true);
    // The real-time listener will automatically update the data
    setTimeout(() => setRefreshing(false), 1000);
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
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEventType = (eventType: string): string => {
    const eventMap: Record<string, string> = {
      'mass': 'Holy Mass',
      'wedding': 'Wedding',
      'baptism': 'Baptism',
      'funeral': 'Funeral Mass'
    };
    return eventMap[eventType] || eventType;
  };

  const getStats = () => {
    const total = appointments.length;
    const pending = appointments.filter(apt => apt.status === 'pending').length;
    const approved = appointments.filter(apt => apt.status === 'approved').length;
    const rejected = appointments.filter(apt => apt.status === 'rejected').length;

    return { total, pending, approved, rejected };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading appointments from Firebase...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <Calendar className="w-10 h-10" />
                Manage Appointments
              </h1>
              <p className="mt-2 text-primary-foreground/80">
                Real-time management of all sacrament appointment requests from Firebase
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
                Refresh
              </Button>
              <Button variant="secondary" size="lg" className="gap-2">
                <Download className="w-5 h-5" />
                Export
              </Button>
              <Button variant="secondary" size="lg" className="gap-2">
                <Printer className="w-5 h-5" />
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 -mt-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Appointments</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Calendar className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.approved}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rejected</p>
                  <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="flex flex-1 gap-4 w-full md:w-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, email, or event type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('all')}
                  size="sm"
                >
                  All ({stats.total})
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('pending')}
                  size="sm"
                  className="gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Pending ({stats.pending})
                </Button>
                <Button
                  variant={statusFilter === 'approved' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('approved')}
                  size="sm"
                  className="gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approved ({stats.approved})
                </Button>
                <Button
                  variant={statusFilter === 'rejected' ? 'default' : 'outline'}
                  onClick={() => setStatusFilter('rejected')}
                  size="sm"
                  className="gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Rejected ({stats.rejected})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Requests</CardTitle>
            <CardDescription>
              {filteredAppointments.length} appointment(s) found • Real-time from Firebase
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">No appointments found</p>
                  <p className="text-sm mt-2">
                    {appointments.length === 0 
                      ? "No appointments have been submitted yet." 
                      : "Try adjusting your search or filters."}
                  </p>
                </div>
              ) : (
                filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Appointment Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-bold text-lg flex items-center gap-2">
                              <User className="w-5 h-5 text-primary" />
                              {appointment.fullName}
                            </h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {appointment.email}
                              </span>
                              <span className="flex items-center gap-1">
                                <Phone className="w-4 h-4" />
                                {appointment.phone}
                              </span>
                            </div>
                          </div>
                          {getStatusBadge(appointment.status)}
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="font-semibold">Event Type</p>
                            <p className="text-primary">{formatEventType(appointment.eventType)}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Date & Time</p>
                            <p>{formatDate(appointment.eventDate)} at {appointment.eventTime}</p>
                          </div>
                          <div>
                            <p className="font-semibold">Guests</p>
                            <p>{appointment.guestCount} people</p>
                          </div>
                          <div>
                            <p className="font-semibold">Submitted</p>
                            <p>{formatDateTime(appointment.createdAt)}</p>
                          </div>
                        </div>

                        {appointment.message && (
                          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                            <p className="font-semibold text-sm mb-1">Additional Notes:</p>
                            <p className="text-sm">"{appointment.message}"</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 lg:w-48">
                        {appointment.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => handleStatusUpdate(appointment.id, 'approved')}
                              className="gap-2 bg-green-600 hover:bg-green-700"
                              size="sm"
                              disabled={refreshing}
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleStatusUpdate(appointment.id, 'rejected')}
                              variant="outline"
                              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                              size="sm"
                              disabled={refreshing}
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setSelectedAppointment(appointment)}
                        >
                          <Eye className="w-4 h-4" />
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-6 h-6" />
                Appointment Details
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-4"
                onClick={() => setSelectedAppointment(null)}
              >
                ✕
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold">Full Name</p>
                  <p>{selectedAppointment.fullName}</p>
                </div>
                <div>
                  <p className="font-semibold">Email</p>
                  <p>{selectedAppointment.email}</p>
                </div>
                <div>
                  <p className="font-semibold">Phone</p>
                  <p>{selectedAppointment.phone}</p>
                </div>
                <div>
                  <p className="font-semibold">Event Type</p>
                  <p>{formatEventType(selectedAppointment.eventType)}</p>
                </div>
                <div>
                  <p className="font-semibold">Date</p>
                  <p>{formatDate(selectedAppointment.eventDate)}</p>
                </div>
                <div>
                  <p className="font-semibold">Time</p>
                  <p>{selectedAppointment.eventTime}</p>
                </div>
                <div>
                  <p className="font-semibold">Number of Guests</p>
                  <p>{selectedAppointment.guestCount}</p>
                </div>
                <div>
                  <p className="font-semibold">Status</p>
                  {getStatusBadge(selectedAppointment.status)}
                </div>
                <div className="md:col-span-2">
                  <p className="font-semibold">Submitted On</p>
                  <p>{formatDateTime(selectedAppointment.createdAt)}</p>
                </div>
              </div>
              
              {selectedAppointment.message && (
                <div>
                  <p className="font-semibold">Additional Message</p>
                  <p className="p-3 bg-muted/50 rounded-lg mt-1">"{selectedAppointment.message}"</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={() => {
                    setSelectedAppointment(null);
                  }}
                  variant="outline"
                >
                  Close
                </Button>
                {selectedAppointment.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => {
                        handleStatusUpdate(selectedAppointment.id, 'approved');
                        setSelectedAppointment(null);
                      }}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={refreshing}
                    >
                      Approve Appointment
                    </Button>
                    <Button
                      onClick={() => {
                        handleStatusUpdate(selectedAppointment.id, 'rejected');
                        setSelectedAppointment(null);
                      }}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={refreshing}
                    >
                      Reject Appointment
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}