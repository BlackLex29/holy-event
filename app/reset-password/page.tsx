'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '@/lib/firebase-config';
import { LockKeyhole, CheckCircle, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const ResetPasswordPage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [verified, setVerified] = useState(false);
    const [email, setEmail] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: '',
    });

    const oobCode = searchParams.get('oobCode');

    useEffect(() => {
        if (oobCode) {
            verifyResetCode(oobCode);
        } else {
            setError('Invalid or missing reset link. Please request a new password reset.');
        }
    }, [oobCode]);

    const verifyResetCode = async (code: string) => {
        try {
            setLoading(true);
            const email = await verifyPasswordResetCode(auth, code);
            setEmail(email);
            setVerified(true);
            setError('');
        } catch (err: any) {
            console.error('Reset code verification failed:', err);
            setError('Invalid or expired reset link. Please request a new password reset.');
            setVerified(false);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!oobCode) {
            setError('Invalid reset link.');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);

        try {
            // Confirm password reset
            await confirmPasswordReset(auth, oobCode, formData.password);
            
            setSuccess('Password successfully reset! Redirecting to login...');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                router.push('/login');
            }, 3000);

        } catch (err: any) {
            console.error('Password reset failed:', err);
            
            const messages: { [key: string]: string } = {
                'auth/expired-action-code': 'Reset link has expired. Please request a new one.',
                'auth/invalid-action-code': 'Invalid reset link. Please request a new one.',
                'auth/user-disabled': 'This account has been disabled.',
                'auth/user-not-found': 'No account found with this email.',
                'auth/weak-password': 'Password is too weak. Please choose a stronger password.',
            };
            
            setError(messages[err.code] || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field: string, value: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

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
                <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-lg text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <LockKeyhole className="w-7 h-7" />
                        <h1 className="text-2xl font-bold">
                            {success ? 'Password Reset Successful!' : 'Set New Password'}
                        </h1>
                    </div>
                    <p className="text-lg opacity-90">
                        {success ? 'Your password has been updated' : 'Create your new password'}
                    </p>
                </CardHeader>

                <CardContent className="p-6">
                    {success ? (
                        <div className="space-y-4 text-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                            <p className="text-green-700 font-medium">{success}</p>
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
                            {verified && email && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-700">
                                        <strong>Resetting password for:</strong> {email}
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                    {error}
                                </div>
                            )}

                            {!verified && !error && (
                                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <p className="text-sm text-yellow-700 text-center">
                                        Verifying reset link...
                                    </p>
                                </div>
                            )}

                            {verified && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="password"
                                                type={showPassword ? "text" : "password"}
                                                placeholder="Enter new password"
                                                value={formData.password}
                                                onChange={(e) => handleChange('password', e.target.value)}
                                                required
                                                disabled={loading}
                                                minLength={6}
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                disabled={loading}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Must be at least 6 characters long
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                                        <div className="relative">
                                            <Input
                                                id="confirmPassword"
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm new password"
                                                value={formData.confirmPassword}
                                                onChange={(e) => handleChange('confirmPassword', e.target.value)}
                                                required
                                                disabled={loading}
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                                disabled={loading}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full bg-green-600 hover:bg-green-700"
                                        disabled={loading || !formData.password || !formData.confirmPassword}
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
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
                                disabled={loading}
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
};

export default ResetPasswordPage;