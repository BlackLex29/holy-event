'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Cross2Icon } from '@radix-ui/react-icons';
import { Clock, TriangleAlert } from 'lucide-react'; // Fixed import
import {
    signInWithEmailAndPassword,
    getMultiFactorResolver,
    TotpMultiFactorGenerator
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';
import { checkRateLimit, trackFailedLogin, resetFailedAttempts, RateLimitStatus } from '@/lib/services/ratelimitservices';

const LoginPage = () => {
    const router = useRouter();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMfaInput, setShowMfaInput] = useState(false);
    const [mfaResolver, setMfaResolver] = useState<any>(null);
    const [totpCode, setTotpCode] = useState('');
    const [rateLimitStatus, setRateLimitStatus] = useState<RateLimitStatus | null>(null);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    const handleChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Check rate limit when email changes
    useEffect(() => {
        const checkRateLimitStatus = async () => {
            if (formData.email) {
                const status = await checkRateLimit(formData.email);
                setRateLimitStatus(status);
            } else {
                setRateLimitStatus(null);
            }
        };

        checkRateLimitStatus();
    }, [formData.email]);

    const redirectUser = async (uid: string) => {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            const role = userDoc.data().role;
            if (role === 'admin') {
                router.push('/a/dashboard');
            } else {
                router.push('/c/dashboard');
            }
        } else {
            setError('User profile not found.');
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Check rate limit before attempting login
        if (formData.email) {
            const rateLimitCheck = await checkRateLimit(formData.email);
            if (rateLimitCheck.isBlocked && rateLimitCheck.blockUntil) {
                setError(`Account temporarily locked. Please try again in ${Math.ceil((rateLimitCheck.blockUntil - Date.now()) / 60000)} minutes.`);
                setLoading(false);
                return;
            }
        }

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            // Reset failed attempts on successful login
            await resetFailedAttempts(formData.email);
            
            // If no MFA is required, redirect immediately
            await redirectUser(userCredential.user.uid);
        } catch (err: any) {
            if (err.code === 'auth/multi-factor-auth-required') {
                // MFA is required, show the TOTP input
                const resolver = getMultiFactorResolver(auth, err);
                setMfaResolver(resolver);
                setShowMfaInput(true);
                setLoading(false);
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                // Track failed login attempt
                if (formData.email) {
                    const newStatus = await trackFailedLogin(formData.email);
                    setRateLimitStatus(newStatus);
                    
                    if (newStatus.isBlocked && newStatus.blockUntil) {
                        const minutesLeft = Math.ceil((newStatus.blockUntil - Date.now()) / 60000);
                        setError(`Too many failed attempts. Account locked for ${minutesLeft} minutes.`);
                    } else {
                        const attemptsLeft = newStatus.attemptsRemaining;
                        setError(`Invalid email or password. ${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining.`);
                    }
                } else {
                    setError('Invalid email or password.');
                }
                setLoading(false);
            } else {
                const messages: { [key: string]: string } = {
                    'auth/invalid-email': 'Please enter a valid email address.',
                    'auth/too-many-requests': 'Too many attempts. Try again later.',
                    'auth/invalid-credential': 'Invalid email or password.',
                    'auth/user-disabled': 'This account has been disabled.',
                    'auth/network-request-failed': 'Network error. Please check your connection.',
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

            // Reset failed attempts on successful login
            await resetFailedAttempts(formData.email);

            // Redirect user
            await redirectUser(userCredential.user.uid);
        } catch (err: any) {
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

    // Format time remaining for display
    const formatTimeRemaining = (blockUntil: number) => {
        const minutes = Math.ceil((blockUntil - Date.now()) / 60000);
        return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    };

    if (showMfaInput) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    {/* Header */}
                    <CardHeader className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-t-lg text-primary-foreground">
                        <div className="flex items-center gap-3 mb-2">
                            <Cross2Icon className="w-7 h-7" />
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
                                    onChange={(e) => setTotpCode(e.target.value)}
                                    required
                                    disabled={loading}
                                    maxLength={6}
                                    className="text-center text-2xl tracking-widest"
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
                                {loading ? 'Verifying...' : 'Verify'}
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                {/* Header */}
                <CardHeader className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-t-lg text-primary-foreground">
                    <div className="flex items-center gap-3 mb-2">
                        <Cross2Icon className="w-7 h-7" />
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
                                className={rateLimitStatus?.isBlocked ? 'border-red-500' : ''}
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
                            />
                        </div>

                        {/* Rate Limit Warnings */}
                        {rateLimitStatus && (
                            <div className="space-y-2">
                                {rateLimitStatus.isBlocked && rateLimitStatus.blockUntil && (
                                    <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                            Account temporarily locked. Try again in {formatTimeRemaining(rateLimitStatus.blockUntil)}.
                                        </span>
                                    </div>
                                )}
                                
                                {!rateLimitStatus.isBlocked && rateLimitStatus.attempts > 0 && (
                                    <div className="flex items-center gap-2 p-3 bg-amber-100 border border-amber-300 text-amber-700 rounded text-sm">
                                        <TriangleAlert className="w-4 h-4" />
                                        <span>
                                            {rateLimitStatus.attemptsRemaining} attempt{rateLimitStatus.attemptsRemaining !== 1 ? 's' : ''} remaining before lockout.
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={formData.rememberMe}
                                    onCheckedChange={(checked) =>
                                        handleChange('rememberMe', checked)
                                    }
                                    disabled={loading}
                                />
                                <span>Remember me</span>
                            </label>
                            <a
                                href="#"
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
                            disabled={loading || (rateLimitStatus?.isBlocked ?? false)}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
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

                        {/* Security Notice */}
                        <div className="text-xs text-muted-foreground text-center border-t pt-3">
                            <p>5 failed attempts will lock your account for 15 minutes.</p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default LoginPage;