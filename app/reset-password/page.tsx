'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase-config';
import { LockKeyhole, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';

// Main component that uses useSearchParams
function ResetPassContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loadState, setLoadState] = useState(false);
    const [errState, setErrState] = useState('');
    const [sucState, setSucState] = useState('');
    const [verState, setVerState] = useState(false);
    const [mailUser, setMailUser] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [showConfPass, setShowConfPass] = useState(false);

    const [formInfo, setFormInfo] = useState({
        password: '',
        confirmPass: '',
    });

    const oobCode = searchParams.get('oobCode');

    useEffect(() => {
        if (oobCode) {
            verifyResetCode(oobCode);
        } else {
            setErrState('Invalid or missing reset link. Please request a new password reset.');
        }
    }, [oobCode]);

    const verifyResetCode = async (code: string) => {
        try {
            setLoadState(true);
            const emailAddr = await verifyPasswordResetCode(auth, code);
            setMailUser(emailAddr);
            setVerState(true);
            setErrState('');
        } catch (error: any) {
            console.error('Reset code verification failed:', error);
            setErrState('Invalid or expired reset link. Please request a new password reset.');
            setVerState(false);
        } finally {
            setLoadState(false);
        }
    };

    const validatePassword = (password: string) => {
        const hasSpecialChar = /[@$!%*?&_-]/.test(password);
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        
        if (!hasMinLength) {
            return 'Password must be at least 8 characters long.';
        }
        if (!hasUpperCase) {
            return 'Password must contain at least one uppercase letter.';
        }
        if (!hasLowerCase) {
            return 'Password must contain at least one lowercase letter.';
        }
        if (!hasNumbers) {
            return 'Password must contain at least one number.';
        }
        if (!hasSpecialChar) {
            return 'Password must contain at least one special character: @$!%*?&_-';
        }
        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrState('');
        setSucState('');

        if (!oobCode) {
            setErrState('Invalid reset link.');
            return;
        }

        if (formInfo.password !== formInfo.confirmPass) {
            setErrState('Passwords do not match.');
            return;
        }

        const passwordError = validatePassword(formInfo.password);
        if (passwordError) {
            setErrState(passwordError);
            return;
        }

        setLoadState(true);

        try {
            await confirmPasswordReset(auth, oobCode, formInfo.password);
            
            setSucState('Password successfully reset! Redirecting to login...');
            
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (error: any) {
            console.error('Password reset failed:', error);
            
            const errMessages: { [key: string]: string } = {
                'auth/expired-action-code': 'Reset link has expired. Please request a new one.',
                'auth/invalid-action-code': 'Invalid reset link. Please request a new one.',
                'auth/user-disabled': 'This account has been disabled.',
                'auth/user-not-found': 'No account found with this email.',
                'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
            };
            
            setErrState(errMessages[error.code] || 'Failed to reset password. Please try again.');
        } finally {
            setLoadState(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormInfo(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Check password strength
    const getPasswordStrength = (password: string) => {
        const hasSpecialChar = /[@$!%*?&_-]/.test(password);
        const hasMinLength = password.length >= 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /[0-9]/.test(password);
        
        const requirementsMet = [hasMinLength, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
        return {
            strength: requirementsMet,
            total: 5,
            hasSpecialChar,
            hasMinLength,
            hasUpperCase,
            hasLowerCase,
            hasNumbers
        };
    };

    const passStrength = getPasswordStrength(formInfo.password);

    if (!oobCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="p-6">
                        <div className="text-center space-y-4">
                            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                            <h2 className="text-2xl font-bold text-red-600">Invalid Reset Link</h2>
                            <p className="text-muted-foreground">
                                This password reset link is invalid or has expired.
                            </p>
                            <Button onClick={() => router.push('/login')}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Login
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="bg-gradient-to-r from-sky-400 to-sky-600 p-6 rounded-t-lg text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <LockKeyhole className="w-7 h-7" />
                        <h1 className="text-2xl font-bold">
                            {sucState ? 'Password Reset Successful!' : 'Set New Password'}
                        </h1>
                    </div>
                    <p className="text-lg opacity-90">
                        {sucState ? 'Your password has been updated' : 'Create your new password'}
                    </p>
                </CardHeader>

                <CardContent className="p-6">
                    {sucState ? (
                        <div className="space-y-4 text-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                            <p className="text-green-700 font-medium">{sucState}</p>
                            <p className="text-sm text-muted-foreground">
                                Redirecting to login page...
                            </p>
                            <Button 
                                onClick={() => router.push('/login')}
                                className="w-full"
                            >
                                Go to Login Now
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {verState && mailUser && (
                                <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
                                    <p className="text-sm text-sky-700">
                                        <strong>Resetting password for:</strong> {mailUser}
                                    </p>
                                </div>
                            )}

                            {errState && (
                                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                    {errState}
                                </div>
                            )}

                            {!verState && !errState && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-700 text-center">
                                        Verifying reset link...
                                    </p>
                                </div>
                            )}

                            {verState && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPass ? "text" : "password"}
                                                placeholder="Enter new password"
                                                value={formInfo.password}
                                                onChange={(e) => handleChange('password', e.target.value)}
                                                required
                                                disabled={loadState}
                                                minLength={8}
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(!showPass)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                disabled={loadState}
                                            >
                                                {showPass ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        
                                        {/* Password Requirements */}
                                        <div className="space-y-1 text-xs">
                                            <div className={`flex items-center gap-2 ${passStrength.hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passStrength.hasMinLength ? '✓' : '○'} At least 8 characters
                                            </div>
                                            <div className={`flex items-center gap-2 ${passStrength.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passStrength.hasUpperCase ? '✓' : '○'} At least one uppercase letter
                                            </div>
                                            <div className={`flex items-center gap-2 ${passStrength.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passStrength.hasLowerCase ? '✓' : '○'} At least one lowercase letter
                                            </div>
                                            <div className={`flex items-center gap-2 ${passStrength.hasNumbers ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passStrength.hasNumbers ? '✓' : '○'} At least one number
                                            </div>
                                            <div className={`flex items-center gap-2 ${passStrength.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                                                {passStrength.hasSpecialChar ? '✓' : '○'} At least one special character (@$!%*?&_-)
                                            </div>
                                        </div>

                                        {/* Password Strength Indicator */}
                                        {formInfo.password && (
                                            <div className="mt-2">
                                                <div className="flex gap-1 mb-1">
                                                    {[1, 2, 3, 4, 5].map((index) => (
                                                        <div
                                                            key={index}
                                                            className={`h-2 flex-1 rounded ${
                                                                index <= passStrength.strength
                                                                    ? passStrength.strength >= 4
                                                                        ? 'bg-green-500'
                                                                        : passStrength.strength >= 3
                                                                        ? 'bg-yellow-500'
                                                                        : passStrength.strength >= 2
                                                                        ? 'bg-orange-500'
                                                                        : 'bg-red-500'
                                                                    : 'bg-gray-200'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-xs text-gray-500">
                                                    Password strength: {passStrength.strength}/5
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPass">Confirm New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirmPass"
                                                type={showConfPass ? "text" : "password"}
                                                placeholder="Confirm new password"
                                                value={formInfo.confirmPass}
                                                onChange={(e) => handleChange('confirmPass', e.target.value)}
                                                required
                                                disabled={loadState}
                                                minLength={8}
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfPass(!showConfPass)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                disabled={loadState}
                                            >
                                                {showConfPass ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        {formInfo.confirmPass && formInfo.password !== formInfo.confirmPass && (
                                            <p className="text-xs text-red-500">Passwords do not match</p>
                                        )}
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                                        disabled={loadState || !formInfo.password || !formInfo.confirmPass || passStrength.strength < 5}
                                    >
                                        {loadState ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Resetting Password...
                                            </>
                                        ) : (
                                            'Reset Password'
                                        )}
                                    </Button>
                                </>
                            )}

                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => router.push('/login')}
                                disabled={loadState}
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Login
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// Loading component
function ResetPassLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardContent className="p-6">
                    <div className="text-center space-y-4">
                        <Loader2 className="w-16 h-16 text-sky-500 mx-auto animate-spin" />
                        <h2 className="text-2xl font-bold text-sky-600">Loading</h2>
                        <p className="text-muted-foreground">
                            Preparing password reset...
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Main page component with Suspense
export default function ResetPassPage() {
    return (
        <Suspense fallback={<ResetPassLoading />}>
            <ResetPassContent />
        </Suspense>
    );
}