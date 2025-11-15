'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import {
  Church,
  Clock,
  MapPin,
  Users,
  Calendar,
  Bell,
  Cross,
  Church as ChurchIcon,
  Heart,
  Baby,
  HeartHandshake, // Valid replacement for Ring
  Crosshair,
  Sun,
  BookOpen,
} from 'lucide-react';

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

const churchEvents = [
  { value: 'confession', label: 'Confession', icon: Cross },
  { value: 'mass', label: 'Holy Mass', icon: ChurchIcon },
  { value: 'rosary', label: 'Holy Rosary', icon: Heart },
  { value: 'baptism', label: 'Baptism', icon: Baby },
  { value: 'wedding', label: 'Wedding', icon: HeartHandshake },
  { value: 'funeral', label: 'Funeral Mass', icon: Crosshair },
  { value: 'adoration', label: 'Adoration', icon: Sun },
  { value: 'recollection', label: 'Recollection', icon: BookOpen },
];

export default function PostChurchEvent() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventType, setEventType] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    priest: '',
  });

  const selectedEvent = churchEvents.find((e) => e.value === eventType);
  const Icon = selectedEvent?.icon;

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const event: ChurchEvent = {
      id: Date.now().toString(),
      type: eventType,
      title: formData.title,
      description: formData.description,
      date: formData.date,
      time: formData.time,
      location: formData.location,
      priest: formData.priest || undefined,
      postedAt: new Date().toISOString(),
    };

    // Save to localStorage
    const existing = JSON.parse(localStorage.getItem('churchEvents') || '[]');
    existing.unshift(event);
    localStorage.setItem('churchEvents', JSON.stringify(existing));

    toast({
      title: 'Event Posted!',
      description: `${event.title} is now live for all parishioners.`,
    });

    setTimeout(() => {
      router.push('/a/events');
    }, 1500);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Church className="w-9 h-9 text-primary" />
          Post Church Event
        </h1>
        <p className="text-muted-foreground mt-2">
          Announce sacraments, masses, and parish activities.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Type */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Event Type
          </Label>
          <Select
            name="eventType"
            onValueChange={setEventType}
            required
            disabled={isSubmitting}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder="Select Catholic event" />
            </SelectTrigger>
            <SelectContent>
              {churchEvents.map((event) => {
                const EventIcon = event.icon;
                return (
                  <SelectItem key={event.value} value={event.value}>
                    <div className="flex items-center gap-2">
                      <EventIcon className="w-5 h-5" />
                      {event.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            name="title"
            placeholder="e.g. Daily Mass, Confession Schedule"
            required
            disabled={isSubmitting}
            value={formData.title}
            onChange={handleInputChange}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>Description (Optional)</Label>
          <Textarea
            name="description"
            placeholder="Additional details, reminders, or requirements..."

            rows={4}
            disabled={isSubmitting}
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>

        {/* Date & Time */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date
            </Label>
            <Input
              name="date"
              type="date"
              required
              disabled={isSubmitting}
              value={formData.date}
              onChange={handleInputChange}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time
            </Label>
            <Input
              name="time"
              type="time"
              required
              disabled={isSubmitting}
              value={formData.time}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Location
          </Label>
          <Input
            name="location"
            placeholder="e.g. Main Church, Parish Hall, Grotto"
            required
            disabled={isSubmitting}
            value={formData.location}
            onChange={handleInputChange}
          />
        </div>

        {/* Presider (Optional) */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Presider / Priest (Optional)
          </Label>
          <Input
            name="priest"
            placeholder="e.g. Fr. John Paul Santos"
            disabled={isSubmitting}
            value={formData.priest}
            onChange={handleInputChange}
          />
        </div>

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          className="w-full bg-primary hover:bg-primary/90 text-lg font-medium"
          disabled={
            isSubmitting ||
            !eventType ||
            !formData.title ||
            !formData.date ||
            !formData.time ||
            !formData.location
          }
        >
          {isSubmitting ? (
            <>Posting Event...</>
          ) : (
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Post Event to All Parishioners
            </div>
          )}
        </Button>
      </form>

      {/* Live Preview */}
      {eventType && formData.title && (
        <div className="mt-8 p-6 bg-muted/50 rounded-lg border">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5 text-primary" />}
            Live Preview
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <strong>Type:</strong> {selectedEvent?.label}
            </p>
            <p>
              <strong>Title:</strong> {formData.title}
            </p>
            {formData.description && (
              <p>
                <strong>Description:</strong> {formData.description}
              </p>
            )}
            <p>
              <strong>Date:</strong>{' '}
              {formData.date
                ? format(new Date(formData.date), 'EEEE, MMMM d, yyyy')
                : '—'}
            </p>
            <p>
              <strong>Time:</strong>{' '}
              {formData.time
                ? format(new Date(`2000-01-01T${formData.time}`), 'h:mm a')
                : '—'}
            </p>
            <p>
              <strong>Location:</strong> {formData.location}
            </p>
            {formData.priest && (
              <p>
                <strong>Presider:</strong> {formData.priest}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}