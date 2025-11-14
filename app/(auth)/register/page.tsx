'use client';

import { useState } from 'react';
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
import { Cross2Icon } from '@radix-ui/react-icons';
import {
    createUserWithEmailAndPassword,
    sendEmailVerification,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase-config';
import { doc, setDoc } from 'firebase/firestore';

const RegisterPage = () => {
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

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        email: '',
        password: '',
        address: '',
        age: '',
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

        try {
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
                email: formData.email,
                phoneNumber: formData.phoneNumber,
                address: formData.address,
                age: formData.age,
                gender: formData.gender,
                role,
                createdAt: new Date().toISOString(),
                emailVerified: false,
            });

            // 5. UI feedback
            setSubmitted(true);
            alert(
                'Registration successful! Please check your email to verify your account.'
            );

            setTimeout(() => {
                setSubmitted(false);
                setFormData({
                    fullName: '',
                    phoneNumber: '',
                    email: '',
                    password: '',
                    address: '',
                    age: '',
                    gender: '',
                });
                setAcceptedTerms(false);
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Registration failed');
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
                    <Cross2Icon className="w-8 h-8" />
                    <h1 className="text-3xl font-bold">Grace Fellowship</h1>
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
                                placeholder="(555) 123-4567"
                                value={formData.phoneNumber}
                                onChange={(e) => handleChange('phoneNumber', e.target.value)}
                                required
                            />
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
                            />
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

                    {/* ---- Age & Gender ---- */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label htmlFor="age" className="block text-sm font-medium">
                                Age *
                            </label>
                            <Input
                                id="age"
                                type="number"
                                placeholder="25"
                                value={formData.age}
                                onChange={(e) => handleChange('age', e.target.value)}
                                required
                                min="13"
                                max="120"
                            />
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
                        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">
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
                        <Button type="submit" className="w-full" disabled={submitted}>
                            {submitted ? 'Welcome!' : 'Join Fellowship'}
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
                                    Grace Fellowship Church Scheduling System
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
                                    Grace Fellowship reserves the right to modify these terms at
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