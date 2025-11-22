'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Church, MailCheck, AlertCircle, RefreshCw } from 'lucide-react';
import {
    signInWithEmailAndPassword,
    getMultiFactorResolver,
    TotpMultiFactorGenerator,
    sendEmailVerification,
    signOut
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';

const LoginPage = () => {
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMfaInput, setShowMfaInput] = useState(false);
    const [mfaResolver, setMfaResolver] = useState<any>(null);
    const [totpCode, setTotpCode] = useState('');
    const [showVerificationWarning, setShowVerificationWarning] = useState(false);
    const [unverifiedUser, setUnverifiedUser] = useState<any>(null);
    const [resendingVerification, setResendingVerification] = useState(false);
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    // Check if user is already logged in
    useEffect(() => {
        const checkAuthState = () => {
            const userRole = localStorage.getItem('userRole');
            const authToken = localStorage.getItem('authToken');
            const userId = localStorage.getItem('church_appointment_userId');
            
            if (userRole && authToken && userId) {
                // User is already logged in, redirect to appropriate dashboard
                if (userRole === 'admin') {
                    router.push('/a/dashboard');
                } else {
                    router.push('/c/dashboard');
                }
            }
        };

        checkAuthState();
    }, [router]);

    // Check URL parameters for verification success
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const verified = urlParams.get('verified');
        const email = urlParams.get('email');
        
        if (verified === 'true' && email) {
            setError('Email verified successfully! You can now login.');
            setFormData(prev => ({ ...prev, email }));
        }
    }, []);

    const handleChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const saveUserToLocalStorage = async (uid: string, email: string, role: string) => {
        try {
            // Generate or get user ID for appointments
            let userId = localStorage.getItem('church_appointment_userId');
            if (!userId) {
                userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('church_appointment_userId', userId);
            }
            
            // Save user data to localStorage
            localStorage.setItem('userRole', role);
            localStorage.setItem('authToken', 'firebase-auth-' + Date.now());
            localStorage.setItem('userEmail', email);
            localStorage.setItem('church_appointment_userEmail', email);
            
            // Save basic user info
            const userData = {
                name: email.split('@')[0] || 'Parishioner',
                email: email,
                phone: '+639171234567',
                joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                parishionerId: `P-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            console.log('✅ User data saved to localStorage:', { userId, role, email });
        } catch (error) {
            console.error('Error saving user to localStorage:', error);
        }
    };

    const redirectUser = async (uid: string, email: string) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            let role = 'client'; // Default role
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                role = userData.role || 'client';
                
                // Update last login time and status
                await updateDoc(doc(db, 'users', uid), {
                    lastLogin: new Date(),
                    status: 'active',
                    emailVerified: true,
                    pendingVerification: false
                });
            } else {
                // If user doesn't exist in Firestore, create basic record
                console.log('User not found in Firestore, using default client role');
            }

            // Save user data to localStorage FIRST
            await saveUserToLocalStorage(uid, email, role);

            // Then redirect
            if (role === 'admin') {
                router.push('/a/dashboard');
            } else {
                router.push('/c/dashboard');
            }
        } catch (error) {
            console.error('Error redirecting user:', error);
            setError('Error loading user profile. Using default access.');
            
            // Fallback: Save basic user data and redirect to client dashboard
            await saveUserToLocalStorage(uid, email, 'client');
            router.push('/c/dashboard');
        }
    };

    const handleResendVerification = async () => {
        if (!unverifiedUser) return;
        
        try {
            setResendingVerification(true);
            await sendEmailVerification(unverifiedUser);
            
            // Update verification sent time in Firestore
            if (unverifiedUser.uid) {
                await updateDoc(doc(db, 'users', unverifiedUser.uid), {
                    lastVerificationSent: new Date()
                });
            }
            
            setError('Verification email sent! Please check your inbox and spam folder.');
        } catch (err: any) {
            console.error('Error resending verification:', err);
            setError('Failed to resend verification email. Please try again.');
        } finally {
            setResendingVerification(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setShowVerificationWarning(false);
        setUnverifiedUser(null);

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            
            const user = userCredential.user;
            console.log('✅ Firebase login successful:', { uid: user.uid, email: user.email });
            
            // Check if email is verified
            if (!user.emailVerified) {
                setUnverifiedUser(user);
                setShowVerificationWarning(true);
                setError('Please verify your email address before logging in. Check your email for the verification link.');
                setLoading(false);
                return;
            }
            
            // If email is verified, proceed to redirect
            await redirectUser(user.uid, user.email || formData.email);
        } catch (err: any) {
            console.error('❌ Login error:', err.code, err.message);
            
            if (err.code === 'auth/multi-factor-auth-required') {
                // MFA is required, show the TOTP input
                const resolver = getMultiFactorResolver(auth, err);
                setMfaResolver(resolver);
                setShowMfaInput(true);
                setLoading(false);
            } else {
                const messages: { [key: string]: string } = {
                    'auth/invalid-email': 'Please enter a valid email address.',
                    'auth/user-not-found': 'No account found with this email.',
                    'auth/wrong-password': 'Invalid password.',
                    'auth/too-many-requests': 'Too many attempts. Try again later.',
                    'auth/invalid-credential': 'Invalid email or password.',
                    'auth/user-disabled': 'This account has been disabled.',
                    'auth/network-request-failed': 'Network error. Please check your connection.',
                    'auth/email-not-verified': 'Please verify your email address first.',
                };
                setError(messages[err.code] || err.message || 'Login failed');
                setLoading(false);
            }
        }
    };

    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // Find the TOTP factor
            const totpFactor = mfaResolver.hints.find(
                (hint: any) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID
            );

            if (!totpFactor) {
                setError('TOTP authentication not available.');
                setLoading(false);
                return;
            }

            // Create assertion with the TOTP code
            const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
                totpFactor.uid,
                totpCode
            );

            // Complete sign-in
            const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion);
            
            const user = userCredential.user;
            
            // Check email verification for MFA flow too
            if (!user.emailVerified) {
                setUnverifiedUser(user);
                setShowVerificationWarning(true);
                setError('Please verify your email address before logging in.');
                setLoading(false);
                return;
            }

            // Redirect user
            await redirectUser(userCredential.user.uid, user.email || formData.email);
        } catch (err: any) {
            console.error('MFA error:', err);
            const messages: { [key: string]: string } = {
                'auth/invalid-verification-code': 'Invalid verification code.',
                'auth/code-expired': 'Verification code has expired.',
            };
            setError(messages[err.code] || 'Invalid verification code. Please try again.');
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        setShowMfaInput(false);
        setMfaResolver(null);
        setTotpCode('');
        setError('');
    };

    const handleBackFromVerification = async () => {
        // Sign out only when going back to login from verification screen
        if (unverifiedUser) {
            await signOut(auth);
        }
        setShowVerificationWarning(false);
        setUnverifiedUser(null);
        setError('');
    };

    const handleTryAgainAfterVerification = async () => {
        if (!unverifiedUser) return;
        
        setLoading(true);
        setError('');
        
        try {
            // Reload the user to get updated email verification status
            await unverifiedUser.reload();
            
            if (unverifiedUser.emailVerified) {
                // Email is now verified, proceed with login
                await redirectUser(unverifiedUser.uid, unverifiedUser.email);
            } else {
                setError('Email not verified yet. Please check your email and click the verification link.');
                setLoading(false);
            }
        } catch (err: any) {
            console.error('Error checking verification:', err);
            setError('Error checking verification status. Please try logging in again.');
            setLoading(false);
        }
    };

    // Email Verification Warning Screen
    if (showVerificationWarning) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    {/* Header */}
                    <CardHeader className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-t-lg text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <MailCheck className="w-7 h-7" />
                            <h1 className="text-2xl font-bold">Email Verification Required</h1>
                        </div>
                        <p className="text-lg opacity-90">Please verify your email to continue</p>
                    </CardHeader>

                    {/* Verification Content */}
                    <CardContent className="p-6">
                        <div className="space-y-5">
                            <div className="text-center">
                                <div className="rounded-full bg-yellow-100 p-4 inline-flex mb-4">
                                    <AlertCircle className="w-12 h-12 text-yellow-600" />
                                </div>
                                <h2 className="text-xl font-bold text-yellow-800 mb-2">
                                    Check Your Email
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    We've sent a verification link to:
                                </p>
                                <p className="font-semibold text-lg bg-gray-100 p-3 rounded border break-all">
                                    {unverifiedUser?.email}
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-semibold text-blue-800 mb-2">What to do:</h3>
                                <ul className="space-y-2 text-sm text-blue-700">
                                    <li>• Check your email inbox and spam folder</li>
                                    <li>• Click the verification link in the email</li>
                                    <li>• Return here and click "I've Verified My Email"</li>
                                    <li>• The email comes from Firebase (noreply@firebaseapp.com)</li>
                                </ul>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-3">
                                <Button
                                    onClick={handleTryAgainAfterVerification}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Checking...
                                        </>
                                    ) : (
                                        <>
                                            <MailCheck className="mr-2 h-4 w-4" />
                                            I've Verified My Email
                                        </>
                                    )}
                                </Button>

                                <Button
                                    onClick={handleResendVerification}
                                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                                    disabled={resendingVerification}
                                >
                                    {resendingVerification ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <MailCheck className="mr-2 h-4 w-4" />
                                            Resend Verification Email
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleBackFromVerification}
                                    disabled={loading || resendingVerification}
                                >
                                    Back to Login
                                </Button>
                            </div>

                            <p className="text-center text-sm text-gray-500">
                                Still having trouble?{' '}
                                <a 
                                    href="mailto:support@holyevents.com" 
                                    className="text-primary hover:underline font-medium"
                                >
                                    Contact support
                                </a>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // MFA Screen
    if (showMfaInput) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    {/* Header */}
                    <CardHeader className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-t-lg text-primary-foreground">
                        <div className="flex items-center gap-3 mb-2">
                            <Church className="w-7 h-7" />
                            <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
                        </div>
                        <p className="text-lg opacity-90">Enter your verification code</p>
                    </CardHeader>

                    {/* MFA Form */}
                    <CardContent className="p-6">
                        <form onSubmit={handleMfaSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="totp">Verification Code</Label>
                                <Input
                                    id="totp"
                                    type="text"
                                    placeholder="000000"
                                    value={totpCode}
                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    required
                                    disabled={loading}
                                    maxLength={6}
                                    className="text-center text-2xl tracking-widest font-mono"
                                />
                                <p className="text-sm text-muted-foreground">
                                    Enter the 6-digit code from your authenticator app
                                </p>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || totpCode.length !== 6}
                            >
                                {loading ? 'Verifying...' : 'Verify & Continue'}
                            </Button>

                            {/* Back Button */}
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={handleBackToLogin}
                                disabled={loading}
                            >
                                Back to Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Main Login Screen
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                {/* Header */}
                <CardHeader className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-t-lg text-primary-foreground">
                    <div className="flex items-center gap-3 mb-2">
                        <Church className="w-7 h-7" />
                        <h1 className="text-2xl font-bold">Holy Events</h1>
                    </div>
                    <p className="text-lg opacity-90">Welcome Back</p>
                </CardHeader>

                {/* Form */}
                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={(e) => handleChange('password', e.target.value)}
                                required
                                disabled={loading}
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={formData.rememberMe}
                                    onCheckedChange={(checked) =>
                                        handleChange('rememberMe', checked as boolean)
                                    }
                                    disabled={loading}
                                />
                                <span>Remember me</span>
                            </label>
                            <a
                                href="/forgot-password"
                                className="text-primary hover:underline font-medium"
                            >
                                Forgot password?
                            </a>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        {/* Footer */}
                        <p className="text-center text-sm text-muted-foreground">
                            Don't have an account?{' '}
                            <a
                                href="/register"
                                className="font-medium text-primary hover:underline"
                            >
                                Register here
                            </a>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default LoginPage;