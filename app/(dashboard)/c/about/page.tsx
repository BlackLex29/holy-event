'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Church,
  Heart,
  Calendar,
  MapPin,
  Users
} from 'lucide-react';

export default function AboutChurchPage() {
  const barangays = [
    'Brgy. Santor',
    'Brgy. Janopol Occidental', 
    'Brgy. Gonzales',
    'Brgy. Talaga',
    'Brgy. Bañadero',
    'Brgy. Ambulong',
    'Brgy. Maugat'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary to-primary/90 text-primary-foreground py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-background/20 rounded-full backdrop-blur-sm">
                <Church className="h-16 w-16" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">St. Augustine Parish</h1>
            <p className="text-xl md:text-2xl opacity-90 mb-8 leading-relaxed">
              "To seek God and to find Him in all things"
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {/* Badges removed as requested */}
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-16">
        {/* Welcome Section */}
        <section className="mb-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div>
                  <h2 className="text-3xl font-bold mb-4">Welcome to Our Parish</h2>
                  <div className="space-y-4 text-muted-foreground">
                    <p className="text-lg leading-relaxed">
                      St. Augustine Parish is a vibrant Catholic community dedicated to living 
                      the Gospel of Jesus Christ through worship, service, and fellowship. 
                    </p>
                    <p className="text-lg leading-relaxed">
                      For over 11 years, we have been a beacon of faith, hope, and love in our community, 
                      nurturing spiritual growth and serving those in need.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" className="gap-3 px-8">
                    <Heart className="w-5 h-5" />
                    Join Our Community
                  </Button>
                  <Button variant="outline" size="lg" className="gap-3 px-8">
                    <Calendar className="w-5 h-5" />
                    Mass Schedule
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="bg-muted rounded-2xl h-96 w-full flex items-center justify-center shadow-lg overflow-hidden">
                  <img 
                    src="/1.jpg" 
                    alt="St. Augustine Church Building"
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                    onError={(e) => {
                      // Fallback image if primary fails
                      e.currentTarget.src = "/images/church-exterior.jpg";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* History Section */}
        <section className="mb-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold mb-4">Our History</h2>
                <div className="space-y-4 text-muted-foreground">
                  <p className="text-lg leading-relaxed">
                    On July 16, 2014, eight barangays in Tanauan City were created through a Decree of 
                    Canonical Erection by the Roman Catholic Archbishop of Lipa, Most Reverend Ramon C. 
                    Arguelles, D.D. as the Parish of St. Augustine of Hippo.
                  </p>
                  <p className="text-lg leading-relaxed">
                    The titular patron St. Augustine of Hippo was chosen because of his great contribution 
                    in understanding the truths about the doctrine of the church and in honor of the first 
                    missionaries who sow the seed of faith to the entire archdiocese - the Augustinian Friars.
                  </p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Location & Coverage</h3>
                    <p className="text-muted-foreground mb-4">
                      Located in the western part of Tanauan City along Tanauan-Talisay Road, 
                      serving approximately 25,000 residents.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {barangays.map((barangay, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                          <span className="text-sm text-muted-foreground">{barangay}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Users className="w-6 h-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Community</h3>
                    <p className="text-muted-foreground">
                      A great number of Christians belong to the Roman Catholic Church with 
                      minority belonging to non-Christian denominations.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Additional Church Images Section */}
        <section className="mb-20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Sacred Space</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-muted rounded-xl overflow-hidden shadow-lg">
                <img 
                  src="/1.jpg" 
                  alt="Church Interior"
                  className="w-full h-64 object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden p-4 text-center bg-muted">
                  <Church className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Church Interior</p>
                </div>
              </div>
              <div className="bg-muted rounded-xl overflow-hidden shadow-lg">
                <img 
                  src="/3.jpg" 
                  alt="Main Altar"
                  className="w-full h-64 object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden p-4 text-center bg-muted">
                  <Church className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Main Altar</p>
                </div>
              </div>
              <div className="bg-muted rounded-xl overflow-hidden shadow-lg">
                <img 
                  src="/2.jpg" 
                  alt="Church Community"
                  className="w-full h-64 object-cover transition-transform duration-300 hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
                <div className="hidden p-4 text-center bg-muted">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">Our Community</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}