'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Church,
  Phone,
  Mail,
  Bell,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase-config';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  getDocs, 
  query, 
  orderBy,
  where,
  onSnapshot,
  Timestamp,
  FieldValue 
} from 'firebase/firestore';

// ==================== ZOD SCHEMA ====================
const formSchema = z.object({
  eventType: z.string().min(1, 'Please select an event type'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
  eventDate: z.date().refine(
    (date) => date && date >= new Date(),
    { message: 'Please select a valid future date' }
  ),
  eventTime: z.string().min(1, 'Please select a time'),
  guestCount: z.string().min(1, 'Please enter number of guests'),
  message: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// ==================== INTERFACES ====================
interface ChurchEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  priest?: string;
  postedAt: Timestamp | Date | string;
  status?: string;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

interface AppointmentData {
  fullName: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  guestCount: string;
  message?: string;
  status: string;
  createdAt: FieldValue;
  updatedAt: FieldValue;
}

// ==================== ALLOWED TIMES ====================
const allowedTimes: Record<string, string[]> = {
  mass: ['06:00', '07:30', '17:00'],
  wedding: ['10:00', '14:00', '16:00'],
  baptism: ['07:00', '15:00'],
  funeral: ['09:00', '13:00'],
};

// Event type mapping for display
const eventTypeMap: Record<string, string> = {
  mass: 'Holy Mass',
  wedding: 'Wedding',
  baptism: 'Baptism',
  funeral: 'Funeral Mass',
  confession: 'Confession',
  rosary: 'Holy Rosary',
  adoration: 'Adoration',
  recollection: 'Recollection'
};

// Event icons mapping
const eventIcons: Record<string, any> = {
  mass: Church,
  wedding: Church,
  baptism: Church,
  funeral: Church,
  confession: Church,
  rosary: Church,
  adoration: Church,
  recollection: Church,
};

// ==================== MAIN COMPONENT ====================
export default function EventAppointmentPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [successData, setSuccessData] = useState<{name: string; eventType: string; date: string; time: string} | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
    defaultValues: {
      guestCount: '1'
    }
  });

  const eventType = useWatch({ control, name: 'eventType' });
  const eventTime = useWatch({ control, name: 'eventTime' });

  // Auto-clear time when event type changes
  useEffect(() => {
    if (eventType && eventTime && !allowedTimes[eventType]?.includes(eventTime)) {
      setValue('eventTime', '');
      trigger('eventTime');
    }
  }, [eventType, eventTime, setValue, trigger]);

  // Load upcoming events from Firebase Firestore with real-time updates
  const loadEvents = async () => {
    setIsLoadingEvents(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = format(today, 'yyyy-MM-dd');
      
      console.log('🔍 Loading events from Firestore...');
      console.log('📅 Today:', todayStr);
      
      const eventsQuery = query(
        collection(db, 'events'),
        where('date', '>=', todayStr),
        orderBy('date', 'asc'),
        orderBy('time', 'asc')
      );
      
      const querySnapshot = await getDocs(eventsQuery);
      console.log('📊 Query snapshot size:', querySnapshot.size);
      
      const eventsData: ChurchEvent[] = querySnapshot.docs.map(doc => {
        const data = doc.data();
        console.log('📄 Document data:', doc.id, data);
        return {
          id: doc.id,
          type: data.type || '',
          title: data.title || '',
          description: data.description || '',
          date: data.date || '',
          time: data.time || '',
          location: data.location || '',
          priest: data.priest || '',
          postedAt: data.postedAt || new Date(),
        };
      });
      
      console.log('✅ Final events data:', eventsData);
      setEvents(eventsData);
      
    } catch (error: any) {
      console.error('❌ Error loading events from Firestore:', error);
      
      // Fallback to localStorage if Firebase fails
      try {
        const saved = localStorage.getItem('churchEvents');
        if (saved) {
          const parsed = JSON.parse(saved);
          const today = new Date().toISOString().split('T')[0];
          const futureEvents = parsed
            .filter((event: any) => event.date >= today)
            .sort((a: any, b: any) => {
              const dateCompare = a.date.localeCompare(b.date);
              if (dateCompare !== 0) return dateCompare;
              return (a.time || '').localeCompare(b.time || '');
            });
          
          console.log('📂 Loaded events from localStorage:', futureEvents.length);
          setEvents(futureEvents);
        } else {
          setEvents([]);
        }
      } catch (e) {
        console.error('❌ Failed to load events from localStorage:', e);
        setEvents([]);
      }
      
      toast({
        title: 'Notice',
        description: 'Using cached events data',
        variant: 'default',
      });
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Real-time listener for events
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = format(today, 'yyyy-MM-dd');
    
    console.log('🎯 Setting up real-time listener for events...');
    
    const eventsQuery = query(
      collection(db, 'events'),
      where('date', '>=', todayStr),
      orderBy('date', 'asc'),
      orderBy('time', 'asc')
    );
    
    const unsubscribe = onSnapshot(eventsQuery, 
      (querySnapshot) => {
        console.log('🔄 Real-time update received');
        const eventsData: ChurchEvent[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            type: data.type || '',
            title: data.title || '',
            description: data.description || '',
            date: data.date || '',
            time: data.time || '',
            location: data.location || '',
            priest: data.priest || '',
            postedAt: data.postedAt || new Date(),
          };
        });
        console.log('📈 Updated events count:', eventsData.length);
        setEvents(eventsData);
        setIsLoadingEvents(false);
      },
      (error) => {
        console.error('❌ Error in real-time listener:', error);
        setIsLoadingEvents(false);
        
        // Fallback to regular loading
        loadEvents();
      }
    );
    
    return () => unsubscribe();
  }, []);

  // Refresh events handler
  const handleRefreshEvents = () => {
    loadEvents();
    toast({
      title: 'Refreshing',
      description: 'Loading latest events...',
    });
  };

  // SUBMIT TO FIREBASE WITH SUCCESS MESSAGE
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Prepare data for Firestore
      const appointmentData: AppointmentData = {
        fullName: data.fullName.trim(),
        email: data.email.trim(),
        phone: data.phone.trim(),
        eventType: data.eventType,
        eventDate: format(data.eventDate, 'yyyy-MM-dd'),
        eventTime: data.eventTime,
        guestCount: data.guestCount,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Add message only if it exists
      if (data.message && data.message.trim() !== '') {
        appointmentData.message = data.message.trim();
      }

      console.log('📤 Submitting appointment to Firestore:', appointmentData);

      // Save to Firebase
      const docRef = await addDoc(collection(db, 'appointments'), appointmentData);

      console.log('✅ Appointment saved to Firestore with ID:', docRef.id);

      // Also save to localStorage as backup
      const appointment = {
        id: docRef.id,
        ...data,
        eventDate: format(data.eventDate, 'yyyy-MM-dd'),
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };

      const existing = JSON.parse(localStorage.getItem('appointments') || '[]');
      existing.push(appointment);
      localStorage.setItem('appointments', JSON.stringify(existing));

      // Set success data
      setSuccessData({
        name: data.fullName,
        eventType: data.eventType,
        date: format(data.eventDate, 'PPP'),
        time: formatTime(data.eventTime)
      });

      // Show success message
      setShowSuccess(true);

      // Reset form
      reset();
      setDate(undefined);

      // Hide success message after 8 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessData(null);
      }, 8000);

      toast({
        title: 'Appointment Submitted!',
        description: 'We will contact you within 24 hours to confirm.',
        variant: 'default',
      });

    } catch (error: any) {
      console.error('❌ Error submitting appointment to Firestore:', error);
      
      // Fallback to localStorage only if Firebase fails
      try {
        const appointment = {
          id: Date.now().toString(),
          ...data,
          eventDate: format(data.eventDate, 'yyyy-MM-dd'),
          status: 'pending',
          submittedAt: new Date().toISOString(),
        };

        const existing = JSON.parse(localStorage.getItem('appointments') || '[]');
        existing.push(appointment);
        localStorage.setItem('appointments', JSON.stringify(existing));

        // Set success data for offline submission
        setSuccessData({
          name: data.fullName,
          eventType: data.eventType,
          date: format(data.eventDate, 'PPP'),
          time: formatTime(data.eventTime)
        });

        // Show success message
        setShowSuccess(true);

        // Reset form
        reset();
        setDate(undefined);

        // Hide success message after 8 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setSuccessData(null);
        }, 8000);

        toast({
          title: 'Appointment Submitted (Offline)',
          description: 'We will sync with server when connection is restored.',
          variant: 'default',
        });

      } catch (fallbackError) {
        console.error('❌ Fallback submission failed:', fallbackError);
        toast({
          title: 'Error',
          description: 'Failed to submit appointment. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions
  const formatTime = (time24: string): string => {
    if (!time24) return '—';
    const [h, m] = time24.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, 'h:mm a');
  };

  const formatEventType = (eventType: string): string => {
    return eventTypeMap[eventType] || eventType;
  };

  const formatEventDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getEventIcon = (eventType: string) => {
    return eventIcons[eventType] || Church;
  };

  const handleEventClick = (event: ChurchEvent) => {
    // Auto-fill form when event is clicked
    setValue('eventType', event.type);
    if (event.date) {
      try {
        const eventDate = new Date(event.date);
        setDate(eventDate);
        setValue('eventDate', eventDate);
      } catch (error) {
        console.error('Error parsing event date:', error);
      }
    }
    
    toast({
      title: 'Event Selected',
      description: `${event.title} has been pre-filled`,
    });
  };

  return (
    <>
      {/* HERO SECTION */}
      <section className="bg-gradient-to-b from-primary/5 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <CalendarIcon className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Church Events & Appointments
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Book your sacrament at church-approved times only.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        {/* SUCCESS MESSAGE */}
        {showSuccess && successData && (
          <div className="fixed top-4 right-4 left-4 md:left-auto md:max-w-md z-50 animate-in slide-in-from-top duration-500">
            <Card className="bg-green-50 border-green-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-green-900 mb-2">
                      ✅ Appointment Request Sent!
                    </h3>
                    <div className="space-y-2 text-sm text-green-800">
                      <p><strong>Name:</strong> {successData.name}</p>
                      <p><strong>Event:</strong> {formatEventType(successData.eventType)}</p>
                      <p><strong>Date:</strong> {successData.date}</p>
                      <p><strong>Time:</strong> {successData.time}</p>
                    </div>
                    <p className="text-xs text-green-600 mt-3">
                      We will contact you within 24 hours to confirm your appointment.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-100"
                    onClick={() => setShowSuccess(false)}
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">

          {/* UPCOMING EVENTS SIDEBAR */}
          <div className="md:col-span-1 order-2 md:order-1">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" />
                    Upcoming Events
                  </CardTitle>
                  <CardDescription>Posted by Church Admin</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshEvents}
                  disabled={isLoadingEvents}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingEvents ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {isLoadingEvents ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No upcoming events</p>
                    <p className="text-sm">Check back later for new events</p>
                  </div>
                ) : (
                  events.slice(0, 10).map((event: ChurchEvent) => {
                    const EventIcon = getEventIcon(event.type);
                    return (
                      <div 
                        key={event.id} 
                        className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => handleEventClick(event)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-full">
                            <EventIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <h4 className="font-semibold text-sm leading-tight">{event.title}</h4>
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full ml-2 flex-shrink-0">
                                {formatEventType(event.type)}
                              </span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3" />
                              {formatEventDate(event.date)}
                            </p>
                            
                            {event.time && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(event.time)}
                              </p>
                            )}
                            
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
                            
                            {event.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {event.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* BOOKING FORM */}
          <div className="md:col-span-2 order-1 md:order-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Book Your Appointment</CardTitle>
                <CardDescription>
                  Select event, date, and approved time slot. 
                  {events.length > 0 && ' Click on events to pre-fill the form.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                  {/* EVENT TYPE */}
                  <div className="space-y-2">
                    <Label>Event Type *</Label>
                    <Select
                      value={eventType}
                      onValueChange={(v) => {
                        setValue('eventType', v);
                        setValue('eventTime', '');
                        trigger('eventType');
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select event type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mass">Holy Mass (Special Intention)</SelectItem>
                        <SelectItem value="wedding">Wedding</SelectItem>
                        <SelectItem value="baptism">Baptism</SelectItem>
                        <SelectItem value="funeral">Funeral Mass</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.eventType && (
                      <p className="text-sm text-destructive">{errors.eventType.message}</p>
                    )}
                  </div>

                  {/* NAME & PHONE */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input 
                        {...register('fullName')} 
                        placeholder="Juan Dela Cruz" 
                        disabled={isSubmitting} 
                      />
                      {errors.fullName && (
                        <p className="text-sm text-destructive">{errors.fullName.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number *</Label>
                      <Input 
                        {...register('phone')} 
                        placeholder="+63 912 345 6789" 
                        disabled={isSubmitting} 
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone.message}</p>
                      )}
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input 
                      {...register('email')} 
                      type="email" 
                      placeholder="juan@example.com" 
                      disabled={isSubmitting} 
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  {/* DATE PICKER */}
                  <div className="space-y-2">
                    <Label>Preferred Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !date && 'text-muted-foreground'
                          )}
                          disabled={isSubmitting || !eventType}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={(d) => {
                            setDate(d || undefined);
                            if (d) setValue('eventDate', d);
                            trigger('eventDate');
                          }}
                          disabled={(d) => d < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.eventDate && (
                      <p className="text-sm text-destructive">{errors.eventDate.message}</p>
                    )}
                  </div>

                  {/* TIME PICKER */}
                  {eventType && date && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Available Times *
                      </Label>
                      <Select
                        value={eventTime}
                        onValueChange={(v) => {
                          setValue('eventTime', v);
                          trigger('eventTime');
                        }}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a time" />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedTimes[eventType]?.map((t) => (
                            <SelectItem key={t} value={t}>
                              {formatTime(t)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.eventTime && (
                        <p className="text-sm text-destructive">{errors.eventTime.message}</p>
                      )}
                    </div>
                  )}

                  {/* GUESTS */}
                  <div className="space-y-2">
                    <Label>Number of Guests *</Label>
                    <Input 
                      {...register('guestCount')} 
                      type="number" 
                      min="1" 
                      placeholder="50" 
                      disabled={isSubmitting} 
                    />
                    {errors.guestCount && (
                      <p className="text-sm text-destructive">{errors.guestCount.message}</p>
                    )}
                  </div>

                  {/* MESSAGE */}
                  <div className="space-y-2">
                    <Label>Additional Notes (Optional)</Label>
                    <Textarea
                      {...register('message')}
                      placeholder="e.g. Godparents, special intention, specific requests..."
                      rows={4}
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* SUBMIT BUTTON */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting || !eventType || !date || !eventTime}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Church className="mr-2 h-5 w-5" />
                        Submit Appointment Request
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* CONTACT & SCHEDULE INFO */}
          <div className="md:col-span-3 lg:col-span-1 order-3">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    Contact Parish Office
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" /> 
                    +63 2 8123 4567
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" /> 
                    parish@staugustine.ph
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" /> 
                    Mon–Fri: 9AM–5PM
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Church Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Baptism:</strong> 7:00 AM, 3:00 PM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Wedding:</strong> 10:00 AM, 2:00 PM, 4:00 PM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Mass:</strong> 6:00 AM, 7:30 AM, 5:00 PM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Funeral:</strong> 9:00 AM, 1:00 PM</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Events Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Events Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Loaded Events:</span>
                      <span className="font-semibold">{events.length}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span className="font-semibold">{isLoadingEvents ? 'Loading...' : format(new Date(), 'h:mm a')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="font-semibold text-primary">Firestore</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}