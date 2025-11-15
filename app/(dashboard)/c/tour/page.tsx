// app/c/tour/page.tsx
'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Church,
  MapPin,
  Clock,
  Phone,
  Mail,
  ExternalLink,
  Navigation,
  Calendar,
  Users,
  Heart
} from 'lucide-react';

export default function VisualTourPage() {
  const [activeTab, setActiveTab] = useState('virtual');

  const churchSpots = [
    {
      id: 1,
      name: 'Main Sanctuary',
      description: 'The heart of our church where daily masses and special ceremonies are held.',
      image: '/images/sanctuary.jpg',
      features: ['Altar', 'Stained Glass Windows', 'Pipe Organ', 'Pew Seating']
    },
    {
      id: 2,
      name: 'Chapel of Perpetual Help',
      description: 'A quiet space for personal prayer and reflection throughout the day.',
      image: '/images/chapel.jpg',
      features: ['Daily Adoration', 'Quiet Meditation', 'Candle Lighting']
    },
    {
      id: 3,
      name: 'Parish Hall',
      description: 'Community gathering space for events, meetings, and fellowship.',
      image: '/images/hall.jpg',
      features: ['Event Space', 'Kitchen Facilities', 'Meeting Rooms']
    },
    {
      id: 4,
      name: 'Church Gardens',
      description: 'Beautifully maintained gardens for peaceful walks and outdoor prayer.',
      image: '/images/gardens.jpg',
      features: ['Rosary Garden', 'Meditation Path', 'Outdoor Stations of Cross']
    },
    {
      id: 5,
      name: 'Baptismal Font',
      description: 'Where the sacrament of baptism is celebrated for new members.',
      image: '/images/baptismal.jpg',
      features: ['Marble Font', 'Family Seating', 'Sacristy Access']
    },
    {
      id: 6,
      name: 'Confessionals',
      description: 'Private spaces for the sacrament of reconciliation.',
      image: '/images/confessionals.jpg',
      features: ['Private Booths', 'Priest Availability', 'Prayer Area']
    }
  ];

  const massTimes = [
    { day: 'Sunday', times: ['7:00 AM', '9:00 AM', '11:00 AM', '5:00 PM'] },
    { day: 'Weekdays', times: ['6:15 AM', '12:05 PM'] },
    { day: 'Saturday', times: ['6:15 AM', '5:30 PM (Vigil)'] },
    { day: 'Holy Days', times: ['6:15 AM', '12:05 PM', '7:00 PM'] }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-background/20 rounded-full backdrop-blur-sm">
                <MapPin className="h-16 w-16" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Church Visual Tour</h1>
            <p className="text-xl md:text-2xl opacity-90 mb-8 leading-relaxed">
              Explore Saint Augustine Parish from anywhere in the world
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                360° Virtual Tour
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Interactive Map
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Photo Gallery
              </Badge>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {/* Main Tour Section */}
        <section className="mb-20">
          <div className="max-w-6xl mx-auto">
            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-4 mb-8 justify-center">
              <Button
                variant={activeTab === 'virtual' ? 'default' : 'outline'}
                onClick={() => setActiveTab('virtual')}
                className="gap-2"
              >
                <Navigation className="w-4 h-4" />
                Virtual Tour
              </Button>
              <Button
                variant={activeTab === 'map' ? 'default' : 'outline'}
                onClick={() => setActiveTab('map')}
                className="gap-2"
              >
                <MapPin className="w-4 h-4" />
                Interactive Map
              </Button>
              <Button
                variant={activeTab === 'gallery' ? 'default' : 'outline'}
                onClick={() => setActiveTab('gallery')}
                className="gap-2"
              >
                <Church className="w-4 h-4" />
                Photo Gallery
              </Button>
            </div>

            {/* Virtual Tour Content */}
            {activeTab === 'virtual' && (
              <div className="space-y-8">
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="text-3xl flex items-center justify-center gap-3">
                      <Navigation className="w-8 h-8" />
                      360° Virtual Tour
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Take an immersive virtual walk through our beautiful church
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-2xl h-96 w-full flex items-center justify-center shadow-lg mb-6">
                      <div className="text-center">
                        <Church className="h-20 w-20 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg mb-4">
                          Virtual Tour Embed Will Appear Here
                        </p>
                        <Button size="lg" className="gap-2">
                          <ExternalLink className="w-5 h-5" />
                          Launch Virtual Tour
                        </Button>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="font-semibold">Full 360° View</p>
                        <p className="text-sm text-muted-foreground">Explore every angle</p>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="font-semibold">Interactive Hotspots</p>
                        <p className="text-sm text-muted-foreground">Click to learn more</p>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="font-semibold">Guided Navigation</p>
                        <p className="text-sm text-muted-foreground">Easy to use</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Interactive Map Content */}
            {activeTab === 'map' && (
              <div className="space-y-8">
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="text-3xl flex items-center justify-center gap-3">
                      <MapPin className="w-8 h-8" />
                      Interactive Map
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Find your way around our church campus
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted rounded-2xl h-96 w-full flex items-center justify-center shadow-lg mb-6">
                      <div className="text-center">
                        <MapPin className="h-20 w-20 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-muted-foreground text-lg mb-4">
                          Google Maps Embed Will Appear Here
                        </p>
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Paste your Google Maps embed code here:
                          </p>
                          <code className="bg-black text-white p-2 rounded text-xs block max-w-md mx-auto">
                            {'<iframe src="YOUR_GOOGLE_MAPS_EMBED_LINK"></iframe>'}
                          </code>
                        </div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-bold text-lg">Location Details</h3>
                        <div className="space-y-2">
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>123 Saint Augustine Street</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />
                            <span>Open Daily 6:00 AM - 8:00 PM</span>
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-primary" />
                            <span>(02) 8123-4567</span>
                          </p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <h3 className="font-bold text-lg">Getting Here</h3>
                        <div className="space-y-2 text-sm">
                          <p>🚗 Ample parking available</p>
                          <p>🚌 Bus routes: 12, 45, 67</p>
                          <p>🚇 Nearest MRT: Faith Station</p>
                          <p>♿ Wheelchair accessible</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Photo Gallery Content */}
            {activeTab === 'gallery' && (
              <div className="space-y-8">
                <Card>
                  <CardHeader className="text-center">
                    <CardTitle className="text-3xl flex items-center justify-center gap-3">
                      <Church className="w-8 h-8" />
                      Photo Gallery
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Explore our church through beautiful photographs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {churchSpots.map((spot) => (
                        <Card key={spot.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                          <div className="bg-muted h-48 rounded-t-lg flex items-center justify-center">
                            <Church className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-bold text-lg mb-2">{spot.name}</h3>
                            <p className="text-sm text-muted-foreground mb-3">{spot.description}</p>
                            <div className="flex flex-wrap gap-1">
                              {spot.features.map((feature, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {feature}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </section>

        <Separator className="my-16" />

        {/* Mass Times */}
        <section className="mb-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Mass Times</h2>
            <p className="text-lg text-muted-foreground">
              Join us for worship and celebration
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="grid gap-6">
                  {massTimes.map((schedule, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-primary" />
                        <span className="font-semibold">{schedule.day}</span>
                      </div>
                      <div className="flex gap-2">
                        {schedule.times.map((time, timeIndex) => (
                          <Badge key={timeIndex} variant="secondary">
                            {time}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Information */}
        <section className="mb-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-3">
                    <Clock className="w-6 h-6 text-primary" />
                    Visiting Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">Church Open:</p>
                  <p className="font-semibold">6:00 AM - 8:00 PM Daily</p>
                  <p className="text-sm text-muted-foreground mt-2">Office Hours: 8:00 AM - 5:00 PM</p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-3">
                    <Users className="w-6 h-6 text-primary" />
                    Parish Office
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">Contact Information:</p>
                  <p className="font-semibold">(02) 8123-4567</p>
                  <p className="text-sm text-muted-foreground">info@staugustineparish.ph</p>
                </CardContent>
              </Card>

              <Card className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-center gap-3">
                    <Heart className="w-6 h-6 text-primary" />
                    Plan Your Visit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-2">Ready to visit?</p>
                  <Button className="w-full gap-2">
                    <Calendar className="w-4 h-4" />
                    Schedule Appointment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section>
          <div className="max-w-4xl mx-auto">
            <Card className="bg-primary text-primary-foreground text-center">
              <CardContent className="p-12">
                <MapPin className="h-16 w-16 mx-auto mb-6" />
                <h2 className="text-3xl font-bold mb-4">Ready to Visit Us?</h2>
                <p className="text-xl mb-8 opacity-90 leading-relaxed">
                  We can't wait to welcome you to Saint Augustine Parish in person!
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button size="lg" variant="secondary" className="gap-3 px-8">
                    <Navigation className="w-5 h-5" />
                    Get Directions
                  </Button>
                  <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground gap-3 px-8 hover:bg-primary-foreground hover:text-primary">
                    <Phone className="w-5 h-5" />
                    Contact Us
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}