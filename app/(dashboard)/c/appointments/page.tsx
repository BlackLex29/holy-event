'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  MessageSquare,
  Church,
  Phone,
  Mail,
  Bell,
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

interface ChurchEvent {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  priest?: string;
  postedAt: string;
}

/* ----------  ALLOWED TIMES  ---------- */
const allowedTimes: Record<string, string[]> = {
  mass: ['06:00', '07:30', '17:00'],
  wedding: ['10:00', '14:00', '16:00'],
  baptism: ['07:00', '15:00'],
  funeral: ['09:00', '13:00'],
};

/* ----------  ZOD SCHEMA (static)  ---------- */
const formSchema = z.object({
  eventType: z.string().min(1, { message: 'Please select an event type' }),
  fullName: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  phone: z.string().min(10, { message: 'Phone number is required' }),
  eventDate: z.date().refine((d) => d >= new Date(), {
    message: 'Please select a valid future date',
  }),
  eventTime: z.string().refine(
    (time) => {
      // will be validated later with the current eventType
      return true;
    },
    { message: 'Invalid time' }
  ),
  guestCount: z.string().min(1, { message: 'Please enter number of guests' }),
  message: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function EventAppointmentPage() {
  const { toast } = useToast();
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
    trigger,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    mode: 'onChange',
  });

  // Watch only the fields we need
  const eventType = useWatch({ control, name: 'eventType' });
  const eventTime = useWatch({ control, name: 'eventTime' });

  /* ----------  RE‑VALIDATE TIME WHEN EVENT TYPE CHANGES  ---------- */
  useEffect(() => {
    if (eventType && eventTime) {
      const valid = allowedTimes[eventType]?.includes(eventTime) ?? false;
      if (!valid) {
        setValue('eventTime', '');
      }
      trigger('eventTime');
    }
  }, [eventType, eventTime, setValue, trigger]);

  /* ----------  LOAD CHURCH EVENTS  ---------- */
  useEffect(() => {
    const saved = localStorage.getItem('churchEvents');
    if (saved) {
      const parsed = JSON.parse(saved) as ChurchEvent[];
      const sorted = parsed.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setEvents(sorted);
    }
  }, []);

  /* ----------  SUBMIT  ---------- */
  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));

    const appointment = {
      ...data,
      id: Date.now().toString(),
      status: 'pending' as const,
      submittedAt: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem('appointments') || '[]');
    existing.push(appointment);
    localStorage.setItem('appointments', JSON.stringify(existing));

    toast({
      title: 'Appointment Request Sent!',
      description: `${data.fullName} — ${data.eventType} on ${format(
        data.eventDate,
        'PPP'
      )} at ${format(new Date(`2000-01-01T${data.eventTime}`), 'h:mm a')}`,
    });

    reset();
    setDate(undefined);
    setIsSubmitting(false);
  };

  const formatTime = (t: string) =>
    format(new Date(`2000-01-01T${t}`), 'h:mm a');

  return (
    <>
      {/* HERO */}
      <section className="relative bg-gradient-to-b from-primary/5 to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <CalendarIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Church Events & Appointments
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Book your sacrament at church‑approved times only.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">

          {/* EVENTS LIST */}
          <div className="md:col-span-1 order-2 md:order-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Upcoming Events
                </CardTitle>
                <CardDescription>Posted by Church Admin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No events posted yet.
                  </p>
                ) : (
                  events.slice(0, 5).map((ev) => (
                    <div
                      key={ev.id}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Church className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-sm">{ev.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(ev.date), 'MMM d, yyyy')} • {ev.time}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {ev.location}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* APPOINTMENT FORM */}
          <div className="md:col-span-2 order-1 md:order-2">
            <Card>
              <CardHeader>
                <CardTitle>Book Your Appointment</CardTitle>
                <CardDescription>
                  Select event, date, and church‑approved time.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                  {/* EVENT TYPE */}
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select
                      onValueChange={(v) => {
                        setValue('eventType', v);
                        setValue('eventTime', '');
                        trigger('eventTime');
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
                      <Label>Full Name</Label>
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
                      <Label>Phone Number</Label>
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

                  <div className="space-y-2">
                    <Label>Email</Label>
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
                    <Label>Preferred Date</Label>
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
                            setDate(d);
                            if (d) setValue('eventDate', d);
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
                        Available Times
                      </Label>
                      <Select
                        value={eventTime}
                        onValueChange={(v) => setValue('eventTime', v)}
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
                    <Label>Number of Guests</Label>
                    <Input
                      {...register('guestCount')}
                      type="number"
                      placeholder="1"
                      min="1"
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
                      placeholder="e.g. Special intention, godparents, etc."
                      rows={4}
                      disabled={isSubmitting}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting || !eventTime}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                        Sending Request...
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

          {/* INFO SIDEBAR */}
          <div className="md:col-span-3 lg:col-span-1 order-3 lg:block">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Need Help?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>+1 (555) 123-4567</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    <span>events@saintaugustine.org</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>Office: Mon–Fri, 9 AM–5 PM</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-muted/50">
                <CardHeader>
                  <CardTitle className="text-lg">Available Times</CardTitle>
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
                      <span><strong>Mass (Intention):</strong> 6:00 AM, 7:30 AM, 5:00 PM</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Funeral:</strong> 9:00 AM, 1:00 PM</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}