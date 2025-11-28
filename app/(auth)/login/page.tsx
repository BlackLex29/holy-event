'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Church, RefreshCw, Eye, EyeOff, ArrowLeft, MailCheck, LockKeyhole, Shield, AlertTriangle, Clock } from 'lucide-react';
import {
    signInWithEmailAndPassword,
    getMultiFactorResolver,
    TotpMultiFactorGenerator,
    sendPasswordResetEmail,
    onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  MAX_ATTEMPTS_PER_EMAIL: 5,
  MAX_ATTEMPTS_PER_IP: 10,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  MIN_TIME_BETWEEN_ATTEMPTS: 2000, // 2 seconds
  ATTEMPTS_TIME_WINDOW: 60 * 60 * 1000 // 1 hour
};

// Types for localStorage data
interface SecurityState {
  failedAttempts: number;
  lockUntil: number | null;
  lastAttemptTime: number | null;
  email: string;
  clientIP: string;
}

interface LoginAttempt {
  email: string;
  timestamp: number;
  success: boolean;
}

const LoginPage = () => {
    const router = useRouter();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showMfaInput, setShowMfaInput] = useState(false);
    const [mfaResolver, setMfaResolver] = useState<any>(null);
    const [totpCode, setTotpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    
    // Brute force protection state
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [lockUntil, setLockUntil] = useState<number | null>(null);
    const [lastAttemptTime, setLastAttemptTime] = useState<number | null>(null);
    const [clientIP, setClientIP] = useState<string>('unknown');
    const [isBotDetectionActive, setIsBotDetectionActive] = useState(false);
    const [remainingAttempts, setRemainingAttempts] = useState(RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL);
    const [countdown, setCountdown] = useState<string>('');
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    // Real-time countdown timer
    useEffect(() => {
        const updateCountdown = () => {
            if (!lockUntil) {
                setCountdown('');
                return;
            }

            const now = Date.now();
            const timeLeft = lockUntil - now;

            if (timeLeft <= 0) {
                setLockUntil(null);
                setFailedAttempts(0);
                setRemainingAttempts(RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL);
                setCountdown('');
                if (countdownRef.current) {
                    clearInterval(countdownRef.current);
                    countdownRef.current = null;
                }
                return;
            }

            const minutes = Math.floor(timeLeft / 60000);
            const seconds = Math.floor((timeLeft % 60000) / 1000);
            setCountdown(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateCountdown();

        if (lockUntil && lockUntil > Date.now()) {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
            countdownRef.current = setInterval(updateCountdown, 1000);
        }

        return () => {
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, [lockUntil]);

    // Load security state from localStorage on component mount
    useEffect(() => {
        const loadSecurityState = () => {
            try {
                const savedState = localStorage.getItem('loginSecurityState');
                if (savedState) {
                    const state: SecurityState = JSON.parse(savedState);
                    const now = Date.now();
                    if (state.lockUntil && now < state.lockUntil) {
                        setFailedAttempts(state.failedAttempts);
                        setLockUntil(state.lockUntil);
                        setLastAttemptTime(state.lastAttemptTime);
                        setRemainingAttempts(RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL - state.failedAttempts);
                    } else if (state.lockUntil && now >= state.lockUntil) {
                        resetSecurityState();
                    } else {
                        setFailedAttempts(state.failedAttempts);
                        setLockUntil(state.lockUntil);
                        setLastAttemptTime(state.lastAttemptTime);
                        setRemainingAttempts(RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL - state.failedAttempts);
                    }
                }
            } catch (error) {
                console.error('Error loading security state:', error);
                resetSecurityState();
            }
        };

        getClientIP().then(ip => setClientIP(ip));
        loadSecurityState();
        
        const handleUserInteraction = () => {
            setIsBotDetectionActive(true);
        };

        document.addEventListener('mousemove', handleUserInteraction);
        document.addEventListener('keypress', handleUserInteraction);
        document.addEventListener('click', handleUserInteraction);
        document.addEventListener('scroll', handleUserInteraction);

        return () => {
            document.removeEventListener('mousemove', handleUserInteraction);
            document.removeEventListener('keypress', handleUserInteraction);
            document.removeEventListener('click', handleUserInteraction);
            document.removeEventListener('scroll', handleUserInteraction);
            
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, []);

    // Save security state to localStorage whenever it changes
    useEffect(() => {
        const saveSecurityState = () => {
            const state: SecurityState = {
                failedAttempts,
                lockUntil,
                lastAttemptTime,
                email: formData.email,
                clientIP
            };
            
            try {
                localStorage.setItem('loginSecurityState', JSON.stringify(state));
            } catch (error) {
                console.error('Error saving security state:', error);
            }
        };

        saveSecurityState();
    }, [failedAttempts, lockUntil, lastAttemptTime, formData.email, clientIP]);

    // Reset security state
    const resetSecurityState = () => {
        setFailedAttempts(0);
        setLockUntil(null);
        setLastAttemptTime(null);
        setRemainingAttempts(RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL);
        setCountdown('');
        localStorage.removeItem('loginSecurityState');
        
        if (countdownRef.current) {
            clearInterval(countdownRef.current);
            countdownRef.current = null;
        }
    };

    // ✅ FIXED: Check if user is already logged in using Firebase Auth State
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log('✅ User already authenticated:', user.email);
                try {
                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    let role = 'client';
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        role = userData.role || 'client';
                    }

                    await saveUserToLocalStorage(user.uid, user.email || '', role);
                    
                    // Redirect based on role
                    if (role === 'admin') {
                        router.push('/a/dashboard');
                    } else {
                        router.push('/c/dashboard');
                    }
                } catch (error) {
                    console.error('Error checking user role:', error);
                    setError('Error loading user profile. Please try logging in again.');
                }
            } else {
                console.log('❌ No authenticated user found');
                // Clear any stale authentication data
                localStorage.removeItem('userRole');
                localStorage.removeItem('authToken');
            }
        });

        return () => unsubscribe();
    }, [router]);

    const handleChange = (field: string, value: string | boolean) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Enhanced rate limiting check
    const checkRateLimit = async (): Promise<boolean> => {
        const now = Date.now();
        
        if (lockUntil && now < lockUntil) {
            return false;
        }
        
        if (lastAttemptTime && (now - lastAttemptTime) < RATE_LIMIT_CONFIG.MIN_TIME_BETWEEN_ATTEMPTS) {
            setError('Please wait a few seconds before trying again.');
            return false;
        }

        if (!isBotDetectionActive) {
            setError('Please interact with the page before logging in.');
            return false;
        }

        const recentAttempts = getRecentAttemptsForEmail(formData.email);
        if (recentAttempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL) {
            const lockTime = Date.now() + RATE_LIMIT_CONFIG.LOCKOUT_DURATION;
            setLockUntil(lockTime);
            return false;
        }

        try {
            await checkServerRateLimit(formData.email, clientIP);
        } catch (error: any) {
            setError(error.message);
            return false;
        }

        return true;
    };

    // Get recent attempts for email from localStorage
    const getRecentAttemptsForEmail = (email: string): number => {
        try {
            const attemptsData = localStorage.getItem('loginAttempts');
            if (!attemptsData) return 0;

            const attempts: LoginAttempt[] = JSON.parse(attemptsData);
            const oneHourAgo = Date.now() - RATE_LIMIT_CONFIG.ATTEMPTS_TIME_WINDOW;
            
            return attempts.filter(attempt => 
                attempt.email === email && 
                attempt.timestamp > oneHourAgo &&
                !attempt.success
            ).length;
        } catch (error) {
            return 0;
        }
    };

    // Track login attempt in localStorage
    const trackLocalLoginAttempt = (email: string, success: boolean) => {
        try {
            const attemptsData = localStorage.getItem('loginAttempts');
            const attempts: LoginAttempt[] = attemptsData ? JSON.parse(attemptsData) : [];
            
            attempts.push({
                email,
                timestamp: Date.now(),
                success
            });
            
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const filteredAttempts = attempts.filter(attempt => attempt.timestamp > oneDayAgo);
            
            localStorage.setItem('loginAttempts', JSON.stringify(filteredAttempts));
        } catch (error) {
            console.error('Error tracking local login attempt:', error);
        }
    };

    // Server-side rate limiting check
    const checkServerRateLimit = async (email: string, ip: string): Promise<void> => {
        try {
            const oneHourAgo = new Date(Date.now() - RATE_LIMIT_CONFIG.ATTEMPTS_TIME_WINDOW);
            
            const emailAttemptsQuery = query(
                collection(db, 'loginAttempts'),
                where('email', '==', email),
                where('timestamp', '>', oneHourAgo),
                where('success', '==', false)
            );
            
            const emailAttemptsSnapshot = await getDocs(emailAttemptsQuery);
            if (emailAttemptsSnapshot.size >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL) {
                throw new Error('Too many failed attempts for this email. Please try again later.');
            }
            
            const ipAttemptsQuery = query(
                collection(db, 'loginAttempts'),
                where('ip', '==', ip),
                where('timestamp', '>', oneHourAgo),
                where('success', '==', false)
            );
            
            const ipAttemptsSnapshot = await getDocs(ipAttemptsQuery);
            if (ipAttemptsSnapshot.size >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_IP) {
                throw new Error('Too many login attempts from this network. Please try again later.');
            }
            
        } catch (error) {
            console.error('Rate limit check error:', error);
        }
    };

    // Track login attempts in Firestore
    const trackLoginAttempt = async (email: string, success: boolean, errorCode?: string) => {
        try {
            const attemptData = {
                email,
                ip: clientIP,
                success,
                errorCode: errorCode || null,
                timestamp: serverTimestamp(),
                userAgent: navigator.userAgent,
                path: window.location.pathname
            };
            
            const attemptRef = doc(collection(db, 'loginAttempts'));
            await setDoc(attemptRef, attemptData);
            
        } catch (error) {
            console.error('Error tracking login attempt:', error);
        }
    };

    const getClientIP = async (): Promise<string> => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            try {
                const response = await fetch('https://api64.ipify.org?format=json');
                const data = await response.json();
                return data.ip;
            } catch {
                return 'unknown';
            }
        }
    };

    // ✅ IMPROVED: Save user data only after successful authentication
    const saveUserToLocalStorage = async (uid: string, email: string, role: string) => {
        try {
            // Generate new user ID if not exists
            let userId = localStorage.getItem('church_appointment_userId');
            if (!userId) {
                userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem('church_appointment_userId', userId);
            }
            
            // Save authentication data
            localStorage.setItem('userRole', role);
            localStorage.setItem('authToken', 'firebase-auth-' + Date.now());
            localStorage.setItem('userEmail', email);
            localStorage.setItem('church_appointment_userEmail', email);
            localStorage.setItem('firebaseUID', uid);
            
            // Save user profile data
            const userData = {
                name: email.split('@')[0] || 'Parishioner',
                email: email,
                phone: '+639171234567',
                joinDate: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                parishionerId: `P-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`
            };
            localStorage.setItem('currentUser', JSON.stringify(userData));
            
            console.log('✅ User data saved to localStorage:', { userId, role, email, uid });
        } catch (error) {
            console.error('Error saving user to localStorage:', error);
            throw error;
        }
    };

    // ✅ IMPROVED: Redirect user after successful authentication
    const redirectUser = async (uid: string, email: string) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            let role = 'client';
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                role = userData.role || 'client';
                
                // Update last login
                await updateDoc(doc(db, 'users', uid), {
                    lastLogin: serverTimestamp(),
                    status: 'active',
                    emailVerified: true,
                    pendingVerification: false
                });
            }

            // Save to localStorage
            await saveUserToLocalStorage(uid, email, role);

            // Redirect based on role
            if (role === 'admin') {
                console.log('🔄 Redirecting to admin dashboard');
                router.push('/a/dashboard');
            } else {
                console.log('🔄 Redirecting to client dashboard');
                router.push('/c/dashboard');
            }
        } catch (error) {
            console.error('Error redirecting user:', error);
            setError('Error loading user profile. Using default access.');
            // Fallback: save basic user data and redirect to client dashboard
            await saveUserToLocalStorage(uid, email, 'client');
            router.push('/c/dashboard');
        }
    };

    // ✅ IMPROVED: Main login handler
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        
        if (!await checkRateLimit()) {
            return;
        }
        
        setLastAttemptTime(Date.now());
        setLoading(true);

        try {
            console.log('🔄 Attempting Firebase authentication...');
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            
            // Reset security state on successful login
            resetSecurityState();
            
            // Track successful attempt
            await trackLoginAttempt(formData.email, true);
            trackLocalLoginAttempt(formData.email, true);
            
            const user = userCredential.user;
            console.log('✅ Firebase login successful:', { 
                uid: user.uid, 
                email: user.email,
                emailVerified: user.emailVerified 
            });
            
            // Handle email verification if needed
            if (!user.emailVerified) {
                console.log('📧 Auto-verifying email for user:', user.email);
                try {
                    await updateDoc(doc(db, 'users', user.uid), {
                        emailVerified: true,
                        pendingVerification: false,
                        lastLogin: serverTimestamp()
                    });
                } catch (updateError) {
                    console.log('Note: User document might not exist yet, continuing login...');
                }
            }
            
            // Redirect user
            await redirectUser(user.uid, user.email || formData.email);
            
        } catch (err: any) {
            console.error('❌ Login error:', err.code, err.message);
            
            // Track failed attempt
            await trackLoginAttempt(formData.email, false, err.code);
            trackLocalLoginAttempt(formData.email, false);
            
            const newFailedAttempts = failedAttempts + 1;
            setFailedAttempts(newFailedAttempts);
            const attemptsRemaining = RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL - newFailedAttempts;
            setRemainingAttempts(attemptsRemaining);
            
            if (newFailedAttempts >= RATE_LIMIT_CONFIG.MAX_ATTEMPTS_PER_EMAIL) {
                const lockTime = Date.now() + RATE_LIMIT_CONFIG.LOCKOUT_DURATION;
                setLockUntil(lockTime);
            } else if (err.code === 'auth/multi-factor-auth-required') {
                const resolver = getMultiFactorResolver(auth, err);
                setMfaResolver(resolver);
                setShowMfaInput(true);
            } else {
                const messages: { [key: string]: string } = {
                    'auth/invalid-email': 'Please enter a valid email address.',
                    'auth/user-not-found': 'No account found with this email.',
                    'auth/wrong-password': `Invalid password. ${attemptsRemaining} attempts remaining.`,
                    'auth/too-many-requests': 'Too many attempts. Try again later.',
                    'auth/invalid-credential': `Invalid email or password. ${attemptsRemaining} attempts remaining.`,
                    'auth/user-disabled': 'This account has been disabled.',
                    'auth/network-request-failed': 'Network error. Please check your connection.',
                };
                setError(messages[err.code] || `Login failed. ${attemptsRemaining} attempts remaining.`);
            }
            setLoading(false);
        }
    };

    // Forgot Password Handler
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setResetLoading(true);

        if (!resetEmail) {
            setError('Please enter your email address');
            setResetLoading(false);
            return;
        }

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            
            try {
                const resetRequestRef = doc(db, 'passwordResetRequests', `${resetEmail}_${Date.now()}`);
                await setDoc(resetRequestRef, {
                    email: resetEmail,
                    requestedAt: serverTimestamp(),
                    status: 'sent',
                    ipAddress: clientIP,
                    userAgent: navigator.userAgent
                });
                console.log('✅ Password reset request saved to database');
            } catch (dbError) {
                console.error('Error saving reset request to database:', dbError);
            }
            
            // Mark as email sent - disable editing
            setEmailSent(true);
            setSuccess('Password reset email sent! Please check your inbox AND spam folder for the reset link. The link will expire in 1 hour.');
            
        } catch (err: any) {
            console.error('Password reset error:', err);
            const messages: { [key: string]: string } = {
                'auth/invalid-email': 'Please enter a valid email address.',
                'auth/user-not-found': 'No account found with this email.',
                'auth/too-many-requests': 'Too many attempts. Please try again later.',
            };
            setError(messages[err.code] || 'Failed to send reset email. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const handleMfaSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const totpFactor = mfaResolver.hints.find(
                (hint: any) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID
            );

            if (!totpFactor) {
                setError('TOTP authentication not available.');
                setLoading(false);
                return;
            }

            const multiFactorAssertion = TotpMultiFactorGenerator.assertionForSignIn(
                totpFactor.uid,
                totpCode
            );

            const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion);
            
            resetSecurityState();
            
            const user = userCredential.user;
            
            if (!user.emailVerified) {
                console.log('📧 Auto-verifying email for MFA user:', user.email);
                try {
                    await updateDoc(doc(db, 'users', user.uid), {
                        emailVerified: true,
                        pendingVerification: false,
                        lastLogin: serverTimestamp()
                    });
                } catch (updateError) {
                    console.log('Note: User document might not exist yet, continuing login...');
                }
            }

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
        setShowForgotPassword(false);
        setMfaResolver(null);
        setTotpCode('');
        setError('');
        setSuccess('');
        setResetEmail('');
        setEmailSent(false);
    };

    // Check if currently locked out
    const isLockedOut = lockUntil && Date.now() < lockUntil;

    // Security status display with real-time countdown
    const renderSecurityStatus = () => {
        if (failedAttempts === 0 && !isLockedOut) return null;
        
        if (isLockedOut) {
            return (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold text-red-800 text-sm">Account Temporarily Locked</span>
                            </div>
                            <div className="flex items-center gap-2 text-red-700 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>Too many failed attempts. Please try again in:</span>
                                <span className="font-mono font-bold text-red-800 bg-red-100 px-2 py-1 rounded text-xs">
                                    {countdown || '00:00'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        
        const securityLevel = failedAttempts >= 3 ? 'high' : failedAttempts >= 1 ? 'medium' : 'low';
        const colors = {
            low: 'text-yellow-600 bg-yellow-50 border-yellow-200',
            medium: 'text-orange-600 bg-orange-50 border-orange-200',
            high: 'text-red-600 bg-red-50 border-red-200'
        };

        return (
            <div className={`p-3 border rounded-lg text-sm ${colors[securityLevel]}`}>
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="font-medium">Security Notice:</span>
                    <span>{failedAttempts} failed attempt(s)</span>
                    {remainingAttempts > 0 && (
                        <span className="ml-auto font-medium">
                            {remainingAttempts} attempts remaining
                        </span>
                    )}
                </div>
            </div>
        );
    };

    // Forgot Password Screen
    if (showForgotPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-lg text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <LockKeyhole className="w-7 h-7" />
                            <h1 className="text-2xl font-bold">
                                {emailSent ? 'Check Your Email' : 'Reset Password'}
                            </h1>
                        </div>
                        <p className="text-lg opacity-90">
                            {emailSent ? 'We sent you a reset link' : 'We\'ll send you a reset link'}
                        </p>
                    </CardHeader>

                    <CardContent className="p-6">
                        {!emailSent ? (
                            <form onSubmit={handleForgotPassword} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="resetEmail" className="text-sm font-medium">
                                        Email Address
                                    </Label>
                                    <Input
                                        id="resetEmail"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        required
                                        disabled={resetLoading}
                                        autoComplete="email"
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Enter your email address and we'll send you a password reset link.
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                        {error}
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                    disabled={resetLoading || !resetEmail}
                                >
                                    {resetLoading ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <MailCheck className="mr-2 h-4 w-4" />
                                            Send Reset Link
                                        </>
                                    )}
                                </Button>

                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleBackToLogin}
                                    disabled={resetLoading}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Back to Login
                                </Button>
                            </form>
                        ) : (
                            <div className="space-y-5">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <MailCheck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <h4 className="font-semibold text-green-800 text-sm mb-1">
                                                Check Your Email!
                                            </h4>
                                            <p className="text-green-700 text-sm">
                                                {success}
                                            </p>
                                            <div className="mt-2 p-3 bg-green-100 rounded border border-green-200">
                                                <p className="text-xs font-medium text-green-800 mb-1">
                                                    📧 Important:
                                                </p>
                                                <ul className="text-xs text-green-700 space-y-1">
                                                    <li>• Check your <strong>Spam</strong> or <strong>Junk</strong> folder</li>
                                                    <li>• The reset link expires in 1 hour</li>
                                                    <li>• Click the link in the email to continue</li>
                                                    <li>• Email sent to: <strong>{resetEmail}</strong></li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-center justify-center gap-2 mb-2">
                                        <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
                                        <span className="text-sm font-medium text-blue-800">
                                            Waiting for you to check your email...
                                        </span>
                                    </div>
                                    <p className="text-xs text-blue-600">
                                        Once you click the reset link in your email, you can set a new password.
                                    </p>
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={handleBackToLogin}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back to Login
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setEmailSent(false);
                                            setResetEmail('');
                                            setSuccess('');
                                        }}
                                    >
                                        Try Different Email
                                    </Button>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-yellow-800 mb-2 text-sm">
                                        Didn't receive the email?
                                    </h3>
                                    <ul className="space-y-1 text-xs text-yellow-700">
                                        <li>• Wait a few minutes - emails can take 1-5 minutes</li>
                                        <li>• Check your spam or junk folder</li>
                                        <li>• Make sure you entered the correct email address</li>
                                        <li>• Try again in a few minutes if needed</li>
                                    </ul>
                                </div>
                            </div>
                        )}
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
                    <CardHeader className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-t-lg text-primary-foreground">
                        <div className="flex items-center gap-3 mb-2">
                            <Church className="w-7 h-7" />
                            <h1 className="text-2xl font-bold">Two-Factor Authentication</h1>
                        </div>
                        <p className="text-lg opacity-90">Enter your verification code</p>
                    </CardHeader>

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

                            {error && (
                                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading || totpCode.length !== 6}
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify & Continue'
                                )}
                            </Button>

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
                <CardHeader className="bg-gradient-to-r from-primary to-primary/90 p-6 rounded-t-lg text-primary-foreground">
                    <div className="flex items-center gap-3 mb-2">
                        <Church className="w-7 h-7" />
                        <h1 className="text-2xl font-bold">Holy Events</h1>
                    </div>
                    <p className="text-lg opacity-90">Secure Login Portal</p>
                </CardHeader>

                <CardContent className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Security Status with Real-time Countdown */}
                        {renderSecurityStatus()}

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
                                disabled={loading || isLockedOut || false}
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    required
                                    disabled={loading || isLockedOut || false}
                                    autoComplete="current-password"
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                    disabled={loading || isLockedOut || false}
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Checkbox
                                    checked={formData.rememberMe}
                                    onCheckedChange={(checked) =>
                                        handleChange('rememberMe', checked as boolean)
                                    }
                                    disabled={loading || isLockedOut || false}
                                />
                                <span>Remember me</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-primary hover:underline font-medium"
                                disabled={loading || isLockedOut || false}
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Success Message */}
                        {success && (
                            <div className="p-3 bg-green-100 border border-green-300 text-green-700 rounded text-sm">
                                {success}
                            </div>
                        )}

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
                            disabled={loading || isLockedOut || false}
                        >
                            {loading ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : isLockedOut ? (
                                <>
                                    <Clock className="mr-2 h-4 w-4" />
                                    Locked ({countdown})
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </Button>

                        {/* Security Footer */}
                        <div className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">
                                Don't have an account?{' '}
                                <a
                                    href="/register"
                                    className="font-medium text-primary hover:underline"
                                >
                                    Register here
                                </a>
                            </p>
                            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                <Shield className="w-3 h-3" />
                                <span>Protected by advanced security measures</span>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );  
};

export default LoginPage;