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
import { Church, Calendar } from 'lucide-react';
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase-config';
import { doc, setDoc, getDocs, query, where, collection } from 'firebase/firestore';

const RegisterPage = () => {
    const router = useRouter();
    
    // -----------------------------------------------------------------
    // 1. ENV & ADMIN EMAIL
    // -----------------------------------------------------------------
    const ADMIN_EMAIL =
        process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'cccangeles05@gmail.com';

    // -----------------------------------------------------------------
    // 2. LOCAL STATE
    // -----------------------------------------------------------------
    const [error, setError] = useState('');
    const [showTerms, setShowTerms] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);

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

    // Redirect to login after successful registration
    const redirectToLogin = () => {
        setTimeout(() => {
            router.push('/login');
        }, 2000); // Redirect after 2 seconds to show success message
    };

    // -----------------------------------------------------------------
    // 4. SUBMIT HANDLER
    // -----------------------------------------------------------------
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

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
        const birthDate = new Date(formData.birthdate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        // Check if birthday has occurred this year
        const hasBirthdayOccurred = 
            today.getMonth() > birthDate.getMonth() || 
            (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
        
        const finalAge = hasBirthdayOccurred ? age : age - 1;

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

            // Check if email already exists
            const emailExists = await checkEmailExists(formData.email);
            if (emailExists) {
                setError('This email is already registered. Please use a different email or sign in.');
                setCheckingEmail(false);
                return;
            }

            // 1. Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            // 2. Send verification email
            await sendEmailVerification(userCredential.user);

            // 3. Determine role
            const role =
                formData.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
                    ? 'admin'
                    : 'user';

            // 4. Save profile to Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                fullName: formData.fullName,
                email: formData.email.toLowerCase(),
                phoneNumber: formData.phoneNumber,
                address: formData.address,
                birthdate: formData.birthdate,
                age: finalAge,
                gender: formData.gender,
                role,
                createdAt: new Date().toISOString(),
                emailVerified: false,
            });

            // 5. UI feedback and redirect
            setSubmitted(true);
            
            // Show success message
            alert(
                'Registration successful! Please check your email to verify your account. Redirecting to login...'
            );

            // Redirect to login page after 2 seconds
            redirectToLogin();

        } catch (err: any) {
            console.error('Registration error:', err);
            
            // Handle specific Firebase auth errors
            if (err.code === 'auth/email-already-in-use') {
                setError('This email is already registered. Please use a different email or sign in.');
            } else if (err.code === 'auth/weak-password') {
                setError('Password is too weak. Please use a stronger password.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Invalid email address. Please check your email.');
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
        <Card className="w-full max-w-2xl mx-auto">
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
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* ---- Name & Email ---- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="fullName" className="block text-sm font-medium">
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
                            <label htmlFor="email" className="block text-sm font-medium">
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
                            <label htmlFor="phoneNumber" className="block text-sm font-medium">
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
                            <p className="text-xs text-muted-foreground">
                                Format: 09XXXXXXXXX (11 digits)
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="block text-sm font-medium">
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
                            <p className="text-xs text-muted-foreground">
                                Minimum 6 characters
                            </p>
                        </div>
                    </div>

                    {/* ---- Address ---- */}
                    <div className="space-y-2">
                        <label htmlFor="address" className="block text-sm font-medium">
                            Address *
                        </label>
                        <Input
                            id="address"
                            type="text"
                            placeholder="123 Main St, City, State 12345"
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            required
                        />
                    </div>

                    {/* ---- Birthdate & Gender ---- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="birthdate" className="block text-sm font-medium">
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
                                <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4 pointer-events-none" />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Must be 13 years or older
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="gender" className="block text-sm font-medium">
                                Gender *
                            </label>
                            <Select
                                value={formData.gender}
                                onValueChange={(v) => handleChange('gender', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="male">Male</SelectItem>
                                    <SelectItem value="female">Female</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                    <SelectItem value="prefer-not">Prefer not to say</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ---- Error Message ---- */}
                    {error && (
                        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                            {error}
                        </div>
                    )}

                    {/* ---- Success Message ---- */}
                    {submitted && (
                        <div className="p-3 bg-green-100 border border-green-300 text-green-700 rounded text-sm">
                            ✅ Registration successful! Redirecting to login...
                        </div>
                    )}

                    {/* ---- Terms & Conditions Checkbox ---- */}
                    <div className="space-y-3">
                        <label className="flex items-start gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                className="mt-1"
                            />
                            <span className="text-sm">
                                I accept the{' '}
                                <button
                                    type="button"
                                    onClick={() => setShowTerms(true)}
                                    className="font-medium underline text-primary hover:text-primary/80"
                                >
                                    Terms and Conditions
                                </button>
                            </span>
                        </label>
                    </div>

                    {/* ---- Submit Button ---- */}
                    <div className="pt-4">
                        <Button 
                            type="submit" 
                            className="w-full" 
                            disabled={submitted || checkingEmail}
                        >
                            {checkingEmail ? (
                                <>
                                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                                    Checking...
                                </>
                            ) : submitted ? (
                                'Redirecting...'
                            ) : (
                                'Join Fellowship'
                            )}
                        </Button>
                    </div>

                    {/* ---- Footer Links ---- */}
                    <p className="text-center text-sm text-muted-foreground">
                        Already a member?{' '}
                        <a href="/login" className="font-medium text-primary hover:underline">
                            Sign in here
                        </a>
                    </p>
                </form>
            </CardContent>

            {/* ------------------- Terms Modal ------------------- */}
            {showTerms && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6 space-y-4">
                            <h2 className="text-2xl font-bold">Terms and Conditions</h2>
                            <div className="space-y-3 text-sm">
                                <h3 className="font-semibold">
                                    Holy Events Church Scheduling System
                                </h3>

                                <p>
                                    <strong>1. Acceptance of Terms</strong>
                                </p>
                                <p>
                                    By registering for our church scheduling system, you agree to
                                    these terms and conditions.
                                </p>

                                <p>
                                    <strong>2. Use of Service</strong>
                                </p>
                                <p>
                                    This platform is intended for scheduling church events,
                                    services, and activities. Users agree to use the system
                                    respectfully and in accordance with church values.
                                </p>

                                <p>
                                    <strong>3. Account Responsibilities</strong>
                                </p>
                                <p>
                                    You are responsible for maintaining the confidentiality of
                                    your account and password. You agree to provide accurate
                                    information during registration.
                                </p>

                                <p>
                                    <strong>4. Event Scheduling</strong>
                                </p>
                                <p>
                                    Users may book church facilities and schedule events subject
                                    to church approval and availability. The church reserves the
                                    right to modify or cancel any booking.
                                </p>

                                <p>
                                    <strong>5. Privacy</strong>
                                </p>
                                <p>
                                    Your personal information will be used solely for
                                    church-related communications and event coordination. We will
                                    not share your information with third parties without
                                    consent.
                                </p>

                                <p>
                                    <strong>6. Code of Conduct</strong>
                                </p>
                                <p>
                                    Users agree to maintain Christian values and respectful
                                    communication within the platform.
                                </p>

                                <p>
                                    <strong>7. Modifications</strong>
                                </p>
                                <p>
                                    Holy Events reserves the right to modify these terms at
                                    any time. Continued use constitutes acceptance of changes.
                                </p>
                            </div>

                            <Button onClick={() => setShowTerms(false)} className="w-full">
                                Close
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </Card>
    );
};

export default RegisterPage;