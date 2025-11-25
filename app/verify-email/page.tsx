'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/firebase-config';
import { applyActionCode } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Check, X, Home, LogIn, ExternalLink } from 'lucide-react';

export default function VerifyEmailPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode');
    
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const verifyEmail = async () => {
            if (mode === 'verifyEmail' && oobCode) {
                try {
                    await applyActionCode(auth, oobCode);
                    setStatus('success');
                    setMessage('Email verified successfully! Your account is now active.');
                } catch (error: any) {
                    console.error('Email verification error:', error);
                    setStatus('error');
                    setMessage(error.message || 'Failed to verify email. The link may have expired.');
                }
            } else {
                setStatus('error');
                setMessage('Invalid verification link.');
            }
        };

        verifyEmail();
    }, [oobCode, mode]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-t-lg text-primary-foreground text-center">
                    <h1 className="text-2xl font-bold">Email Verification</h1>
                </CardHeader>
                
                <CardContent className="p-6 text-center">
                    {status === 'loading' && (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-blue-100 p-4">
                                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            </div>
                            <p className="text-gray-600">Verifying your email...</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-6">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-green-100 p-4">
                                    <Check className="w-12 h-12 text-green-600" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-green-800">
                                    Verification Successful!
                                </h2>
                                <p className="text-gray-600">
                                    {message}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Button 
                                    onClick={() => router.push('/login')}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    <LogIn className="mr-2 h-4 w-4" />
                                    Go to Login
                                </Button>
                                
                                <Button 
                                    onClick={() => router.push('/')}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Back to Homepage
                                </Button>

                                <Button 
                                    onClick={() => window.open('https://holy-event.vercel.app', '_blank')}
                                    variant="ghost"
                                    className="w-full"
                                >
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Open Main Website
                                </Button>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-6">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-red-100 p-4">
                                    <X className="w-12 h-12 text-red-600" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-red-800">
                                    Verification Failed
                                </h2>
                                <p className="text-gray-600">
                                    {message}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <Button 
                                    onClick={() => router.push('/register')}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    Try Registering Again
                                </Button>
                                
                                <Button 
                                    onClick={() => router.push('/')}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Back to Homepage
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}