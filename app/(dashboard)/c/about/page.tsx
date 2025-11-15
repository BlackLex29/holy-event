// app/c/about/page.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Church,
  Clock,
  Heart,
  Calendar,
  Cross
} from 'lucide-react';

export default function AboutChurchPage() {
  const massSchedules = [
    { day: 'Sunday', times: ['9:00 AM', '11:00 AM'] },
    { day: 'Monday, Tuesday, Thursday', times: ['6:15 AM'] },
    { day: 'Wednesday - Friday', times: ['5:00 PM'] },
    { day: 'Saturday', times: ['6:15 AM', '5:30 PM'] }
  ];

  const sacraments = [
    { 
      name: 'Baptism', 
      schedule: 'Every Saturday at 2:00 PM', 
      requirement: 'Pre-Baptism Seminar required',
      icon: Cross
    },
    { 
      name: 'Wedding', 
      schedule: 'By appointment', 
      requirement: '6 months preparation',
      icon: Heart
    },
    { 
      name: 'Confession', 
      schedule: '30 minutes before Mass or by appointment', 
      requirement: '',
      icon: Cross
    },
    { 
      name: 'First Communion', 
      schedule: 'During Sunday Mass', 
      requirement: '1 year catechism',
      icon: Cross
    },
    { 
      name: 'Confirmation', 
      schedule: 'Annual celebration', 
      requirement: '2 years preparation',
      icon: Cross
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
                <Church className="h-16 w-16" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Saint Augustine Parish</h1>
            <p className="text-xl md:text-2xl opacity-90 mb-8 leading-relaxed">
              "To seek God and to find Him in all things"
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Founded 1950
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Catholic Diocese
              </Badge>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Community of Faith
              </Badge>
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
                      Saint Augustine Parish is a vibrant Catholic community dedicated to living 
                      the Gospel of Jesus Christ through worship, service, and fellowship. 
                    </p>
                    <p className="text-lg leading-relaxed">
                      For over 70 years, we have been a beacon of faith, hope, and love in our community, 
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
                    src="/church.jpg" 
                    alt="Saint Augustine Church"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-muted">
                    <div className="text-center">
                      <Church className="h-20 w-20 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground text-lg">Church Image</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Separator className="my-16" />

        {/* Mass Schedule */}
        <section className="mb-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Mass Schedule</h2>
            <p className="text-lg text-muted-foreground">
              Join us in celebration of the Holy Eucharist
            </p>
          </div>
          
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {massSchedules.map((schedule, index) => (
                <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-center gap-3 text-lg">
                      <Clock className="w-5 h-5 text-primary" />
                      {schedule.day}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {schedule.times.map((time, timeIndex) => (
                        <div key={timeIndex} className="p-3 bg-muted/50 rounded-lg border">
                          <span className="font-semibold text-primary">{time}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Sacraments */}
        <section className="mb-20">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Sacraments</h2>
            <p className="text-lg text-muted-foreground">
              Channels of God's grace for our spiritual journey
            </p>
          </div>

          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sacraments.map((sacrament, index) => {
                const IconComponent = sacrament.icon;
                return (
                  <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center justify-center gap-3 text-lg">
                        <IconComponent className="w-5 h-5 text-primary" />
                        {sacrament.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 bg-primary/10 rounded-lg border">
                        <p className="font-semibold text-sm text-primary mb-1">Schedule</p>
                        <p className="text-sm text-muted-foreground">{sacrament.schedule}</p>
                      </div>
                      {sacrament.requirement && (
                        <div className="p-3 bg-muted/50 rounded-lg border">
                          <p className="font-semibold text-sm mb-1">Requirements</p>
                          <p className="text-sm text-muted-foreground">{sacrament.requirement}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>    
        </section>

        {/* Final Call to Action */}
        <section>
          <div className="max-w-4xl mx-auto">
            <Card className="bg-primary text-primary-foreground text-center">
              <CardContent className="p-12">
                <Church className="h-16 w-16 mx-auto mb-6" />
                <h2 className="text-3xl font-bold mb-4">Become Part of Our Family</h2>
                <p className="text-xl mb-8 opacity-90 leading-relaxed">
                  Whether you're new to the area or seeking a spiritual home, 
                  we welcome you with open arms.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button size="lg" variant="secondary" className="gap-3 px-8">
                    <Heart className="w-5 h-5" />
                    Join Our Community
                  </Button>
                  <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground gap-3 px-8 hover:bg-primary-foreground hover:text-primary">
                    <Calendar className="w-5 h-5" />
                    View Mass Schedule
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