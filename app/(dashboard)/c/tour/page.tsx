'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Church,
  MapPin,
  Clock,
  Phone,
  Navigation
} from 'lucide-react';
import Image from 'next/image';

export default function VisualTourPage() {
  const [activeTab, setActiveTab] = useState('virtual');

  const churchSpots = [
    {
      id: 1,
      name: 'Saint Augustine Main Sanctuary',
      description: 'The heart of Saint Augustine Parish where daily masses and special ceremonies are held.',
      image: '/1.jpg',
      features: ['Main Altar', 'Stained Glass Windows', 'Pipe Organ', 'Pew Seating']
    },
    {
      id: 2,
      name: 'Saint Augustine Chapel',
      description: 'A quiet space in Saint Augustine Parish for personal prayer and reflection throughout the day.',
      image: '/2.jpg',
      features: ['Daily Adoration', 'Quiet Meditation', 'Candle Lighting']
    },
    {
      id: 3,
      name: 'Saint Augustine Parish Hall',
      description: 'Community gathering space at Saint Augustine Parish for events, meetings, and fellowship.',
      image: '/3.jpg',
      features: ['Event Space', 'Kitchen Facilities', 'Meeting Rooms']
    },
    {
      id: 4,
      name: 'Saint Augustine Gardens',
      description: 'Beautifully maintained gardens at Saint Augustine Parish for peaceful walks and outdoor prayer.',
      image: '/3.jpg',
      features: ['Rosary Garden', 'Meditation Path', 'Outdoor Stations of Cross']
    },
    {
      id: 5,
      name: 'Saint Augustine Baptismal Font',
      description: 'Where the sacrament of baptism is celebrated for new members at Saint Augustine Parish.',
      image: '/2.jpg',
      features: ['Marble Font', 'Family Seating', 'Sacristy Access']
    },
    {
      id: 6,
      name: 'Saint Augustine Confessionals',
      description: 'Private spaces for the sacrament of reconciliation at Saint Augustine Parish.',
      image: '/1.jpg',
      features: ['Private Booths', 'Priest Availability', 'Prayer Area']
    }
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
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Saint Augustine Parish Visual Tour</h1>
            <p className="text-xl md:text-2xl opacity-90 mb-8 leading-relaxed">
              Explore Saint Augustine Parish from anywhere in the world
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                360° Virtual View
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
                Virtual View
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
                      360° Virtual View
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Take an immersive virtual walk through Saint Augustine Parish
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
                      <div className="relative h-96 w-full">
                        <Image
                          src="/Virtualview.jpg"
                          alt="Saint Augustine Parish Virtual Tour"
                          fill
                          className="object-cover"
                          priority
                        />
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <div className="text-center text-white bg-black/50 p-6 rounded-lg backdrop-blur-sm">
                            <Church className="h-12 w-12 mx-auto mb-3" />
                            <p className="text-lg font-semibold">Saint Augustine Parish</p>
                            <p className="text-sm opacity-90">360° Virtual Experience</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="font-semibold">Full 360° View</p>
                        <p className="text-sm text-muted-foreground">Explore every angle of Saint Augustine</p>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="font-semibold">Interactive Hotspots</p>
                        <p className="text-sm text-muted-foreground">Click to learn more about Saint Augustine</p>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg">
                        <p className="font-semibold">Guided Navigation</p>
                        <p className="text-sm text-muted-foreground">Easy to use tour of Saint Augustine</p>
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
                      Saint Augustine Parish Map
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Find your way around Saint Augustine Parish campus
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-2xl overflow-hidden shadow-lg mb-6">
                      <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3869.74879425535!2d121.12334999999999!3d14.092000999999996!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2s!5e0!3m2!1sen!2sph!4v1763736448990!5m2!1sen!2sph" 
                        width="100%" 
                        height="450" 
                        style={{border: 0}} 
                        allowFullScreen
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Saint Augustine Parish Location Map">
                      </iframe>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h3 className="font-bold text-lg">Saint Augustine Location Details</h3>
                        <div className="space-y-2">
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>123 Saint Augustine Street, Manila</span>
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
                        <h3 className="font-bold text-lg">Getting to Saint Augustine</h3>
                        <div className="space-y-2 text-sm">
                          <p>🚗 Ample parking available at Saint Augustine</p>
                          <p>🚌 Bus routes: 12, 45, 67 (Saint Augustine stop)</p>
                          <p>🚇 Nearest MRT: Faith Station</p>
                          <p>♿ Saint Augustine is wheelchair accessible</p>
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
                      Saint Augustine Photo Gallery
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Explore Saint Augustine Parish through beautiful photographs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {churchSpots.map((spot) => (
                        <Card key={spot.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                          <div 
                            className="bg-muted h-48 rounded-t-lg flex items-center justify-center bg-cover bg-center"
                            style={{ backgroundImage: `url(${spot.image})` }}
                          >
                            <div className="bg-black/40 rounded-lg p-2">
                              <Church className="h-12 w-12 text-white" />
                            </div>
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
      </div>
    </div>
  );
}