'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Heart, Menu, X, LogIn, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ChurchLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    router.push('/login');
  };

  const handleRegister = () => {
    router.push('/register');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 text-slate-800">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 px-6 py-4 bg-white/90 backdrop-blur-sm border-b border-sky-200 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
            Holy Event
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="hover:text-sky-600 transition font-medium">Home</Link>
            <Link href="/discover" className="hover:text-sky-600 transition font-medium">Discover</Link>
            <Link href="/services" className="hover:text-sky-600 transition font-medium">Services</Link>
            <Link href="/connect" className="hover:text-sky-600 transition font-medium">Connect Groups</Link>
            <Link href="/about" className="hover:text-sky-600 transition font-medium">About Us</Link>
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleLogin}
              className="text-slate-700 hover:text-sky-600 hover:bg-sky-100 rounded-full px-5 transition font-medium"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Login
            </Button>
            <Button
              onClick={handleRegister}
              className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-full px-6 flex items-center gap-2 shadow-lg font-semibold"
            >
              <UserPlus className="w-4 h-4" />
              Register
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-slate-700"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-md border-b border-sky-200 shadow-lg px-6 py-6 space-y-6">
            <div className="space-y-4">
              <Link href="/" className="block hover:text-sky-600 transition font-medium">Home</Link>
              <Link href="/discover" className="block hover:text-sky-600 transition font-medium">Discover</Link>
              <Link href="/services" className="block hover:text-sky-600 transition font-medium">Services</Link>
              <Link href="/connect" className="block hover:text-sky-600 transition font-medium">Connect Groups</Link>
              <Link href="/about" className="block hover:text-sky-600 transition font-medium">About Us</Link>
            </div>
            <div className="flex flex-col gap-3 pt-4 border-t border-sky-200">
              <Button
                variant="ghost"
                onClick={handleLogin}
                className="justify-start text-slate-700 hover:text-sky-600 hover:bg-sky-100 rounded-full font-medium"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
              <Button
                onClick={handleRegister}
                className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-full flex items-center justify-center gap-2 shadow-md font-semibold"
              >
                <UserPlus className="w-4 h-4" />
                Register
              </Button>
              <Button className="bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white rounded-full font-semibold">
                Give
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-100/50 via-transparent to-transparent z-10" />
        
        <div className="relative z-20 max-w-7xl mx-auto w-full px-6 grid md:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-sky-600 text-sm font-bold uppercase tracking-widest">Welcome to Faith</p>
              <h1 className="text-5xl md:text-6xl font-bold leading-tight text-slate-800">
                Church is more than a place to attend, it is a{' '}
                <span className="bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                  place to call home
                </span>
              </h1>
            </div>

            <p className="text-slate-600 text-lg leading-relaxed max-w-xl">
              Experience faith, community, and grace with us. Join our vibrant congregation where believers gather to worship, grow, and serve together in love and truth.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Button className="bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-full px-8 py-6 font-bold shadow-lg">
                Join a Service
              </Button>
              <Button variant="outline" className="border-sky-300 text-sky-700 hover:border-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-full px-8 py-6 font-semibold">
                Connect Groups
              </Button>
              <Button variant="outline" className="border-sky-300 text-sky-700 hover:border-sky-500 hover:text-sky-600 hover:bg-sky-50 rounded-full px-8 py-6 font-semibold">
                Give Online
              </Button>
            </div>
          </div>

          {/* Right Image Section */}
          <div className="relative h-96 md:h-[600px]">
            {/* Large bottom image */}
            <div className="absolute bottom-0 left-0 w-3/4 h-2/3 rounded-2xl overflow-hidden shadow-2xl border border-sky-200">
              <Image
                src="/church-community-worship.png"
                alt="Church worship"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/70 to-transparent" />
            </div>

            {/* Top right smaller images */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 rounded-2xl overflow-hidden shadow-2xl border border-sky-200">
              <Image
                src="/church-gathering-faith.jpg"
                alt="Church gathering"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent" />
            </div>

            {/* Middle right image */}
            <div className="absolute top-1/3 right-0 w-2/5 h-1/3 rounded-2xl overflow-hidden shadow-2xl border border-sky-200 z-10">
              <Image
                src="/church-prayer-spiritual.jpg"
                alt="Church prayer"
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent" />
            </div>

            {/* Light Blue accent circle */}
            <div className="absolute bottom-8 right-8 w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-xl z-30 border-4 border-white">
              <Heart className="w-10 h-10 text-white fill-white" />
            </div>

            {/* "I'm new" badge */}
            <div className="absolute bottom-16 right-2 bg-white/90 backdrop-blur-sm rounded-xl px-6 py-4 border border-sky-200 z-20 shadow-lg">
              <p className="text-sky-600 font-bold text-lg">I'm New Here</p>
              <p className="text-slate-600 text-sm">Start your journey with us</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-20 max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-3 gap-8">
        {[
          { title: '1,200+', subtitle: 'Active Members', icon: 'People' },
          { title: '50+', subtitle: 'Years of Ministry', icon: 'Church' },
          { title: 'Daily', subtitle: 'Prayer & Events', icon: 'Calendar' },
        ].map((item, i) => (
          <div
            key={i}
            className="bg-white/80 backdrop-blur-sm border border-sky-200 rounded-xl p-8 hover:border-sky-400 transition-all duration-300 hover:shadow-xl hover:shadow-sky-100"
          >
            <div className="text-5xl mb-4 text-sky-500">{item.icon}</div>
            <h3 className="text-3xl font-bold mb-2 text-slate-800">{item.title}</h3>
            <p className="text-slate-600">{item.subtitle}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-sky-200 mt-24 py-12 px-6 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto text-center text-slate-600">
          <p className="mb-4">© 2025 Holy Church. All rights reserved.</p>
          <div className="flex justify-center gap-6 text-sm">
            <Link href="/privacy" className="hover:text-sky-600 transition font-medium">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-sky-600 transition font-medium">Terms of Use</Link>
            <Link href="/contact" className="hover:text-sky-600 transition font-medium">Contact Us</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}