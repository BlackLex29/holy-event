'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, Copy } from 'lucide-react';
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    multiFactor,
    TotpMultiFactorGenerator,
    onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';

// Simple QR Code component fallback
const QRCodeFallback = ({ value, size }: { value: string; size: number }) => {
    return (
        <div className="border-2 border-dashed border-gray-300 p-4 text-center" style={{ width: size, height: size }}>
            <p className="text-sm text-muted-foreground">QR Code: {value.substring(0, 50)}...</p>
            <p className="text-xs text-muted-foreground mt-2">Install QR scanner to view</p>
        </div>
    );
};

// Dynamic import for QR Code
const QRCodeSVG = dynamic(() => import('qrcode.react').then(mod => mod.QRCodeSVG), {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted" style={{ width: 192, height: 192 }} />
});

import dynamic from 'next/dynamic';

/* -------------------------------------------------------------
   Component
   ------------------------------------------------------------- */
const AdminSettingsPage = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [user, setUser] = useState(auth.currentUser);

    // ── Profile ───────────────────────────────────────
    const [profile, setProfile] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
    });

    const [originalProfile, setOriginalProfile] = useState({
        fullName: '',
        phoneNumber: '',
        address: '',
    });

    // ── Password ───────────────────────────────────────
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    });

    // ── TOTP ───────────────────────────────────────────
    const [totpSecret, setTotpSecret] = useState<any>(null);
    const [totpCode, setTotpCode] = useState('');
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [verifyingTotp, setVerifyingTotp] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    /* -------------------------------------------------------------
       Load profile + MFA status
       ------------------------------------------------------------- */
    useEffect(() => {
        if (!user) return;
        const load = async () => {
            try {
                const snap = await getDoc(doc(db, 'users', user.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    const profileData = {
                        fullName: d.fullName ?? '',
                        phoneNumber: d.phoneNumber ?? '',
                        address: d.address ?? '',
                    };
                    setProfile(profileData);
                    setOriginalProfile(profileData);
                }
                
                // Check MFA status
                try {
                    const mfa = multiFactor(user);
                    const hasTotp = mfa.enrolledFactors.some(
                        (f: any) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
                    );
                    setTotpEnabled(hasTotp);
                } catch (mfaError) {
                    console.log('MFA not configured:', mfaError);
                    setTotpEnabled(false);
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
                setError('Failed to load settings.');
            }
        };
        load();
    }, [user]);

    /* -------------------------------------------------------------
       UI helpers
       ------------------------------------------------------------- */
    const showMessage = (msg: string, isError = false) => {
        if (isError) {
            setError(msg);
            setSuccess('');
        } else {
            setSuccess(msg);
            setError('');
        }
        setTimeout(() => {
            setError('');
            setSuccess('');
        }, 4000);
    };

    /* -------------------------------------------------------------
       Check if profile has changes
       ------------------------------------------------------------- */
    const hasProfileChanges = () => {
        return (
            profile.fullName !== originalProfile.fullName ||
            profile.phoneNumber !== originalProfile.phoneNumber ||
            profile.address !== originalProfile.address
        );
    };

    /* -------------------------------------------------------------
       Profile update - only if changes detected
       ------------------------------------------------------------- */
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        if (!hasProfileChanges()) {
            showMessage('No changes detected.', true);
            return;
        }

        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                fullName: profile.fullName,
                phoneNumber: profile.phoneNumber,
                address: profile.address,
                updatedAt: new Date(),
            });
            setOriginalProfile({ ...profile });
            showMessage('Profile updated successfully!');
        } catch (err: any) {
            showMessage(err.message || 'Failed to update profile', true);
        } finally {
            setLoading(false);
        }
    };

    /* -------------------------------------------------------------
       Password change (with re‑auth)
       ------------------------------------------------------------- */
    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        
        if (!passwords.current || !passwords.new || !passwords.confirm) {
            showMessage('Please fill in all password fields.', true);
            return;
        }
        
        if (passwords.new !== passwords.confirm) {
            showMessage('Passwords do not match.', true);
            return;
        }
        
        if (passwords.new === passwords.current) {
            showMessage('New password must be different from current password.', true);
            return;
        }

        if (passwords.new.length < 6) {
            showMessage('New password must be at least 6 characters.', true);
            return;
        }

        setLoading(true);
        try {
            const cred = EmailAuthProvider.credential(user.email!, passwords.current);
            await reauthenticateWithCredential(user, cred);
            await updatePassword(user, passwords.new);
            showMessage('Password changed successfully!');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err: any) {
            if (err.code === 'auth/wrong-password') {
                showMessage('Current password is incorrect.', true);
            } else if (err.code === 'auth/requires-recent-login') {
                showMessage('Please log in again to change your password.', true);
            } else {
                showMessage(err.message || 'Password change failed.', true);
            }
        } finally {
            setLoading(false);
        }
    };

    /* -------------------------------------------------------------
       Enable TOTP – generate secret
       ------------------------------------------------------------- */
    const enableTOTP = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const mfa = multiFactor(user);
            const session = await mfa.getSession();
            const secret = await TotpMultiFactorGenerator.generateSecret(session);
            setTotpSecret(secret);
            showMessage('Scan the QR code below with your authenticator app.');
        } catch (err: any) {
            showMessage(err.message || 'Failed to enable 2FA', true);
        } finally {
            setLoading(false);
        }
    };

    /* -------------------------------------------------------------
       Verify TOTP code
       ------------------------------------------------------------- */
    const verifyTOTP = async () => {
        if (!user || !totpSecret) return;
        setVerifyingTotp(true);
        try {
            const mfa = multiFactor(user);
            const assertion = TotpMultiFactorGenerator.assertionForEnrollment(
                totpSecret,
                totpCode
            );
            await mfa.enroll(assertion, 'TOTP Device');
            setTotpEnabled(true);
            setTotpSecret(null);
            setTotpCode('');
            showMessage('2FA enabled successfully!');
        } catch (err: any) {
            showMessage(err.message || 'Invalid verification code.', true);
        } finally {
            setVerifyingTotp(false);
        }
    };

    /* -------------------------------------------------------------
       Disable TOTP
       ------------------------------------------------------------- */
    const disableTOTP = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const mfa = multiFactor(user);
            const factor = mfa.enrolledFactors.find(
                (f: any) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
            );
            if (factor) {
                await mfa.unenroll(factor);
                setTotpEnabled(false);
                showMessage('2FA disabled successfully.');
            }
        } catch (err: any) {
            showMessage(err.message || 'Failed to disable 2FA', true);
        } finally {
            setLoading(false);
        }
    };

    /* -------------------------------------------------------------
       Copy secret (Base‑32)
       ------------------------------------------------------------- */
    const copySecret = () => {
        if (!totpSecret) return;
        navigator.clipboard.writeText(totpSecret.secretKey);
        showMessage('Secret copied to clipboard!');
    };

    /* -------------------------------------------------------------
       Build otpauth URL for QR code
       ------------------------------------------------------------- */
    const otpUrl = totpSecret && user
        ? `otpauth://totp/Grace%20Fellowship:${user.email}?secret=${totpSecret.secretKey}&issuer=Grace%20Fellowship`
        : '';

    if (!user) {
        return (
            <div className="container max-w-4xl py-8">
                <div className="flex justify-center items-center min-h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-4xl py-8">
            {/* Header with Title Only */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold">User Settings</h1>
            </div>

            {error && (
                <Alert variant="destructive" className="mb-6">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            {success && (
                <Alert className="mb-6 border-green-600 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                </Alert>
            )}

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="profile">Profile</TabsTrigger>
                    <TabsTrigger value="password">Password</TabsTrigger>
                    <TabsTrigger value="security">Security (2FA)</TabsTrigger>
                </TabsList>

                {/* ── PROFILE ── */}
                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle>Profile Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="fullName">Full Name</Label>
                                        <Input
                                            id="fullName"
                                            value={profile.fullName}
                                            onChange={(e) =>
                                                setProfile({ ...profile, fullName: e.target.value })
                                            }
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            value={profile.phoneNumber}
                                            onChange={(e) =>
                                                setProfile({ ...profile, phoneNumber: e.target.value })
                                            }
                                            placeholder="Enter your phone number"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="address">Address</Label>
                                    <Input
                                        id="address"
                                        value={profile.address}
                                        onChange={(e) =>
                                            setProfile({ ...profile, address: e.target.value })
                                        }
                                        placeholder="Enter your address"
                                    />
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={loading || !hasProfileChanges()}
                                    className={!hasProfileChanges() ? 'opacity-50 cursor-not-allowed' : ''}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Profile
                                </Button>
                                {!hasProfileChanges() && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        No changes made to profile
                                    </p>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── PASSWORD ── */}
                <TabsContent value="password">
                    <Card>
                        <CardHeader>
                            <CardTitle>Change Password</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordChange} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current">Current Password</Label>
                                    <Input
                                        id="current"
                                        type="password"
                                        value={passwords.current}
                                        onChange={(e) =>
                                            setPasswords({ ...passwords, current: e.target.value })
                                        }
                                        required
                                        placeholder="Enter current password"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new">New Password</Label>
                                    <Input
                                        id="new"
                                        type="password"
                                        value={passwords.new}
                                        onChange={(e) =>
                                            setPasswords({ ...passwords, new: e.target.value })
                                        }
                                        required
                                        placeholder="Enter new password"
                                        minLength={6}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm">Confirm New Password</Label>
                                    <Input
                                        id="confirm"
                                        type="password"
                                        value={passwords.confirm}
                                        onChange={(e) =>
                                            setPasswords({ ...passwords, confirm: e.target.value })
                                        }
                                        required
                                        placeholder="Confirm new password"
                                    />
                                </div>
                                <Button 
                                    type="submit" 
                                    disabled={loading || !passwords.current || !passwords.new || !passwords.confirm}
                                    className={
                                        (!passwords.current || !passwords.new || !passwords.confirm) 
                                        ? 'opacity-50 cursor-not-allowed' 
                                        : ''
                                    }
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Change Password
                                </Button>
                                {(!passwords.current || !passwords.new || !passwords.confirm) && (
                                    <p className="text-sm text-muted-foreground mt-2">
                                        Please fill in all password fields
                                    </p>
                                )}
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── SECURITY (TOTP) ── */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Two‑Factor Authentication (2FA)</CardTitle>
                            <Badge variant={totpEnabled ? 'default' : 'secondary'}>
                                {totpEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Enable */}
                            {!totpEnabled && !totpSecret && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Use Google Authenticator or similar app for secure login.
                                    </p>
                                    <Button onClick={enableTOTP} disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Enable 2FA
                                    </Button>
                                </div>
                            )}

                            {/* Setup (QR + manual) */}
                            {totpSecret && (
                                <div className="space-y-6">
                                    <div className="flex justify-center">
                                        {otpUrl ? (
                                            <QRCodeSVG value={otpUrl} size={192} />
                                        ) : (
                                            <QRCodeFallback value={totpSecret.secretKey} size={192} />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Manual Setup Code</Label>
                                        <div className="flex gap-2">
                                            <Input value={totpSecret.secretKey} readOnly />
                                            <Button size="icon" onClick={copySecret} variant="outline">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Use this code if you can't scan the QR code
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Enter 6‑digit verification code</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="123456"
                                                value={totpCode}
                                                onChange={(e) =>
                                                    setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                                                }
                                                maxLength={6}
                                                className="text-center text-lg font-mono"
                                            />
                                            <Button
                                                onClick={verifyTOTP}
                                                disabled={verifyingTotp || totpCode.length !== 6}
                                            >
                                                {verifyingTotp ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    'Verify'
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {totpEnabled && !totpSecret && (
                                <div>
                                    <p className="text-sm text-green-600 mb-4">
                                        2FA is active. You will be prompted for a verification code on login.
                                    </p>
                                    <Button variant="destructive" onClick={disableTOTP} disabled={loading}>
                                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Disable 2FA
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminSettingsPage;