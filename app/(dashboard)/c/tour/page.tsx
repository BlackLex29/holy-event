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
  Navigation,
  MousePointerClick,
  Move,
  Maximize2,
  ExternalLink
} from 'lucide-react';
import Image from 'next/image';

export default function VisualTourPage() {
  const [activeTab, setActiveTab] = useState('virtual');
  const [selectedVirtualTour, setSelectedVirtualTour] = useState(0);

  // Add your 360° tour links here
  const virtualTours = [
    {
      id: 1,
      name: 'Main Sanctuary',
      description: 'Experience the beauty of our main sanctuary in full 360°',
      embedUrl: 'https://momento360.com/e/u/97a7fa765a53490a8d6030ff26e7134a?utm_campaign=embed&utm_source=other&heading=0&pitch=0&field-of-view=75&size=medium&display-plan=true',
      thumbnail: '/1.jpg'
    },
    {
      id: 2,
      name: 'Chapel Area',
      description: 'Explore our peaceful chapel in 360° view',
      embedUrl: 'https://momento360.com/e/u/97a7fa765a53490a8d6030ff26e7134a?utm_campaign=embed&utm_source=other&heading=90&pitch=0&field-of-view=75&size=medium&display-plan=true',
      thumbnail: '/2.jpg'
    },
    {
      id: 3,
      name: 'Parish Hall',
      description: 'Virtual view of our community gathering space',
      embedUrl: 'https://momento360.com/e/u/97a7fa765a53490a8d6030ff26e7134a?utm_campaign=embed&utm_source=other&heading=180&pitch=0&field-of-view=75&size=medium&display-plan=true',
      thumbnail: '/3.jpg'
    }
  ];

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
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Visual Tour</h1>
            <p className="text-xl md:text-2xl opacity-90 mb-8 leading-relaxed">
              Explore Saint Augustine Parish from anywhere in the world
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                360° Virtual Reality
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Interactive Navigation
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Full Panorama
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
                360° Virtual View
              </Button>
              <Button
                variant={activeTab === 'map' ? 'default' : 'outline'}
                onClick={() => setActiveTab('map')}
                className="gap-2"
              >
                <MapPin className="w-4 h-4" />
                Location Map
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
                      360° Virtual Experience
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Drag to look around • Click hotspots to navigate • Full immersive experience
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* 360° Viewer */}
                    <div className="rounded-2xl overflow-hidden shadow-2xl mb-6">
                      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
                        <iframe
                          src={virtualTours[selectedVirtualTour].embedUrl}
                          className="absolute top-0 left-0 w-full h-full border-0"
                          allowFullScreen
                          allow="accelerometer; gyroscope; vr"
                          title={virtualTours[selectedVirtualTour].name}
                        />
                      </div>
                    </div>

                    {/* Tour Selection */}
                    <div className="mb-6">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Maximize2 className="w-5 h-5" />
                        Select a location to explore:
                      </h3>
                      <div className="grid md:grid-cols-3 gap-4">
                        {virtualTours.map((tour, index) => (
                          <Card 
                            key={tour.id} 
                            className={`cursor-pointer transition-all hover:shadow-lg ${
                              selectedVirtualTour === index ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => setSelectedVirtualTour(index)}
                          >
                            <div 
                              className="h-32 bg-cover bg-center rounded-t-lg relative"
                              style={{ backgroundImage: `url(${tour.thumbnail})` }}
                            >
                              {selectedVirtualTour === index && (
                                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                  <Badge className="bg-primary text-primary-foreground">
                                    Currently Viewing
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4">
                              <h4 className="font-bold mb-1">{tour.name}</h4>
                              <p className="text-xs text-muted-foreground">{tour.description}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid md:grid-cols-3 gap-4 text-center mb-6">
                      <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                        <Move className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-semibold">Drag to Look Around</p>
                        <p className="text-sm text-muted-foreground">Click and drag to explore 360°</p>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                        <MousePointerClick className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-semibold">Interactive Hotspots</p>
                        <p className="text-sm text-muted-foreground">Click markers to navigate</p>
                      </div>
                      <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary/20">
                        <Maximize2 className="w-8 h-8 mx-auto mb-2 text-primary" />
                        <p className="font-semibold">Fullscreen Mode</p>
                        <p className="text-sm text-muted-foreground">Click fullscreen icon inside</p>
                      </div>
                    </div>

                    {/* Controls Info */}
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <MousePointerClick className="w-5 h-5" />
                        How to Navigate the 360° Tour:
                      </h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold mb-2">🖱️ Desktop Controls:</p>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• Click & drag to look around</li>
                            <li>• Scroll to zoom in/out</li>
                            <li>• Click hotspots to move locations</li>
                            <li>• Double-click for fullscreen</li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-semibold mb-2">📱 Mobile/VR Controls:</p>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• Swipe to look around</li>
                            <li>• Pinch to zoom</li>
                            <li>• Tap hotspots to navigate</li>
                            <li>• Use VR mode with headset</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* External Link */}
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        <span>
                          <strong>Tip:</strong> For the best experience, click the fullscreen button inside the viewer or open in a new tab
                        </span>
                      </p>
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
                      Parish Map
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Find your way around the campus
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
                        <h3 className="font-bold text-lg">Location Details</h3>
                        <div className="space-y-2">
                          <p className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span>123 Church Street, Manila</span>
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
                      Explore through beautiful photographs
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