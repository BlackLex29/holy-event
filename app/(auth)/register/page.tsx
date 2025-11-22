'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Church, Calendar, MailCheck, RefreshCw, AlertCircle } from 'lucide-react';
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
    updateProfile,
    signOut,
    updateEmail
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase-config';
import { doc, setDoc, getDocs, query, where, collection } from 'firebase/firestore';

const RegisterPage = () => {
    const router = useRouter();
    
    // -----------------------------------------------------------------
    // 1. ENV & ADMIN EMAIL
    // -----------------------------------------------------------------
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'cccangeles05@gmail.com';
    
    // Get the current domain dynamically
    const getAppUrl = () => {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }
        return process.env.NEXT_PUBLIC_APP_URL || 'https://your-actual-domain.com';
    };

    const APP_URL = getAppUrl();

    // -----------------------------------------------------------------
    // 2. LOCAL STATE
    // -----------------------------------------------------------------
    const [error, setError] = useState('');
    const [showTerms, setShowTerms] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [debugInfo, setDebugInfo] = useState('');

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        email: '',
        password: '',
        address: '',
        birthdate: '',
        gender: '',
    });

    // -----------------------------------------------------------------
    // 3. HELPERS
    // -----------------------------------------------------------------
    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    // Phone number formatting - limit to 11 digits
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        handleChange('phoneNumber', value);
    };

    // Check if email already exists
    const checkEmailExists = async (email: string): Promise<boolean> => {
        try {
            const usersQuery = query(
                collection(db, 'users'),
                where('email', '==', email.toLowerCase())
            );
            const querySnapshot = await getDocs(usersQuery);
            return !querySnapshot.empty;
        } catch (error) {
            console.error('Error checking email:', error);
            return false;
        }
    };

    // Calculate age from birthdate
    const calculateAge = (birthdate: string): number => {
        const birthDate = new Date(birthdate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        const hasBirthdayOccurred = 
            today.getMonth() > birthDate.getMonth() || 
            (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
        
        return hasBirthdayOccurred ? age : age - 1;
    };

    // Create temporary user data in Firestore (pending verification)
    const createTempUser = async (userCredential: any, finalAge: number) => {
        const role = formData.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
        
        const userData = {
            fullName: formData.fullName,
            email: formData.email.toLowerCase(),
            phoneNumber: formData.phoneNumber,
            address: formData.address,
            birthdate: formData.birthdate,
            age: finalAge,
            gender: formData.gender,
            role: role,
            status: 'pending',
            emailVerified: false,
            createdAt: new Date(),
            parishionerId: `P-${new Date().getFullYear()}-${userCredential.user.uid.slice(-5).toUpperCase()}`,
            pendingVerification: true,
            verificationSentAt: new Date(),
            // Store in authentication collection for easy access
            authStatus: 'unverified'
        };

        await setDoc(doc(db, 'users', userCredential.user.uid), userData);
        
        // Also create a record in authentication collection
        await setDoc(doc(db, 'authentication', userCredential.user.uid), {
            email: formData.email.toLowerCase(),
            emailVerified: false,
            status: 'pending',
            createdAt: new Date(),
            lastVerificationSent: new Date()
        });
        
        return userData;
    };

    // -----------------------------------------------------------------
    // 4. SUBMIT HANDLER - WITH IMPROVED VERIFICATION
    // -----------------------------------------------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setDebugInfo('Starting registration process...');

        if (!acceptedTerms) {
            setError('Please accept the terms and conditions');
            return;
        }

        // Validate phone number
        if (formData.phoneNumber.length !== 11) {
            setError('Phone number must be exactly 11 digits');
            return;
        }

        // Validate birthdate
        if (!formData.birthdate) {
            setError('Please enter your birthdate');
            return;
        }

        // Calculate age from birthdate
        const finalAge = calculateAge(formData.birthdate);

        if (finalAge < 13) {
            setError('You must be at least 13 years old to register');
            return;
        }

        if (finalAge > 120) {
            setError('Please enter a valid birthdate');
            return;
        }

        try {
            setCheckingEmail(true);
            setDebugInfo('Checking email availability...');

            // Check if email already exists
            const emailExists = await checkEmailExists(formData.email);
            if (emailExists) {
                setError('This email is already registered. Please use a different email or sign in.');
                setCheckingEmail(false);
                return;
            }

            setDebugInfo('Creating Firebase Auth user...');

            // 1. Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            setDebugInfo(`User created: ${userCredential.user.uid}`);

            // 2. Update user profile with display name
            await updateProfile(userCredential.user, {
                displayName: formData.fullName
            });

            setDebugInfo('Profile updated, sending verification email...');

            // 3. Send verification email with SIMPLE settings
            try {
                // Try without actionCodeSettings first
                await sendEmailVerification(userCredential.user);
                setDebugInfo('Verification email sent successfully');
            } catch (emailError) {
                console.log('Trying with actionCodeSettings...');
                // If that fails, try with actionCodeSettings
                const actionCodeSettings = {
                    url: `${APP_URL}/login`,
                    handleCodeInApp: false
                };
                await sendEmailVerification(userCredential.user, actionCodeSettings);
                setDebugInfo('Verification email sent with settings');
            }

            // 4. Create temporary user record in Firestore
            setDebugInfo('Creating user record in Firestore...');
            await createTempUser(userCredential, finalAge);

            // 5. Store email for display
            setUserEmail(formData.email);

            // 6. Sign out the user immediately (they need to verify first)
            setDebugInfo('Signing out user...');
            await signOut(auth);

            // 7. UI feedback
            setVerificationSent(true);
            setSubmitted(true);
            setDebugInfo('Registration process completed successfully');

        } catch (err: any) {
            console.error('Registration error:', err);
            setDebugInfo(`Error: ${err.message}`);
            
            // Handle specific Firebase auth errors
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please use a different email or sign in.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use a stronger password.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address. Please check your email.');
            } else if (err.code === 'auth/operation-not-allowed') {
                setError('Email/password accounts are not enabled. Please contact support.');
            } else if (err.code === 'auth/network-request-failed') {
                setError('Network error. Please check your internet connection.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please try again later.');
            } else {
                setError(err.message || 'Registration failed. Please try again.');
            }
        } finally {
            setCheckingEmail(false);
        }
    };

    // -----------------------------------------------------------------
    // 5. RENDER
    // -----------------------------------------------------------------
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-2xl shadow-xl">
                {/* ------------------- Header ------------------- */}
                <CardHeader className="bg-gradient-to-r from-primary to-primary/90 p-8 rounded-t-lg text-primary-foreground">
                    <div className="flex items-center gap-3 mb-3">
                        <Church className="w-8 h-8" />
                        <h1 className="text-3xl font-bold">Holy Events</h1>
                    </div>
                    <p className="text-lg opacity-90">Join Our Community</p>
                </CardHeader>

                {/* ------------------- Form ------------------- */}
                <CardContent className="p-8">
                    {/* Debug Info - Remove in production */}
                    {process.env.NODE_ENV === 'development' && debugInfo && (
                        <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded text-xs">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            {debugInfo}
                        </div>
                    )}

                    {verificationSent ? (
                        // Verification Success Screen
                        <div className="text-center space-y-6 py-4">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-green-100 p-4">
                                    <MailCheck className="w-12 h-12 text-green-600" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-green-800">
                                    Check Your Email!
                                </h2>
                                <p className="text-muted-foreground">
                                    We sent a verification link to:
                                </p>
                                <p className="font-semibold text-lg break-all bg-blue-50 p-3 rounded border">
                                    {userEmail}
                                </p>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                                <h3 className="font-semibold text-blue-800 mb-2">What to do next:</h3>
                                <ul className="space-y-2 text-sm text-blue-700">
                                    <li>• <strong>Check your inbox</strong> (and spam folder)</li>
                                    <li>• Click the <strong>"Verify Email"</strong> button in the email</li>
                                    <li>• After verification, come back here to login</li>
                                    <li>• Your account is pending until email verification</li>
                                </ul>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="font-semibold text-yellow-800 mb-2">Important:</h4>
                                <p className="text-sm text-yellow-700">
                                    The verification email will come from <strong>Firebase</strong> 
                                    (noreply@holy-event-78a97.firebaseapp.com). This is normal and secure.
                                    You cannot login until you verify your email.
                                </p>
                            </div>

                            <div className="space-y-3 pt-4">
                                <Button 
                                    onClick={() => {
                                        setVerificationSent(false);
                                        setSubmitted(false);
                                        setFormData({
                                            fullName: '',
                                            phoneNumber: '',
                                            email: '',
                                            password: '',
                                            address: '',
                                            birthdate: '',
                                            gender: '',
                                        });
                                        setAcceptedTerms(false);
                                        setUserEmail('');
                                        setDebugInfo('');
                                    }}
                                    variant="outline"
                                    className="w-full"
                                >
                                    Register Another Account
                                </Button>
                                
                                <Button 
                                    onClick={() => router.push('/login')}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    Go to Login Page
                                </Button>
                            </div>

                            <p className="text-sm text-muted-foreground pt-4">
                                Didn't receive the email? Check your spam folder or try registering again.
                            </p>
                        </div>
                    ) : (
                        // Registration Form
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="text-center mb-2">
                                <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
                                <p className="text-gray-600">Join our parish community today</p>
                            </div>

                            {/* ---- Name & Email ---- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                                        Full Name *
                                    </label>
                                    <Input
                                        id="fullName"
                                        type="text"
                                        placeholder="John Doe"
                                        value={formData.fullName}
                                        onChange={(e) => handleChange('fullName', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                        Email Address *
                                    </label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={(e) => handleChange('email', e.target.value)}
                                        required
                                        disabled={checkingEmail}
                                    />
                                </div>
                            </div>

                            {/* ---- Phone & Password ---- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">
                                        Phone Number *
                                    </label>
                                    <Input
                                        id="phoneNumber"
                                        type="tel"
                                        placeholder="09123456789"
                                        value={formData.phoneNumber}
                                        onChange={handlePhoneChange}
                                        required
                                        maxLength={11}
                                    />
                                    <p className="text-xs text-gray-500">
                                        11-digit Philippine number (09XXXXXXXXX)
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                        Password *
                                    </label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={(e) => handleChange('password', e.target.value)}
                                        required
                                        minLength={6}
                                    />
                                    <p className="text-xs text-gray-500">
                                        At least 6 characters
                                    </p>
                                </div>
                            </div>

                            {/* ---- Address ---- */}
                            <div className="space-y-2">
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                    Complete Address *
                                </label>
                                <Input
                                    id="address"
                                    type="text"
                                    placeholder="Street, Barangay, City, Province"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    required
                                />
                            </div>

                            {/* ---- Birthdate & Gender ---- */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="birthdate" className="block text-sm font-medium text-gray-700">
                                        Birthdate *
                                    </label>
                                    <div className="relative">
                                        <Input
                                            id="birthdate"
                                            type="date"
                                            value={formData.birthdate}
                                            onChange={(e) => handleChange('birthdate', e.target.value)}
                                            required
                                            max={new Date().toISOString().split('T')[0]}
                                        />
                                        <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        Must be 13+ years old
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                                        Gender *
                                    </label>
                                    <Select
                                        value={formData.gender}
                                        onValueChange={(v) => handleChange('gender', v)}
                                        required
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select gender" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                            <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* ---- Error Message ---- */}
                            {error && (
                                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                    <AlertCircle className="w-4 h-4 inline mr-2" />
                                    {error}
                                </div>
                            )}

                            {/* ---- Terms & Conditions Checkbox ---- */}
                            <div className="space-y-3">
                                <label className="flex items-start gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                                        required
                                    />
                                    <span className="text-sm text-gray-700">
                                        I agree to the{' '}
                                        <button
                                            type="button"
                                            onClick={() => setShowTerms(true)}
                                            className="font-medium underline text-primary hover:text-primary/80"
                                        >
                                            Terms and Conditions
                                        </button>
                                        {' '}and understand that I need to verify my email before I can login.
                                    </span>
                                </label>
                            </div>

                            {/* ---- Submit Button ---- */}
                            <div className="pt-4">
                                <Button 
                                    type="submit" 
                                    className="w-full bg-primary hover:bg-primary/90" 
                                    disabled={submitted || checkingEmail}
                                    size="lg"
                                >
                                    {checkingEmail ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Checking Availability...
                                        </>
                                    ) : submitted ? (
                                        'Creating Account...'
                                    ) : (
                                        'Create Account & Verify Email'
                                    )}
                                </Button>
                            </div>

                            {/* ---- Footer Links ---- */}
                            <p className="text-center text-sm text-gray-600">
                                Already have an account?{' '}
                                <a href="/login" className="font-semibold text-primary hover:underline">
                                    Sign in here
                                </a>
                            </p>
                        </form>
                    )}
                </CardContent>
            </Card>

            {/* ------------------- Terms Modal ------------------- */}
            {showTerms && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6 space-y-4">
                            <h2 className="text-2xl font-bold">Terms and Conditions</h2>
                            <div className="space-y-3 text-sm text-gray-700">
                                <p><strong>Email Verification Required</strong></p>
                                <p>Your account will be fully activated only after you verify your email address. You will receive a secure verification link from Firebase Authentication.</p>
                                
                                <p><strong>Account Security</strong></p>
                                <p>We use Firebase Authentication (by Google) for secure account management. Your password is encrypted and stored securely.</p>
                                
                                <p><strong>Data Privacy</strong></p>
                                <p>Your personal information will only be used for parish communications and event management. We do not share your data with third parties.</p>
                                
                                <p><strong>Community Guidelines</strong></p>
                                <p>As a member of our parish community, we expect respectful behavior and adherence to Christian values in all interactions.</p>
                            </div>

                            <Button onClick={() => setShowTerms(false)} className="w-full">
                                I Understand
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default RegisterPage;