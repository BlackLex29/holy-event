'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Church, RefreshCw, Eye, EyeOff, ArrowLeft, MailCheck, LockKeyhole } from 'lucide-react';
import {
    signInWithEmailAndPassword,
    getMultiFactorResolver,
    TotpMultiFactorGenerator,
    signOut,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset
} from 'firebase/auth';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';

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
    const [resetStep, setResetStep] = useState<'email' | 'code' | 'newPassword'>('email');
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        rememberMe: false,
    });

    // Check URL parameters for password reset mode
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        const oobCode = urlParams.get('oobCode');
        
        if (mode === 'resetPassword' && oobCode) {
            setResetStep('code');
            setResetCode(oobCode);
            setShowForgotPassword(true);
            handleVerifyResetCode(oobCode);
        }
    }, []);

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
                    // Auto-verify email upon successful login
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const userCredential = await signInWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );
            
            const user = userCredential.user;
            console.log('✅ Firebase login successful:', { uid: user.uid, email: user.email });
            
            // Auto-verify email upon successful login
            if (!user.emailVerified) {
                console.log('📧 Auto-verifying email for user:', user.email);
                // Update Firestore to mark email as verified
                try {
                    await updateDoc(doc(db, 'users', user.uid), {
                        emailVerified: true,
                        pendingVerification: false,
                        lastLogin: new Date()
                    });
                } catch (updateError) {
                    console.log('Note: User document might not exist yet, continuing login...');
                }
            }
            
            // Proceed to redirect
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
                };
                setError(messages[err.code] || err.message || 'Login failed');
                setLoading(false);
            }
        }
    };

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
            
            // Save password reset request to database
            try {
                const resetRequestRef = doc(db, 'passwordResetRequests', `${resetEmail}_${Date.now()}`);
                await setDoc(resetRequestRef, {
                    email: resetEmail,
                    requestedAt: serverTimestamp(),
                    status: 'sent',
                    ipAddress: await getClientIP(),
                    userAgent: navigator.userAgent
                });
                console.log('✅ Password reset request saved to database');
            } catch (dbError) {
                console.error('Error saving reset request to database:', dbError);
                // Continue even if database save fails
            }
            
            setSuccess('Password reset email sent! Check your inbox and spam folder.');
            setResetEmail('');
            setResetStep('code');
            
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

    const handleVerifyResetCode = async (code: string) => {
        setResetLoading(true);
        setError('');
        
        try {
            const email = await verifyPasswordResetCode(auth, code);
            setResetEmail(email);
            setSuccess('Reset code verified! Please set your new password.');
            setResetStep('newPassword');
        } catch (err: any) {
            console.error('Reset code verification error:', err);
            const messages: { [key: string]: string } = {
                'auth/expired-action-code': 'Reset link has expired. Please request a new one.',
                'auth/invalid-action-code': 'Invalid reset link. Please request a new one.',
                'auth/user-disabled': 'This account has been disabled.',
                'auth/user-not-found': 'No account found with this email.',
            };
            setError(messages[err.code] || 'Invalid or expired reset link. Please request a new one.');
        } finally {
            setResetLoading(false);
        }
    };

    const handlePasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResetLoading(true);

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            setResetLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            setResetLoading(false);
            return;
        }

        try {
            // Confirm password reset
            await confirmPasswordReset(auth, resetCode, newPassword);
            
            // Save password change to database
            try {
                const passwordChangeRef = doc(db, 'passwordChanges', `${resetEmail}_${Date.now()}`);
                await setDoc(passwordChangeRef, {
                    email: resetEmail,
                    changedAt: serverTimestamp(),
                    status: 'completed',
                    ipAddress: await getClientIP(),
                    userAgent: navigator.userAgent
                });
                
                // Also update user's last password change timestamp
                const userQuery = await getDoc(doc(db, 'users', await getUserIdByEmail(resetEmail)));
                if (userQuery.exists()) {
                    await updateDoc(doc(db, 'users', await getUserIdByEmail(resetEmail)), {
                        lastPasswordChange: serverTimestamp(),
                        passwordUpdatedAt: new Date().toISOString()
                    });
                }
                
                console.log('✅ Password change recorded in database');
            } catch (dbError) {
                console.error('Error saving password change to database:', dbError);
                // Continue even if database save fails
            }
            
            setSuccess('Password reset successful! You can now login with your new password.');
            
            // Auto-redirect back to login after 3 seconds
            setTimeout(() => {
                setShowForgotPassword(false);
                setResetStep('email');
                setNewPassword('');
                setConfirmPassword('');
            }, 3000);
            
        } catch (err: any) {
            console.error('Password reset error:', err);
            const messages: { [key: string]: string } = {
                'auth/expired-action-code': 'Reset link has expired. Please request a new one.',
                'auth/invalid-action-code': 'Invalid reset link. Please request a new one.',
                'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
                'auth/user-disabled': 'This account has been disabled.',
            };
            setError(messages[err.code] || 'Failed to reset password. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    const getClientIP = async (): Promise<string> => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            return 'unknown';
        }
    };

    const getUserIdByEmail = async (email: string): Promise<string> => {
        try {
            // This is a simplified approach - in a real app, you might have a different way to get user ID by email
            const usersSnapshot = await getDoc(doc(db, 'users', email)); // Adjust based on your user structure
            if (usersSnapshot.exists()) {
                return usersSnapshot.id;
            }
            return email; // Fallback to using email as ID
        } catch (error) {
            return email;
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
            
            // Auto-verify email for MFA flow too
            if (!user.emailVerified) {
                console.log('📧 Auto-verifying email for MFA user:', user.email);
                try {
                    await updateDoc(doc(db, 'users', user.uid), {
                        emailVerified: true,
                        pendingVerification: false,
                        lastLogin: new Date()
                    });
                } catch (updateError) {
                    console.log('Note: User document might not exist yet, continuing login...');
                }
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
        setShowForgotPassword(false);
        setMfaResolver(null);
        setTotpCode('');
        setError('');
        setSuccess('');
        setResetEmail('');
        setResetStep('email');
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
    };

    // Forgot Password Screens
    if (showForgotPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    {/* Header */}
                    <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-t-lg text-white">
                        <div className="flex items-center gap-3 mb-2">
                            <LockKeyhole className="w-7 h-7" />
                            <h1 className="text-2xl font-bold">
                                {resetStep === 'email' && 'Reset Password'}
                                {resetStep === 'code' && 'Verify Reset Code'}
                                {resetStep === 'newPassword' && 'Set New Password'}
                            </h1>
                        </div>
                        <p className="text-lg opacity-90">
                            {resetStep === 'email' && "We'll send you a reset link"}
                            {resetStep === 'code' && 'Verify your reset code'}
                            {resetStep === 'newPassword' && 'Create your new password'}
                        </p>
                    </CardHeader>

                    <CardContent className="p-6">
                        {/* Step 1: Email Input */}
                        {resetStep === 'email' && (
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

                                {/* Back Button */}
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

                                {/* Help Text */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-blue-800 mb-2 text-sm">
                                        What happens next?
                                    </h3>
                                    <ul className="space-y-1 text-xs text-blue-700">
                                        <li>• Check your email inbox for a password reset link</li>
                                        <li>• The link will expire in 1 hour for security</li>
                                        <li>• If you don't see the email, check your spam folder</li>
                                        <li>• The email comes from Firebase (noreply@firebaseapp.com)</li>
                                    </ul>
                                </div>
                            </form>
                        )}

                        {/* Step 2: Code Verification */}
                        {resetStep === 'code' && (
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Verification Code
                                    </Label>
                                    <Input
                                        type="text"
                                        placeholder="Enter reset code from email"
                                        value={resetCode}
                                        onChange={(e) => setResetCode(e.target.value)}
                                        required
                                        disabled={resetLoading}
                                    />
                                    <p className="text-sm text-muted-foreground">
                                        Enter the reset code sent to your email, or click the link in your email.
                                    </p>
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

                                <div className="flex gap-3">
                                    <Button
                                        onClick={() => handleVerifyResetCode(resetCode)}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        disabled={resetLoading || !resetCode}
                                    >
                                        {resetLoading ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Verifying...
                                            </>
                                        ) : (
                                            'Verify Code'
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setResetStep('email')}
                                        disabled={resetLoading}
                                    >
                                        Back
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: New Password */}
                        {resetStep === 'newPassword' && (
                            <form onSubmit={handlePasswordReset} className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword" className="text-sm font-medium">
                                        New Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="newPassword"
                                            type={showNewPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            disabled={resetLoading}
                                            autoComplete="new-password"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showNewPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword" className="text-sm font-medium">
                                        Confirm New Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            disabled={resetLoading}
                                            autoComplete="new-password"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
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

                                <div className="flex gap-3">
                                    <Button
                                        type="submit"
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                        disabled={resetLoading || !newPassword || !confirmPassword}
                                    >
                                        {resetLoading ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Resetting...
                                            </>
                                        ) : (
                                            <>
                                                <LockKeyhole className="mr-2 h-4 w-4" />
                                                Reset Password
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setResetStep('code')}
                                        disabled={resetLoading}
                                    >
                                        Back
                                    </Button>
                                </div>

                                {/* Password Requirements */}
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                    <h3 className="font-semibold text-gray-800 mb-2 text-sm">
                                        Password Requirements:
                                    </h3>
                                    <ul className="space-y-1 text-xs text-gray-700">
                                        <li>• At least 6 characters long</li>
                                        <li>• Use a combination of letters and numbers</li>
                                        <li>• Avoid common passwords</li>
                                    </ul>
                                </div>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        );
    }

    // MFA Screen (unchanged)
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
                                {loading ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    'Verify & Continue'
                                )}
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

    // Main Login Screen (unchanged)
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
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => handleChange('password', e.target.value)}
                                    required
                                    disabled={loading}
                                    autoComplete="current-password"
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
                                    disabled={loading}
                                />
                                <span>Remember me</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => setShowForgotPassword(true)}
                                className="text-primary hover:underline font-medium"
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