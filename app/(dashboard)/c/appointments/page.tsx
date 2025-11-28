'use client';

import { useState, useEffect } from 'react';
import { format, isSunday, parseISO, isValid } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Church,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck,
  FileCheck,
  BookOpen,
  RotateCcw,
  Database,
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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { db } from '@/lib/firebase-config';
import { 
  collection, 
  addDoc, 
  getDocs,
  query,
  where,
  serverTimestamp,
  Timestamp,
  FieldValue 
} from 'firebase/firestore';

// ==================== ZOD SCHEMA ====================
const formSchema = z.object({
  eventType: z.string().min(1, 'Please select an event type'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string()
    .min(11, 'Phone number must be exactly 11 digits')
    .max(11, 'Phone number must be exactly 11 digits')
    .regex(/^09\d{9}$/, 'Phone number must start with 09 and contain exactly 11 digits'),
  eventDate: z.date().refine(
    (date) => date && date >= new Date(),
    { message: 'Please select a valid future date' }
  ),
  eventTime: z.string().min(1, 'Please select a time'),
  guestCount: z.string()
    .min(1, 'Please enter number of guests')
    .refine((val) => {
      const count = parseInt(val);
      return count >= 1 && count <= 1000;
    }, 'Guest count must be between 1 and 1000'),
  message: z.string()
    .max(200, 'Additional notes cannot exceed 200 characters')
    .optional(),
});

type FormData = z.infer<typeof formSchema>;

// ==================== INTERFACES ====================
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

interface UserAppointment {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate: string;
  eventTime: string;
  guestCount: string;
  message?: string;
  status: string;
  createdAt: string;
  firebaseId: string;
}

// ==================== ALLOWED TIMES ====================
const allowedTimes: Record<string, string[]> = {
  mass: ['06:00', '07:30', '17:00'],
  wedding: ['10:00', '14:00', '16:00'],
  baptism: ['07:00', '15:00'],
  funeral: ['09:00', '13:00'],
  confirmation: ['10:00', '14:00'],
};

// Event type mapping for display
const eventTypeMap: Record<string, string> = {
  mass: 'Holy Mass',
  wedding: 'Wedding',
  baptism: 'Baptism',
  funeral: 'Funeral Mass',
  confirmation: 'Confirmation',
};

// ==================== AUTO-FILL NOTES TEMPLATES ====================
const autoFillNotes: Record<string, string> = {
  wedding: "Godparents: [List names here], Special requests: [Any specific requirements]",
  baptism: "Godparents: [List names here], Child's name: [Full name], Age: [Age]",
  funeral: "Deceased name: [Full name], Age: [Age], Family requests: [Specific arrangements]",
  mass: "Special intention: [e.g., For good health, Thanksgiving], Requested by: [Your name or family]",
  confirmation: "Candidate name: [Full name], Sponsor: [Sponsor name], Age: [Age]"
};

// ==================== SERVICE REQUIREMENTS ====================
const serviceRequirements = {
  funeral: {
    title: "Requirements for Catholic Funeral Service (Libing)",
    icon: FileText,
    items: [
      "Death Certificate",
      "Information about the deceased (name, age, address, parish)",
      "Schedule coordination with the parish office",
      "Payment for funeral mass or offering (varies per parish)",
      "If burial is in a Catholic cemetery, burial permit",
      "For bringing remains into the church: parish approval",
      "Family's request form for funeral mass",
      "Priest availability confirmation"
    ]
  },
  wedding: {
    title: "Requirements for Catholic Marriage (Kasal)",
    icon: UserCheck,
    items: [
      "Baptismal Certificate (for marriage purposes)",
      "Confirmation Certificate",
      "Marriage License from the Local Civil Registrar",
      "Certificate of No Marriage (CENOMAR)",
      "Pre-Cana seminar",
      "Canonical interview with the priest",
      "Marriage Banns (announced in the parish for 3 consecutive Sundays)",
      "List of sponsors (ninong/ninang)",
      "Confession before the wedding",
      "If applicable: Permission from bishop for mixed marriage (Catholic + non-Catholic)",
      "If applicable: Certificate of Freedom to Marry (for OFW or abroad)",
      "If applicable: Annulment/Death Certificate (if widow-widower or marriage was nullified)"
    ]
  },
  baptism: {
    title: "Requirements for Baptism (Binyag)",
    icon: FileCheck,
    items: [
      "Birth Certificate of the child",
      "Parents must be married in the Church or planning to marry (varies by parish)",
      "Attendance in pre-baptism seminar (parents & godparents)",
      "List of godparents (usually at least 1 Catholic godparent)",
      "Godparents must have received Confirmation",
      "Baptismal information form from the parish",
      "Parent/guardian consent"
    ]
  },
  confirmation: {
    title: "Requirements for Confirmation (Kumpil)",
    icon: BookOpen,
    items: [
      "Must be a baptized Catholic",
      "Confirmation preparation classes or catechism",
      "Must be in a state of grace (usually goes to confession before the ceremony)",
      "Birth Certificate (Civil)",
      "Baptismal Certificate (fresh copy from parish)",
      "Sponsor / Godparent who is a practicing Catholic",
      "Confirmation name (usually a saint's name)",
      "Attendance in parish orientation or seminar",
      "Parent/guardian consent (if minor)"
    ]
  },
  mass: {
    title: "Requirements for Holy Mass",
    icon: Church,
    items: [
      "Schedule coordination with the parish office",
      "Special intention request form",
      "Offering/donation for the mass",
      "Advance booking (at least 1 week before)",
      "Confirmation from parish secretary"
    ]
  }
};

// ==================== DATE HELPER FUNCTIONS ====================
const safeFormatDate = (date: Date | string | null | undefined, formatStr: string): string => {
  try {
    if (!date) return 'Invalid date';
    
    let dateObj: Date;
    
    if (typeof date === 'string') {
      dateObj = parseISO(date);
      if (!isValid(dateObj)) {
        if (date.includes('-')) {
          const [year, month, day] = date.split('-').map(Number);
          dateObj = new Date(year, month - 1, day);
        } else {
          dateObj = new Date(date);
        }
      }
    } else {
      dateObj = date;
    }
    
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid date';
  }
};

const safeFormatTime = (time24: string): string => {
  if (!time24) return '—';
  
  try {
    const [h, m] = time24.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    
    if (!isValid(d)) {
      return time24;
    }
    
    return format(d, 'h:mm a');
  } catch (error) {
    console.error('Time formatting error:', error);
    return time24;
  }
};

const parseEventDate = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  try {
    // Always treat as string and try different formats
    const isoDate = parseISO(dateString);
    if (isValid(isoDate)) {
      return isoDate;
    }
    
    // Try yyyy-MM-dd format
    if (dateString.includes('-')) {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [year, month, day] = parts.map(Number);
        const date = new Date(year, month - 1, day);
        if (isValid(date)) {
          return date;
        }
      }
    }
    
    // Try as direct date string
    const directDate = new Date(dateString);
    if (isValid(directDate)) {
      return directDate;
    }
    
    return null;
  } catch (error) {
    console.error('Date parsing error:', error, 'Input:', dateString);
    return null;
  }
};
// ==================== FIREBASE APPOINTMENT FUNCTIONS ====================
const loadAppointmentsFromFirebase = async (userEmail: string): Promise<UserAppointment[]> => {
  try {
    if (!db) {
      console.error('Firebase not available');
      return [];
    }

    console.log('🔄 Loading appointments from Firebase for email:', userEmail);
    
    const appointmentsRef = collection(db, 'appointments');
    const q = query(appointmentsRef, where('email', '==', userEmail));
    
    const querySnapshot = await getDocs(q);
    const appointments: UserAppointment[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log('📄 Firebase document:', doc.id, data);
      
      let createdAt = '';
      try {
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate().toISOString();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt).toISOString();
        } else {
          createdAt = new Date().toISOString();
        }
      } catch (e) {
        createdAt = new Date().toISOString();
      }
      
      appointments.push({
        id: doc.id,
        firebaseId: doc.id,
        fullName: data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        eventType: data.eventType || '',
        eventDate: data.eventDate || '',
        eventTime: data.eventTime || '',
        guestCount: data.guestCount || '',
        message: data.message || '',
        status: data.status || 'pending',
        createdAt: createdAt,
      });
    });
    
    // Manual sorting in JavaScript
    appointments.sort((a, b) => {
      const dateA = parseEventDate(a.createdAt) || new Date(0);
      const dateB = parseEventDate(b.createdAt) || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log(`✅ Loaded ${appointments.length} appointments from Firebase`);
    return appointments;
    
  } catch (error: any) {
    console.error('❌ Error loading appointments from Firebase:', error);
    return [];
  }
};

const saveAppointmentToFirebase = async (appointmentData: AppointmentData): Promise<string | null> => {
  try {
    if (!db) {
      console.error('Firebase not available');
      return null;
    }

    console.log('💾 Saving appointment to Firebase:', appointmentData);
    
    const appointmentsCollection = collection(db, 'appointments');
    const docRef = await addDoc(appointmentsCollection, appointmentData);
    
    console.log('✅ Successfully saved to Firebase with ID:', docRef.id);
    return docRef.id;
    
  } catch (error: any) {
    console.error('❌ Error saving to Firebase:', error);
    return null;
  }
};

// ==================== FIREBASE CONNECTION CHECK ====================
const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    if (!db) {
      console.error('❌ Firebase db instance is not available');
      return false;
    }
    
    const testCollection = collection(db, 'appointments');
    const q = query(testCollection);
    await getDocs(q);
    
    console.log('✅ Firebase connection test successful');
    return true;
  } catch (error: any) {
    console.error('❌ Firebase connection test failed:', error);
    return false;
  }
};

// ==================== MAIN COMPONENT ====================
export default function EventAppointmentPage() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{name: string; eventType: string; date: string; time: string} | null>(null);
  const [notesCount, setNotesCount] = useState(0);
  const [userAppointments, setUserAppointments] = useState<UserAppointment[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [firebaseAvailable, setFirebaseAvailable] = useState<boolean | null>(null);
  const [hasAutoFilledNotes, setHasAutoFilledNotes] = useState(false);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    trigger,
    watch,
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
  const message = watch('message');
  const email = watch('email');

  // Check Firebase connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      const isAvailable = await checkFirebaseConnection();
      setFirebaseAvailable(isAvailable);
    };
    
    checkConnection();
  }, []);

  // Watch for message changes to update character count
  useEffect(() => {
    setNotesCount(message?.length || 0);
  }, [message]);

  // Auto-fill notes when event type changes
  useEffect(() => {
    if (eventType && !hasAutoFilledNotes && !message) {
      const template = autoFillNotes[eventType];
      if (template) {
        setValue('message', template, { shouldValidate: true });
        setHasAutoFilledNotes(true);
        
        toast({
          title: 'Notes Template Added!',
          description: 'We added a template for your notes. Please fill in the details.',
          variant: 'default',
        });
      }
    }
  }, [eventType, message, setValue, hasAutoFilledNotes, toast]);

  // Reset auto-fill flag when event type is cleared
  useEffect(() => {
    if (!eventType) {
      setHasAutoFilledNotes(false);
    }
  }, [eventType]);

  // Load appointments when email changes
  useEffect(() => {
    if (email && email.includes('@') && email.includes('.')) {
      setCurrentUserEmail(email);
      loadUserAppointments(email);
    }
  }, [email]);

  // Load appointments from Firebase ONLY
  const loadUserAppointments = async (userEmail: string) => {
    if (!firebaseAvailable) return;
    
    setIsLoadingAppointments(true);
    
    try {
      const appointments = await loadAppointmentsFromFirebase(userEmail);
      setUserAppointments(appointments);

      if (appointments.length > 0) {
        toast({
          title: `Found ${appointments.length} Appointment(s)`,
          description: 'Your appointments have been loaded from church database.',
          variant: 'default',
        });
      }

    } catch (error) {
      console.error('Error loading appointments:', error);
      toast({
        title: 'Error Loading Appointments',
        description: 'Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  // Manual refresh appointments
  const handleRefreshAppointments = () => {
    if (currentUserEmail) {
      loadUserAppointments(currentUserEmail);
      toast({
        title: 'Refreshing Appointments',
        description: 'Loading your appointments from church database...',
      });
    }
  };

  // Auto-clear time when event type changes
  useEffect(() => {
    if (eventType && eventTime && !allowedTimes[eventType]?.includes(eventTime)) {
      setValue('eventTime', '');
      trigger('eventTime');
    }
  }, [eventType, eventTime, setValue, trigger]);

  // Disable non-Sunday dates for Baptism
  const isDateDisabled = (date: Date) => {
    if (eventType === 'baptism') {
      return !isSunday(date);
    }
    return date < new Date();
  };

  // Auto-select next Sunday when Baptism is selected
  useEffect(() => {
    if (eventType === 'baptism' && (!date || !isSunday(date))) {
      const today = new Date();
      const nextSunday = new Date(today);
      nextSunday.setDate(today.getDate() + (7 - today.getDay()));
      nextSunday.setHours(0, 0, 0, 0);
      
      setDate(nextSunday);
      setValue('eventDate', nextSunday);
      trigger('eventDate');
      
      toast({
        title: 'Baptism Scheduled',
        description: 'Automatically selected next Sunday for baptism',
      });
    }
  }, [eventType, date, setValue, trigger, toast]);

  // Phone number formatting
  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers;
    }
    return numbers.slice(0, 11);
  };

  // Handle phone number input
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setValue('phone', formatted, { shouldValidate: true });
  };

  // Handle guest count input with maximum limit
  const handleGuestCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Remove non-numeric characters
    value = value.replace(/\D/g, '');
    
    // If empty, set to empty string
    if (value === '') {
      setValue('guestCount', '', { shouldValidate: true });
      return;
    }
    
    // Convert to number and check maximum
    const count = parseInt(value);
    if (count > 1000) {
      setValue('guestCount', '1000', { shouldValidate: true });
      toast({
        title: 'Maximum Guests Reached',
        description: 'Guest count has been set to the maximum of 1000',
        variant: 'default',
      });
    } else {
      setValue('guestCount', value, { shouldValidate: true });
    }
  };

  // Clear auto-filled notes
  const clearAutoFilledNotes = () => {
    setValue('message', '', { shouldValidate: true });
    setHasAutoFilledNotes(false);
  };

  // Submit function - FIREBASE ONLY
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    
    try {
      const userEmail = data.email.trim();

      // Prepare data for Firestore
      const appointmentData: AppointmentData = {
        fullName: data.fullName.trim(),
        email: userEmail,
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
        appointmentData.message = data.message.trim().substring(0, 200);
      }

      // ✅ SAVE TO FIREBASE ONLY
      const firebaseId = await saveAppointmentToFirebase(appointmentData);

      if (!firebaseId) {
        throw new Error('Failed to save to database');
      }

      // Create appointment object for local state
      const appointment: UserAppointment = {
        id: firebaseId,
        firebaseId: firebaseId,
        fullName: data.fullName.trim(),
        email: userEmail,
        phone: data.phone.trim(),
        eventType: data.eventType,
        eventDate: format(data.eventDate, 'yyyy-MM-dd'),
        eventTime: data.eventTime,
        guestCount: data.guestCount,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      if (data.message && data.message.trim() !== '') {
        appointment.message = data.message.trim().substring(0, 200);
      }

      // Update local state
      setUserAppointments(prev => [appointment, ...prev]);
      setCurrentUserEmail(userEmail);

      // Set success data
      setSuccessData({
        name: data.fullName,
        eventType: data.eventType,
        date: safeFormatDate(data.eventDate, 'PPP'),
        time: safeFormatTime(data.eventTime)
      });

      // Show success message
      setShowSuccess(true);

      // Reset form but keep email
      reset({
        email: data.email,
        fullName: '',
        phone: '',
        eventType: '',
        eventDate: undefined,
        eventTime: '',
        guestCount: '1',
        message: ''
      });
      setDate(undefined);
      setNotesCount(0);
      setHasAutoFilledNotes(false);

      // Hide success message after 8 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessData(null);
      }, 8000);

      // Show success message
      toast({
        title: 'Appointment Submitted Successfully!',
        description: 'Your appointment has been saved to the church database.',
        variant: 'default',
      });

    } catch (error: any) {
      console.error('❌ Main submission error:', error);
      
      toast({
        title: 'Submission Error',
        description: 'Failed to submit appointment to database. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper functions
  const formatEventType = (eventType: string): string => {
    return eventTypeMap[eventType] || eventType;
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  // Render requirements for selected event type
  const renderRequirements = () => {
    if (!eventType || !serviceRequirements[eventType as keyof typeof serviceRequirements]) {
      return null;
    }

    const requirements = serviceRequirements[eventType as keyof typeof serviceRequirements];
    const IconComponent = requirements.icon;

    return (
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-blue-600" />
            {requirements.title}
          </CardTitle>
          <CardDescription>
            Please prepare these documents and requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {requirements.items.map((item, index) => (
              <li key={index} className="flex items-start gap-2">
                <Badge variant="outline" className="h-5 w-5 p-0 flex items-center justify-center text-xs mt-0.5 flex-shrink-0">
                  {index + 1}
                </Badge>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  };

  // Render user appointments
  const renderUserAppointments = () => {
    if (isLoadingAppointments) {
      return (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Your Appointments
            </CardTitle>
            <CardDescription>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                Loading your appointments from church database...
              </div>
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    if (userAppointments.length === 0) {
      return (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Your Appointments
            </CardTitle>
            <CardDescription>
              {currentUserEmail 
                ? "You don't have any appointments yet. Book your first appointment above!"
                : "Enter your email to view your appointments."
              }
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card className="mt-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Your Appointments ({userAppointments.length})
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAppointments}
              disabled={isLoadingAppointments}
              className="flex items-center gap-2"
            >
              <RotateCcw className={`h-4 w-4 ${isLoadingAppointments ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          <CardDescription>
            All appointments are stored in the church database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userAppointments.map((appointment) => {
              const eventDate = parseEventDate(appointment.eventDate);
              const createdAt = parseEventDate(appointment.createdAt);
              
              return (
                <Card key={appointment.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">
                            {formatEventType(appointment.eventType)}
                          </h3>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            Church Database
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            Submitted: {createdAt ? safeFormatDate(createdAt, 'MMM dd, yyyy • h:mm a') : 'Invalid date'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium">Date</div>
                            <div className="text-muted-foreground">
                              {eventDate ? safeFormatDate(eventDate, 'PPP') : 'Invalid date'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium">Time</div>
                            <div className="text-muted-foreground">{safeFormatTime(appointment.eventTime)}</div>
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
                          <Church className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium">Name</div>
                            <div className="text-muted-foreground">{appointment.fullName}</div>
                          </div>
                        </div>
                      </div>

                      {appointment.message && (
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <div className="text-sm font-medium mb-1">Additional Notes:</div>
                          <div className="text-sm text-muted-foreground">"{appointment.message}"</div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Database ID: {appointment.firebaseId}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
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
            Book your sacrament at church-approved times only. All appointments are securely stored in the church database.
          </p>

          {firebaseAvailable === false && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 inline-block">
              <p className="text-yellow-700 text-sm">
                ⚠️ Cannot connect to church database. Please check your internet connection.
              </p>
            </div>
          )}
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
                      ✅ Appointment Submitted to Church Database!
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

        <div className="grid lg:grid-cols-4 gap-8">
          {/* BOOKING FORM */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Book Your Appointment</CardTitle>
                <CardDescription>
                  Select event, date, and approved time slot. All data is saved directly to church database.
                  <span className="font-bold block mt-1">
                    Note: After setting an appointment, complete all the required documents and submit them to the
                    church at least one (1) month before the chosen date of the service.
                  </span>
                  {eventType === 'baptism' && ' Baptism is available every Sunday only.'}
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
                        <SelectItem value="baptism">Baptism (Every Sunday)</SelectItem>
                        <SelectItem value="funeral">Funeral Mass</SelectItem>
                        <SelectItem value="confirmation">Confirmation (Once a year)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.eventType && (
                      <p className="text-sm text-destructive">{errors.eventType.message}</p>
                    )}
                    {eventType === 'baptism' && (
                      <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                        Baptism is available every Sunday at 7:00 AM and 3:00 PM
                      </p>
                    )}
                    {eventType === 'confirmation' && (
                      <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                         Confirmation is scheduled once a year as a school event
                      </p>
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
                        placeholder="09123456789" 
                        disabled={isSubmitting}
                        onChange={handlePhoneChange}
                        maxLength={11}
                      />
                      {errors.phone ? (
                        <p className="text-sm text-destructive">{errors.phone.message}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Format: 09XXXXXXXXX (11 digits)
                        </p>
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
                    <p className="text-xs text-muted-foreground">
                      Your appointments will be loaded using this email
                    </p>
                  </div>

                  {/* DATE PICKER */}
                  <div className="space-y-2">
                    <Label>Preferred Date *</Label>
                    {eventType === 'baptism' && (
                      <p className="text-sm text-blue-600">
                        📅 Only Sundays are available for baptism
                      </p>
                    )}
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
                          {date ? safeFormatDate(date, 'PPP') : 'Pick a date'}
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
                          disabled={isDateDisabled}
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
                        <span className="text-xs text-muted-foreground">
                          (1 hour service limit)
                        </span>
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
                              {safeFormatTime(t)} (1 hour)
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
                      max="1000"
                      placeholder="50" 
                      disabled={isSubmitting}
                      onChange={handleGuestCountChange}
                    />
                    {errors.guestCount ? (
                      <p className="text-sm text-destructive">{errors.guestCount.message}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Maximum 1000 guests allowed
                      </p>
                    )}
                  </div>

                  {/* MESSAGE WITH AUTO-FILL */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label>Additional Notes (Optional)</Label>
                      <span className={`text-xs ${notesCount > 200 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {notesCount}/200
                      </span>
                    </div>
                    <div className="relative">
                      <Textarea
                        {...register('message')}
                        placeholder="e.g. Godparents, special intention, specific requests..."
                        rows={4}
                        disabled={isSubmitting}
                        maxLength={200}
                        className={hasAutoFilledNotes ? "border-blue-300 bg-blue-50/50" : ""}
                      />
                      {hasAutoFilledNotes && (
                        <div className="absolute top-2 right-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={clearAutoFilledNotes}
                            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {hasAutoFilledNotes && (
                      <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        💡 We added a template for your notes. Fill in the details or clear it if not needed.
                      </p>
                    )}
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Maximum 200 characters
                    </p>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting || !eventType || !date || !eventTime || !firebaseAvailable}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Saving to Church Database...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-5 w-5" />
                        Submit to Church Database
                      </>
                    )}
                  </Button>

                  {!firebaseAvailable && (
                    <p className="text-sm text-destructive text-center">
                      Cannot connect to church database. Please check your internet connection.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* USER APPOINTMENTS SECTION */}
            {renderUserAppointments()}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-2 space-y-6">
            {/* SERVICE REQUIREMENTS */}
            {renderRequirements()}

            {/* CONTACT & SCHEDULE INFO */}
            <div className="grid md:grid-cols-2 gap-6">
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
                      <span><strong>Baptism:</strong> Every Sunday at 7:00 AM, 3:00 PM</span>
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
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Confirmation:</strong> Once a year (School Event)</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Data Security Notice */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  Church Database Storage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-blue-700">
                  <p>✅ All appointments stored in church database</p>
                  <p>✅ Accessible from any device with your email</p>
                  <p>✅ Securely backed up and protected</p>
                  <p>✅ Never lost even if you clear browser data</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}