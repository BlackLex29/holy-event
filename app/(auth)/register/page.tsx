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
import { Church, Calendar, MailCheck, RefreshCw, Check, X, Home, Eye, EyeOff } from 'lucide-react';
import {
    createUserWithEmailAndPassword,
    updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase-config';
import { doc, setDoc, getDocs, query, where, collection } from 'firebase/firestore';

const RegisterPage = () => {
    const router = useRouter();
    
    const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'cccangeles05@gmail.com';

    const [error, setError] = useState('');
    const [showTerms, setShowTerms] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [verificationSent, setVerificationSent] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [showVerificationInput, setShowVerificationInput] = useState(false);
    const [otpHash, setOtpHash] = useState('');
    const [otpExpiresAt, setOtpExpiresAt] = useState(0);
    const [registrationComplete, setRegistrationComplete] = useState(false);

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        email: '',
        password: '',
        address: '',
        birthdate: '',
        gender: '',
    });

    const [passwordValidation, setPasswordValidation] = useState({
        hasMinLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
    });

    const validatePassword = (password: string) => {
        const validations = {
            hasMinLength: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumber: /[0-9]/.test(password),
            hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        };
        setPasswordValidation(validations);
        return Object.values(validations).every(Boolean);
    };

    const handlePasswordChange = (password: string) => {
        handleChange('password', password);
        validatePassword(password);
    };

    const isPasswordValid = Object.values(passwordValidation).every(Boolean);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').slice(0, 11);
        handleChange('phoneNumber', value);
    };

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
            
            if (error instanceof Error) {
                if (error.message.includes('permission') || error.message.includes('Missing or insufficient permissions')) {
                    console.warn('Permission denied checking email, proceeding with registration');
                    return false;
                }
            }
            
            throw new Error('Unable to check email availability. Please try again.');
        }
    };

    const calculateAge = (birthdate: string): number => {
        const birthDate = new Date(birthdate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();
        
        const hasBirthdayOccurred = 
            today.getMonth() > birthDate.getMonth() || 
            (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
        
        return hasBirthdayOccurred ? age : age - 1;
    };

    // ✅ SIMPLIFIED: Working OTP Email Function
    const sendVerificationEmail = async (email: string, name: string): Promise<{otpHash: string; expiresAt: number}> => {
        try {
            console.log("📤 Sending verification email to:", email);
            
            const response = await fetch('/api/send-email-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    name: name.trim()
                }),
            });

            const data = await response.json();

            console.log("📨 API Response:", {
                status: response.status,
                ok: response.ok,
                data: data
            });

            if (!response.ok) {
                const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
                console.error("❌ API Error:", errorMessage);
                throw new Error(errorMessage);
            }

            // ✅ DEVELOPMENT: Show OTP in console for testing
            if (data.debugOtp) {
                console.log("🔓 DEVELOPMENT OTP:", data.debugOtp);
            }

            return {
                otpHash: data.otpHash,
                expiresAt: data.expiresAt
            };
        } catch (error) {
            console.error('Error sending verification email:', error);
            throw error;
        }
    };

    // ✅ SIMPLIFIED: OTP Verification
    const verifyOTPCode = async (inputCode: string, storedHash: string, expiresAt: number): Promise<boolean> => {
        if (Date.now() > expiresAt) {
            return false;
        }

        try {
            const response = await fetch('/api/verify-otp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: inputCode,
                    hash: storedHash,
                    email: formData.email.toLowerCase()
                }),
            });

            const data = await response.json();
            return data.success === true;
        } catch (error) {
            console.error('Error verifying OTP:', error);
            return false;
        }
    };

    const createFirebaseUser = async () => {
        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            await updateProfile(userCredential.user, {
                displayName: formData.fullName
            });

            const finalAge = calculateAge(formData.birthdate);
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
                status: 'active',
                emailVerified: true,
                createdAt: new Date(),
                verifiedAt: new Date(),
                parishionerId: `P-${new Date().getFullYear()}-${userCredential.user.uid.slice(-5).toUpperCase()}`,
            };

            await setDoc(doc(db, 'users', userCredential.user.uid), userData);
            
            await setDoc(doc(db, 'authentication', userCredential.user.uid), {
                email: formData.email.toLowerCase(),
                emailVerified: true,
                status: 'active',
                createdAt: new Date(),
                verifiedAt: new Date()
            });

            setRegistrationComplete(true);

        } catch (err: any) {
            console.error('Firebase creation error:', err);
            
            if (err.code === 'auth/email-already-in-use') {
                throw new Error('This email is already registered. Please use a different email or sign in.');
            } else if (err.code === 'auth/weak-password') {
                throw new Error('Password is too weak. Please use a stronger password.');
            } else if (err.code === 'auth/invalid-email') {
                throw new Error('Invalid email address. Please check your email.');
            } else if (err.code === 'auth/operation-not-allowed') {
                throw new Error('Email/password accounts are not enabled. Please contact support.');
            } else if (err.code === 'auth/network-request-failed') {
                throw new Error('Network error. Please check your internet connection.');
            } else if (err.code === 'auth/too-many-requests') {
                throw new Error('Too many attempts. Please try again later.');
            } else {
                throw new Error(err.message || 'Registration failed. Please try again.');
            }
        }
    };

    const verifyCode = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setSubmitted(true);
        setError('');

        try {
            const isValid = await verifyOTPCode(verificationCode, otpHash, otpExpiresAt);
            
            if (!isValid) {
                if (Date.now() > otpExpiresAt) {
                    setError('Verification code has expired. Please request a new code.');
                } else {
                    setError('Invalid verification code. Please check the code and try again.');
                }
                setSubmitted(false);
                return;
            }

            await createFirebaseUser();
            setVerificationSent(true);
            setShowVerificationInput(false);

        } catch (err: any) {
            console.error('Verification error:', err);
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setSubmitted(false);
        }
    };

    const resendVerificationCode = async () => {
        setSubmitted(true);
        setError('');

        try {
            const result = await sendVerificationEmail(formData.email, formData.fullName);
            
            setOtpHash(result.otpHash);
            setOtpExpiresAt(result.expiresAt);
            
            setError('New verification code sent! Please check your email.');
        } catch (err: any) {
            console.error('Resend error:', err);
            setError('Failed to resend verification code. Please try again.');
        } finally {
            setSubmitted(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        console.log("📝 Form data:", formData);
        console.log("✅ Terms accepted:", acceptedTerms);
        console.log("🔐 Password valid:", isPasswordValid);

        if (!acceptedTerms) {
            setError('Please accept the terms and conditions');
            return;
        }

        if (!isPasswordValid) {
            setError('Please ensure your password meets all requirements');
            return;
        }

        if (formData.phoneNumber.length !== 11) {
            setError('Phone number must be exactly 11 digits');
            return;
        }

        if (!formData.birthdate) {
            setError('Please enter your birthdate');
            return;
        }

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
            console.log("🔍 Checking email availability...");

            const emailExists = await checkEmailExists(formData.email);
            console.log("📧 Email exists:", emailExists);
            
            if (emailExists) {
                setError('This email is already registered. Please use a different email or sign in.');
                setCheckingEmail(false);
                return;
            }

            console.log("📤 Sending verification email...");
            const result = await sendVerificationEmail(formData.email, formData.fullName);
            
            setOtpHash(result.otpHash);
            setOtpExpiresAt(result.expiresAt);
            setShowVerificationInput(true);
            console.log("✅ Verification code sent successfully");

        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Failed to send verification code. Please try again.');
        } finally {
            setCheckingEmail(false);
            setSubmitted(false);
        }
    };

    const PasswordRequirement = ({ met, text }: { met: boolean; text: string }) => (
        <div className={`flex items-center gap-2 text-sm ${met ? 'text-green-600' : 'text-gray-500'}`}>
            {met ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
            <span>{text}</span>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <Card className="w-full max-w-2xl shadow-xl">
                <CardHeader className="bg-gradient-to-r from-primary to-primary/90 p-8 rounded-t-lg text-primary-foreground">
                    <div className="flex items-center gap-3 mb-3">
                        <Church className="w-8 h-8" />
                        <h1 className="text-3xl font-bold">Holy Event</h1>
                    </div>
                    <p className="text-lg opacity-90">Join Our Community</p>
                </CardHeader>

                <CardContent className="p-8">
                    {/* Development OTP Display */}
                    {process.env.NODE_ENV === 'development' && showVerificationInput && (
                        <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded-lg">
                            <p className="text-yellow-800 text-sm font-semibold">Development Mode</p>
                            <p className="text-yellow-700 text-xs">
                                Check browser console for OTP code (F12 → Console)
                            </p>
                        </div>
                    )}

                    {verificationSent && registrationComplete ? (
                        <div className="text-center space-y-6 py-4">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-green-100 p-4">
                                    <MailCheck className="w-12 h-12 text-green-600" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-green-800">
                                    Registration Successful!
                                </h2>
                                <p className="text-muted-foreground">
                                    Your account has been created and verified successfully.
                                </p>
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <h3 className="font-semibold text-green-800 mb-2">Welcome to Holy Events!</h3>
                                <p className="text-sm text-green-700">
                                    You can now login to your account and start using our services.
                                </p>
                            </div>

                            <div className="space-y-3 pt-4">
                                <Button 
                                    onClick={() => router.push('/login')}
                                    className="w-full bg-green-600 hover:bg-green-700"
                                >
                                    Go to Login Page
                                </Button>
                                
                                <Button 
                                    onClick={() => router.push('/')}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Home className="mr-2 h-4 w-4" />
                                    Back to Website
                                </Button>
                            </div>
                        </div>
                    ) : showVerificationInput ? (
                        <div className="text-center space-y-6 py-4">
                            <div className="flex justify-center">
                                <div className="rounded-full bg-blue-100 p-4">
                                    <MailCheck className="w-12 h-12 text-blue-600" />
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <h2 className="text-2xl font-bold text-blue-800">
                                    Verify Your Email
                                </h2>
                                <p className="text-muted-foreground">
                                    We sent a 6-digit verification code to:
                                </p>
                                <p className="font-semibold text-lg break-all bg-blue-50 p-3 rounded border">
                                    {formData.email}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Please enter the code to complete your registration
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                                        Verification Code *
                                    </label>
                                    <Input
                                        id="verificationCode"
                                        type="text"
                                        placeholder="123456"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        required
                                        maxLength={6}
                                        className="text-center text-2xl font-mono tracking-widest"
                                    />
                                    <p className="text-xs text-gray-500">
                                        Enter the 6-digit code from your email
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <Button 
                                        onClick={verifyCode}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        disabled={submitted || verificationCode.length !== 6}
                                    >
                                        {submitted ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Verifying & Creating Account...
                                            </>
                                        ) : (
                                            'Verify & Complete Registration'
                                        )}
                                    </Button>

                                    <Button 
                                        onClick={resendVerificationCode}
                                        variant="outline"
                                        className="w-full"
                                        disabled={submitted}
                                    >
                                        {submitted ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            'Resend Verification Code'
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="font-semibold text-yellow-800 mb-2">Important:</h4>
                                <ul className="text-sm text-yellow-700 space-y-1 text-left">
                                    <li>• The verification code expires in 10 minutes</li>
                                    <li>• Check your spam folder if you don't see the email</li>
                                    <li>• Your account will be created only after verification</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="text-center mb-2">
                                <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
                                <p className="text-gray-600">Join our parish community today</p>
                            </div>

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
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={(e) => handlePasswordChange(e.target.value)}
                                            required
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
                                    
                                    {formData.password && (
                                        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                            <p className="text-sm font-medium text-gray-700 mb-2">Password must contain:</p>
                                            <div className="grid grid-cols-1 gap-1">
                                                <PasswordRequirement 
                                                    met={passwordValidation.hasMinLength} 
                                                    text="At least 8 characters" 
                                                />
                                                <PasswordRequirement 
                                                    met={passwordValidation.hasUpperCase} 
                                                    text="One uppercase letter (A-Z)" 
                                                />
                                                <PasswordRequirement 
                                                    met={passwordValidation.hasLowerCase} 
                                                    text="One lowercase letter (a-z)" 
                                                />
                                                <PasswordRequirement 
                                                    met={passwordValidation.hasNumber} 
                                                    text="One number (0-9)" 
                                                />
                                                <PasswordRequirement 
                                                    met={passwordValidation.hasSpecialChar} 
                                                    text="One special character (!@#$%^&* etc.)" 
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

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

                            {error && (
                                <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                                    {error}
                                </div>
                            )}

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
                                        {' '}and understand that I need to verify my email before my account is created.
                                    </span>
                                </label>
                            </div>

                            <div className="pt-4">
                                <Button 
                                    type="submit" 
                                    className="w-full bg-primary hover:bg-primary/90" 
                                    disabled={submitted || checkingEmail || !isPasswordValid}
                                    size="lg"
                                >
                                    {checkingEmail ? (
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Checking Availability...
                                        </>
                                    ) : submitted ? (
                                        'Sending Verification Code...'
                                    ) : (
                                        'Send Verification Code'
                                    )}
                                </Button>
                            </div>

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

            {showTerms && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6 space-y-4">
                            <h2 className="text-2xl font-bold">Terms and Conditions</h2>
                            <div className="space-y-4 text-sm text-gray-700">
                                <section>
                                    <h3 className="font-semibold text-lg mb-2">1. Account Registration</h3>
                                    <p>By creating an account, you agree to provide accurate and complete information. You must be at least 13 years old to register.</p>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-lg mb-2">2. Email Verification Required</h3>
                                    <p>Your account will be created only after you verify your email address using the 6-digit code we send to your email. This ensures the security of your account and prevents unauthorized registrations.</p>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-lg mb-2">3. Password Security</h3>
                                    <p>You are responsible for maintaining the confidentiality of your password. Your password must meet the following requirements:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li>Minimum 8 characters in length</li>
                                        <li>At least one uppercase letter (A-Z)</li>
                                        <li>At least one lowercase letter (a-z)</li>
                                        <li>At least one number (0-9)</li>
                                        <li>At least one special character (!@#$%^&* etc.)</li>
                                    </ul>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-lg mb-2">4. Account Security</h3>
                                    <p>We use Firebase Authentication (by Google) for secure account management. Your password is encrypted and stored securely. Your account will only be activated after successful email verification.</p>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-lg mb-2">5. Data Privacy</h3>
                                    <p>Your personal information will only be used for parish communications, event management, and religious purposes. We will never share your information with third parties without your consent.</p>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-lg mb-2">6. Community Guidelines</h3>
                                    <p>As a member of our parish community, we expect respectful behavior and adherence to Christian values.</p>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-lg mb-2">7. Verification Process</h3>
                                    <p>After submitting your registration form, you will receive a 6-digit verification code via email. This code expires in 10 minutes. Your account will be created only after you successfully verify your email with this code.</p>
                                </section>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                                    <p className="text-yellow-800 font-semibold">By checking the agreement box, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.</p>
                                </div>
                            </div>

                            <Button onClick={() => setShowTerms(false)} className="w-full mt-4">
                                I Have Read and Understand the Terms
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default RegisterPage;