'use client';

import { useState, useEffect } from 'react';
import { format, isSunday } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
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
  phone: z.string()
    .min(11, 'Phone number must be exactly 11 digits')
    .max(11, 'Phone number must be exactly 11 digits')
    .regex(/^09\d{9}$/, 'Phone number must start with 09 and contain exactly 11 digits'),
  eventDate: z.date().refine(
    (date) => date && date >= new Date(),
    { message: 'Please select a valid future date' }
  ),
  eventTime: z.string().min(1, 'Please select a time'),
  guestCount: z.string().min(1, 'Please enter number of guests'),
  message: z.string()
    .max(50, 'Additional notes cannot exceed 50 characters')
    .optional(),
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

// ==================== MAIN COMPONENT ====================
export default function EventAppointmentPage() {
  const { toast } = useToast();
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{name: string; eventType: string; date: string; time: string} | null>(null);
  const [notesCount, setNotesCount] = useState(0);

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

  // Watch for message changes to update character count
  useEffect(() => {
    setNotesCount(message?.length || 0);
  }, [message]);

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
    // Remove all non-digit characters
    const numbers = value.replace(/\D/g, '');
    
    // Limit to 11 digits
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

      // Add message only if it exists and trim to 50 characters
      if (data.message && data.message.trim() !== '') {
        appointmentData.message = data.message.trim().substring(0, 50);
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
      setNotesCount(0);

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
        setNotesCount(0);

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
            {eventType === 'baptism' && ' Baptism is available every Sunday.'}
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

        <div className="grid lg:grid-cols-4 gap-8">
          {/* BOOKING FORM */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Book Your Appointment</CardTitle>
                <CardDescription>
                  Select event, date, and approved time slot.
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
                              {formatTime(t)} (1 hour)
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
                    <div className="flex justify-between items-center">
                      <Label>Additional Notes (Optional)</Label>
                      <span className={`text-xs ${notesCount > 50 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {notesCount}/50
                      </span>
                    </div>
                    <Textarea
                      {...register('message')}
                      placeholder="e.g. Godparents, special intention, specific requests..."
                      rows={4}
                      disabled={isSubmitting}
                      maxLength={50}
                    />
                    {errors.message && (
                      <p className="text-sm text-destructive">{errors.message.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Maximum 50 characters
                    </p>
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

            {/* Service Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Service Duration:</span>
                    <span className="font-semibold">1 hour maximum</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Booking Lead Time:</span>
                    <span className="font-semibold">24 hours minimum</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Confirmation:</span>
                    <span className="font-semibold text-primary">Within 24 hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}