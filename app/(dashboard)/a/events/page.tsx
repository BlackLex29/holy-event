'use client';

import { useState, useEffect } from 'react';
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
  HeartHandshake,
  Crosshair,
  Sun,
  BookOpen,
  CheckCircle,
  XCircle,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ChurchEvent {
  id?: string;
  type: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  priest?: string;
  status: 'active' | 'cancelled';
  postedAt: any;
  createdAt: any;
  updatedAt: any;
  isPublic: boolean;
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
  { value: 'fiesta', label: 'Barangay Fiesta', icon: ChurchIcon },
  { value: 'simbang-gabi', label: 'Simbang Gabi', icon: ChurchIcon },
  { value: 'school-mass', label: 'School Mass', icon: ChurchIcon },
];

export default function PostChurchEvent() {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{title: string; type: string; date: string; time: string} | null>(null);
  const [eventType, setEventType] = useState('');
  const [postedEvents, setPostedEvents] = useState<ChurchEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
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

  // Load posted events from Firestore and localStorage
  const loadPostedEvents = async () => {
    setIsLoadingEvents(true);
    try {
      let events: ChurchEvent[] = [];

      // Try to load from Firestore first
      try {
        const eventsCollection = collection(db, 'events');
        const eventsSnapshot = await getDocs(eventsCollection);
        const firestoreEvents = eventsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ChurchEvent[];
        
        if (firestoreEvents.length > 0) {
          events = firestoreEvents;
        } else {
          // Try alternative collections
          const collections = ['churchevents', 'church_events'];
          for (const coll of collections) {
            try {
              const altCollection = collection(db, coll);
              const altSnapshot = await getDocs(altCollection);
              const altEvents = altSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as ChurchEvent[];
              
              if (altEvents.length > 0) {
                events = altEvents;
                break;
              }
            } catch (error) {
              console.log(`Collection ${coll} not found`);
            }
          }
        }
      } catch (error) {
        console.log('Firestore not available, using localStorage');
      }

      // If no Firestore events, try localStorage
      if (events.length === 0) {
        const localEvents = JSON.parse(localStorage.getItem('churchEvents') || '[]');
        events = localEvents;
      }

      // Sort events by date (newest first)
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPostedEvents(events);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadPostedEvents();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Function to clean data before sending to Firestore
  const cleanEventData = (data: any) => {
    const cleaned = { ...data };
    
    // Remove undefined fields and convert empty strings to null
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      } else if (cleaned[key] === '') {
        cleaned[key] = null;
      }
    });
    
    return cleaned;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validation
    if (!eventType || !formData.title || !formData.date || !formData.time || !formData.location) {
      toast({
        title: 'Missing Fields',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    // Validate date is not in the past
    const selectedDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast({
        title: 'Invalid Date',
        description: 'Please select a future date for the event.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Gumawa ng event object - CLEAN THE DATA FIRST
      const eventData = cleanEventData({
        type: eventType,
        title: formData.title.trim(),
        description: formData.description.trim() || null, // Convert empty string to null
        date: formData.date,
        time: formData.time,
        location: formData.location.trim(),
        priest: formData.priest.trim() || null, // Convert empty string to null
        status: 'active',
        isPublic: true,
        postedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('📤 Submitting CLEANED event to Firestore:', eventData);

      // PRIMARY ATTEMPT: I-save sa "events" collection
      let docRef;
      let collectionUsed = 'events';
      
      try {
        const eventsCollection = collection(db, 'events');
        console.log('📁 Writing to events collection...');
        
        docRef = await addDoc(eventsCollection, eventData);
        console.log('✅ SUCCESS! Event saved to "events" collection with ID:', docRef.id);
        
      } catch (primaryError: any) {
        console.error('❌ Primary collection error:', primaryError);
        
        // SECONDARY ATTEMPT: Try 'churchevents' collection
        try {
          console.log('🔄 Trying churchevents collection...');
          const churchEventsCollection = collection(db, 'churchevents');
          
          docRef = await addDoc(churchEventsCollection, eventData);
          collectionUsed = 'churchevents';
          console.log('✅ Event saved to "churchevents" collection with ID:', docRef.id);
          
        } catch (secondaryError: any) {
          console.error('❌ Secondary collection error:', secondaryError);
          
          // TERTIARY ATTEMPT: Try 'church_events' collection
          try {
            console.log('🔄 Trying church_events collection...');
            const churchEventsAltCollection = collection(db, 'church_events');
            
            docRef = await addDoc(churchEventsAltCollection, eventData);
            collectionUsed = 'church_events';
            console.log('✅ Event saved to "church_events" collection with ID:', docRef.id);
            
          } catch (tertiaryError: any) {
            console.error('❌ All Firestore collections failed:', tertiaryError);
            
            // Check if it's a data validation error
            if (tertiaryError.message.includes('Unsupported field value')) {
              toast({
                title: 'Data Error',
                description: 'Please check all fields and try again.',
                variant: 'destructive',
              });
            }
            throw new Error('All Firestore attempts failed');
          }
        }
      }

      console.log(`📊 Final result: Saved to "${collectionUsed}" collection with ID: ${docRef.id}`);

      // I-save din sa localStorage para sa dashboard (fallback)
      const existingEvents = JSON.parse(localStorage.getItem('churchEvents') || '[]');
      const newEvent = {
        ...eventData,
        id: docRef.id,
        postedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem('churchEvents', JSON.stringify([newEvent, ...existingEvents]));
      console.log('💾 Event saved to localStorage as backup');

      // Reload events list
      await loadPostedEvents();

      // Set success data
      setSuccessData({
        title: formData.title,
        type: eventType,
        date: formData.date,
        time: formData.time
      });

      // Show success message
      setShowSuccess(true);

      // Show toast notification
      toast({
        title: '🎉 Event Posted Successfully!',
        description: `${formData.title} is now live for ALL parishioners.`,
      });

      // Reset form
      setEventType('');
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        priest: '',
      });

      // Hide success message after 8 seconds
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessData(null);
      }, 8000);

    } catch (error: any) {
      console.error('❌ Final error in handleSubmit:', error);
      
      // ULTIMATE FALLBACK: localStorage only
      try {
        console.log('💾 Attempting localStorage fallback...');
        const eventData = {
          type: eventType,
          title: formData.title.trim(),
          description: formData.description.trim(),
          date: formData.date,
          time: formData.time,
          location: formData.location.trim(),
          priest: formData.priest.trim() || null,
          status: 'active',
          isPublic: true,
          id: `local-${Date.now()}`,
          postedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const existingEvents = JSON.parse(localStorage.getItem('churchEvents') || '[]');
        localStorage.setItem('churchEvents', JSON.stringify([eventData, ...existingEvents]));

        console.log('💾 Event saved to localStorage only');

        // Reload events list
        await loadPostedEvents();

        // Set success data
        setSuccessData({
          title: formData.title,
          type: eventType,
          date: formData.date,
          time: formData.time
        });

        // Show success message
        setShowSuccess(true);

        toast({
          title: '📱 Event Saved Locally',
          description: `${formData.title} saved offline. Will sync when connection is available.`,
          variant: 'default',
        });

        // Reset form
        setEventType('');
        setFormData({
          title: '',
          description: '',
          date: '',
          time: '',
          location: '',
          priest: '',
        });

        // Hide success message after 8 seconds
        setTimeout(() => {
          setShowSuccess(false);
          setSuccessData(null);
        }, 8000);

      } catch (localError) {
        console.error('❌ Even localStorage failed:', localError);
        toast({
          title: 'Posting Failed',
          description: 'Could not save event. Please check your connection and try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      // Try to delete from Firestore first
      const collections = ['events', 'churchevents', 'church_events'];
      let deletedFromFirestore = false;

      for (const coll of collections) {
        try {
          await deleteDoc(doc(db, coll, eventId));
          deletedFromFirestore = true;
          console.log(`✅ Event deleted from ${coll} collection`);
          break;
        } catch (error) {
          // Continue to next collection
        }
      }

      // Delete from localStorage
      const localEvents = JSON.parse(localStorage.getItem('churchEvents') || '[]');
      const updatedEvents = localEvents.filter((event: ChurchEvent) => event.id !== eventId);
      localStorage.setItem('churchEvents', JSON.stringify(updatedEvents));

      // Update state
      setPostedEvents(prev => prev.filter(event => event.id !== eventId));

      toast({
        title: 'Event Deleted',
        description: 'The event has been successfully deleted.',
        variant: 'default',
      });

    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Delete Failed',
        description: 'Could not delete the event. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatEventType = (eventType: string): string => {
    const eventTypeMap: Record<string, string> = {
      confession: 'Confession',
      mass: 'Holy Mass',
      rosary: 'Holy Rosary',
      baptism: 'Baptism',
      wedding: 'Wedding',
      funeral: 'Funeral Mass',
      adoration: 'Adoration',
      recollection: 'Recollection',
      fiesta: 'Barangay Fiesta',
      'simbang-gabi': 'Simbang Gabi',
      'school-mass': 'School Mass'
    };
    return eventTypeMap[eventType] || eventType;
  };

  const formatTime = (time24: string): string => {
    if (!time24) return '—';
    const [h, m] = time24.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return format(d, 'h:mm a');
  };

  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return '—';
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  const getEventIcon = (eventType: string) => {
    const event = churchEvents.find(e => e.value === eventType);
    return event?.icon || ChurchIcon;
  };

  const isUpcomingEvent = (eventDate: string) => {
    return new Date(eventDate) >= new Date();
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
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
                    ✅ Event Posted Successfully!
                  </h3>
                  <div className="space-y-2 text-sm text-green-800">
                    <p><strong>Title:</strong> {successData.title}</p>
                    <p><strong>Type:</strong> {formatEventType(successData.type)}</p>
                    <p><strong>Date:</strong> {formatDateDisplay(successData.date)}</p>
                    <p><strong>Time:</strong> {formatTime(successData.time)}</p>
                    <p className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mt-2">
                      🌟 This event is now visible to ALL parishioners
                    </p>
                  </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN - POST EVENT FORM */}
        <div>
          <div className="mb-8">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Church className="w-9 h-9 text-primary" />
              Post Church Event
            </h1>
            <p className="text-muted-foreground mt-2">
              Announce sacraments, masses, and parish activities. Events will be visible to ALL parishioners.
            </p>
            
            {/* Public Notice */}
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-900">Public Event Notice</p>
                  <p className="text-sm text-blue-700 mt-1">
                    All events posted here will be visible to every parishioner in their dashboard. 
                    Make sure the information is accurate and appropriate for the entire community.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Type */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Event Type *
              </Label>
              <Select
                name="eventType"
                onValueChange={setEventType}
                required
                disabled={isSubmitting}
                value={eventType}
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
              <Label>Title *</Label>
              <Input
                name="title"
                placeholder="e.g. Daily Mass, Confession Schedule, Parish Fiesta"
                required
                disabled={isSubmitting}
                value={formData.title}
                onChange={handleInputChange}
                minLength={3}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                This will be visible to all parishioners
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description (Optional)</Label>
              <Textarea
                name="description"
                placeholder="Additional details, reminders, or requirements for parishioners..."
                rows={4}
                disabled={isSubmitting}
                value={formData.description}
                onChange={handleInputChange}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Date & Time */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date *
                </Label>
                <Input
                  name="date"
                  type="date"
                  required
                  disabled={isSubmitting}
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]} // Prevent past dates
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Time *
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
                Location *
              </Label>
              <Input
                name="location"
                placeholder="e.g. Main Church, Parish Hall, Grotto, Chapel"
                required
                disabled={isSubmitting}
                value={formData.location}
                onChange={handleInputChange}
                minLength={3}
                maxLength={100}
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
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if not applicable
              </p>
            </div>

            {/* Submit Button */}
            <div className="space-y-4">
              <Button
                type="submit"
                size="lg"
                className="w-full bg-primary hover:bg-primary/90 text-lg font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Posting Event...
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    Post Event to All Parishioners
                  </div>
                )}
              </Button>
              
              <p className="text-center text-sm text-muted-foreground">
                This event will be immediately visible to all parishioners in their dashboard
              </p>
            </div>
          </form>

          {/* Live Preview */}
          {eventType && formData.title && (
            <div className="mt-8 p-6 bg-muted/50 rounded-lg border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                {Icon && <Icon className="w-5 h-5 text-primary" />}
                Live Preview (What parishioners will see)
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
                  <strong>Date:</strong> {formatDateDisplay(formData.date)}
                </p>
                <p>
                  <strong>Time:</strong> {formatTime(formData.time)}
                </p>
                <p>
                  <strong>Location:</strong> {formData.location}
                </p>
                {formData.priest && (
                  <p>
                    <strong>Presider:</strong> {formData.priest}
                  </p>
                )}
                <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                  ✅ This event will be PUBLIC and visible to all parishioners
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN - POSTED EVENTS LIST */}
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Eye className="w-7 h-7 text-primary" />
              Posted Events
            </h2>
            <p className="text-muted-foreground mt-2">
              All events that have been posted and are visible to parishioners.
            </p>
          </div>

          {isLoadingEvents ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : postedEvents.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Events Posted Yet</h3>
                <p className="text-muted-foreground">
                  Events you post will appear here. They will be visible to all parishioners.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2">
              {postedEvents.map((event) => {
                const EventIcon = getEventIcon(event.type);
                const upcoming = isUpcomingEvent(event.date);
                
                return (
                  <Card key={event.id} className={`${!upcoming ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                            <EventIcon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{event.title}</h3>
                              <Badge 
                                variant={upcoming ? "default" : "secondary"}
                                className={upcoming ? "bg-green-100 text-green-800" : ""}
                              >
                                {upcoming ? 'Upcoming' : 'Past'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {formatEventType(event.type)}
                            </p>
                            {event.description && (
                              <p className="text-sm mb-2 line-clamp-2">{event.description}</p>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-muted-foreground" />
                                <span>{formatDateDisplay(event.date)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span>{formatTime(event.time)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span>{event.location}</span>
                              </div>
                              {event.priest && (
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>{event.priest}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteEvent(event.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}