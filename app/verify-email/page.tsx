'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { applyActionCode } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [message, setMessage] = useState('Verifying your email address...');
    
    const oobCode = searchParams.get('oobCode');
    const mode = searchParams.get('mode');

    useEffect(() => {
        const verifyEmail = async () => {
            // Check if this is an email verification request
            if (mode !== 'verifyEmail' || !oobCode) {
                setStatus('error');
                setMessage('Invalid verification link. Please request a new verification email.');
                return;
            }

            try {
                // Apply the email verification code
                await applyActionCode(auth, oobCode);
                
                // Get current user
                const user = auth.currentUser;
                
                if (user) {
                    // Update Firestore
                    try {
                        await updateDoc(doc(db, 'users', user.uid), {
                            emailVerified: true,
                            status: 'active',
                            verifiedAt: new Date()
                        });
                        
                        await updateDoc(doc(db, 'authentication', user.uid), {
                            emailVerified: true,
                            status: 'active',
                            verifiedAt: new Date()
                        });
                    } catch (firestoreError) {
                        console.error('Firestore update error:', firestoreError);
                        // Continue even if Firestore update fails
                    }
                }

                setStatus('success');
                setMessage('Your email has been successfully verified! You can now log in to your account.');
                
                // Redirect to login after 3 seconds
                setTimeout(() => {
                    router.push('/login?verified=true');
                }, 3000);

            } catch (error: any) {
                console.error('Verification error:', error);
                
                let errorMessage = 'Verification failed. ';
                
                if (error.code === 'auth/expired-action-code') {
                    errorMessage += 'This verification link has expired. Please request a new one.';
                } else if (error.code === 'auth/invalid-action-code') {
                    errorMessage += 'This verification link is invalid or has already been used.';
                } else if (error.code === 'auth/user-disabled') {
                    errorMessage += 'Your account has been disabled. Please contact support.';
                } else if (error.code === 'auth/user-not-found') {
                    errorMessage += 'No account found. Please register first.';
                } else {
                    errorMessage += 'Please try again or contact support.';
                }
                
                setStatus('error');
                setMessage(errorMessage);
            }
        };

        verifyEmail();
    }, [oobCode, mode, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md shadow-xl">
                <CardHeader className="bg-gradient-to-r from-sky-400 to-sky-600 p-6 rounded-t-lg text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <Mail className="w-7 h-7" />
                        <h1 className="text-2xl font-bold">Email Verification</h1>
                    </div>
                    <p className="text-lg opacity-90">Confirming your email address</p>
                </CardHeader>

                <CardContent className="p-8">
                    <div className="space-y-6 text-center">
                        {status === 'verifying' && (
                            <>
                                <div className="flex justify-center">
                                    <Loader2 className="w-16 h-16 text-sky-500 animate-spin" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                        Verifying...
                                    </h2>
                                    <p className="text-gray-600">{message}</p>
                                </div>
                            </>
                        )}

                        {status === 'success' && (
                            <>
                                <div className="flex justify-center">
                                    <div className="rounded-full bg-green-100 p-4">
                                        <CheckCircle className="w-16 h-16 text-green-600" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-green-700 mb-2">
                                        Email Verified!
                                    </h2>
                                    <p className="text-gray-600 mb-4">{message}</p>
                                    <p className="text-sm text-gray-500">
                                        Redirecting to login page...
                                    </p>
                                </div>
                                <Button 
                                    onClick={() => router.push('/login')}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    Go to Login Now
                                </Button>
                            </>
                        )}

                        {status === 'error' && (
                            <>
                                <div className="flex justify-center">
                                    <div className="rounded-full bg-red-100 p-4">
                                        <XCircle className="w-16 h-16 text-red-600" />
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-red-700 mb-2">
                                        Verification Failed
                                    </h2>
                                    <p className="text-gray-600">{message}</p>
                                </div>
                                <div className="space-y-3">
                                    <Button 
                                        onClick={() => router.push('/login')}
                                        className="w-full bg-sky-600 hover:bg-sky-700"
                                    >
                                        Go to Login
                                    </Button>
                                    <Button 
                                        onClick={() => router.push('/register')}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        Register New Account
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function VerifyEmailLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-md">
                <CardContent className="p-8">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-16 h-16 text-sky-500 mx-auto animate-spin" />
                        <h2 className="text-2xl font-bold text-sky-600">Loading</h2>
                        <p className="text-muted-foreground">Preparing verification...</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<VerifyEmailLoading />}>
            <VerifyEmailContent />
        </Suspense>
    );
}