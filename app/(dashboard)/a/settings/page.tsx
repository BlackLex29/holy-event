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
import { Loader2, CheckCircle, XCircle, Copy, LogOut } from 'lucide-react';
import {
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider,
    multiFactor,
    TotpMultiFactorGenerator,
    TotpSecret,
    onAuthStateChanged,
    signOut, // ← Added
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';
import { QRCodeSVG } from 'qrcode.react';

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

    // ── Password ───────────────────────────────────────
    const [passwords, setPasswords] = useState({
        current: '',
        new: '',
        confirm: '',
    });

    // ── TOTP ───────────────────────────────────────────
    const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
    const [totpCode, setTotpCode] = useState('');
    const [totpEnabled, setTotpEnabled] = useState(false);
    const [verifyingTotp, setVerifyingTotp] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

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
                    setProfile({
                        fullName: d.fullName ?? '',
                        phoneNumber: d.phoneNumber ?? '',
                        address: d.address ?? '',
                    });
                }
                const mfa = multiFactor(user);
                const hasTotp = mfa.enrolledFactors.some(
                    (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
                );
                setTotpEnabled(hasTotp);
            } catch {
                setError('Failed to load settings.');
            }
        };
        load();
    }, [user]);

    /* -------------------------------------------------------------
       UI helpers
       ------------------------------------------------------------- */
    const showMessage = (msg: string, isError = false) => {
        if (isError) setError(msg);
        else setSuccess(msg);
        setTimeout(() => {
            setError('');
            setSuccess('');
        }, 4000);
    };

    /* -------------------------------------------------------------
       Profile update
       ------------------------------------------------------------- */
    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                fullName: profile.fullName,
                phoneNumber: profile.phoneNumber,
                address: profile.address,
            });
            showMessage('Profile updated!');
        } catch (err: any) {
            showMessage(err.message, true);
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
        if (passwords.new !== passwords.confirm) {
            showMessage('Passwords do not match.', true);
            return;
        }
        setLoading(true);
        try {
            const cred = EmailAuthProvider.credential(user.email!, passwords.current);
            await reauthenticateWithCredential(user, cred);
            await updatePassword(user, passwords.new);
            showMessage('Password changed!');
            setPasswords({ current: '', new: '', confirm: '' });
        } catch (err: any) {
            showMessage(err.message || 'Password change failed.', true);
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
            showMessage('Scan the QR code below.');
        } catch (err: any) {
            showMessage(err.message, true);
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
            showMessage(err.message || 'Invalid code.', true);
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
                (f) => f.factorId === TotpMultiFactorGenerator.FACTOR_ID
            );
            if (factor) {
                await mfa.unenroll(factor);
                setTotpEnabled(false);
                showMessage('2FA disabled.');
            }
        } catch (err: any) {
            if (err.code === 'auth/user-token-expired') {
                showMessage('Session expired. Please re-authenticate and try again.', true);
            } else {
                showMessage(err.message, true);
            }
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
        showMessage('Secret copied!');
    };

    /* -------------------------------------------------------------
       Build otpauth URL for QR code
       ------------------------------------------------------------- */
    const otpUrl = totpSecret
        ? totpSecret.generateQrCodeUrl(user!.email!, 'Grace Fellowship')
        : '';

    /* -------------------------------------------------------------
       LOGOUT HANDLER
       ------------------------------------------------------------- */
    const handleLogout = async () => {
        setLoading(true);
        try {
            await signOut(auth);
            router.push('/login'); // or wherever your login page is
        } catch (err: any) {
            showMessage(err.message || 'Logout failed.', true);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container max-w-4xl py-8">
            {/* Header with Title + Logout */}
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold">Admin Settings</h1>
                <Button
                    variant="outline"
                    onClick={handleLogout}
                    disabled={loading}
                    className="flex items-center gap-2"
                >
                    {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <LogOut className="h-4 w-4" />
                    )}
                    Logout
                </Button>
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
                                    />
                                </div>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Update Profile
                                </Button>
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
                                    />
                                </div>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Change Password
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── SECURITY (TOTP) ── */}
                <TabsContent value="security">
                    <Card>
                        <CardHeader>
                            <CardTitle>Two‑Factor Authentication (TOTP)</CardTitle>
                            <Badge variant={totpEnabled ? 'default' : 'secondary'}>
                                {totpEnabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Enable */}
                            {!totpEnabled && !totpSecret && (
                                <div>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Use Google Authenticator for secure login.
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
                                        <QRCodeSVG value={otpUrl} size={192} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Manual Code</Label>
                                        <div className="flex gap-2">
                                            <Input value={totpSecret.secretKey} readOnly />
                                            <Button size="icon" onClick={copySecret}>
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Enter 6‑digit code</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                placeholder="123456"
                                                value={totpCode}
                                                onChange={(e) =>
                                                    setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                                                }
                                                maxLength={6}
                                            />
                                            <Button
                                                onClick={verifyTOTP}
                                                disabled={verifyingTotp || totpCode.length < 6}
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
                                        2FA is active. You will be prompted on login.
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