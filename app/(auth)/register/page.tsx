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
import { Church, Calendar, MailCheck, RefreshCw, Check, X, Home, Eye, EyeOff, Send } from 'lucide-react';
import {
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    User
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
    const [showPassword, setShowPassword] = useState(false);
    const [registrationStep, setRegistrationStep] = useState<'form' | 'verification'>('form');
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [verificationEmailSent, setVerificationEmailSent] = useState(false);

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
        } catch (error: any) {
            console.error('Error checking email:', error);
            
            // If permission error, skip the check and proceed
            if (error?.code === 'permission-denied' || 
                error?.message?.includes('permission') || 
                error?.message?.includes('Missing or insufficient permissions')) {
                console.warn('Permission denied checking email, proceeding with registration');
                return false; // Assume email doesn't exist
            }
            
            // For other errors, don't block registration
            console.warn('Error checking email existence, proceeding anyway:', error);
            return false; // Assume email doesn't exist to allow registration
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

    // FIXED: Email verification with proper domain configuration
    const sendFirebaseVerificationEmail = async (user: User) => {
        try {
            // Check if running on localhost or production
            const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            
            // Set the continue URL based on environment
            // IMPORTANT: Replace 'holy-event.vercel.app' with your actual production domain
            const continueUrl = isLocalhost 
                ? `http://localhost:3000/login?verified=true`
                : `https://holy-event.vercel.app/login?verified=true`;
            
            // Configure action code settings
            const actionCodeSettings = {
                url: continueUrl,
                handleCodeInApp: true,
            };

            await sendEmailVerification(user, actionCodeSettings);
            setVerificationEmailSent(true);
            
            console.log('✅ Verification email sent successfully to:', user.email);
            console.log('Continue URL:', continueUrl);
            return true;
        } catch (error: any) {
            console.error('❌ Error sending verification email:', error);
            
            // Specific error handling
            if (error.code === 'auth/too-many-requests') {
                throw new Error('Too many verification emails sent. Please wait a few minutes before trying again.');
            } else if (error.code === 'auth/invalid-email') {
                throw new Error('Invalid email address. Please check your email.');
            } else if (error.code === 'auth/user-disabled') {
                throw new Error('This account has been disabled. Please contact support.');
            } else if (error.code === 'auth/invalid-continue-uri') {
                throw new Error('Configuration error. Please contact support.');
            } else {
                throw new Error('Failed to send verification email. Please try again or contact support if the problem persists.');
            }
        }
    };

    const createFirebaseUser = async () => {
        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                formData.email,
                formData.password
            );

            const user = userCredential.user;
            setCurrentUser(user);

            // Update profile with display name
            await updateProfile(user, {
                displayName: formData.fullName
            });

            // Calculate age and determine role
            const finalAge = calculateAge(formData.birthdate);
            const role = formData.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? 'admin' : 'user';
            
            // Prepare user data for Firestore
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
                parishionerId: `P-${new Date().getFullYear()}-${user.uid.slice(-5).toUpperCase()}`,
            };

            // Save user data to Firestore
            await setDoc(doc(db, 'users', user.uid), userData);
            
            // Save authentication data
            await setDoc(doc(db, 'authentication', user.uid), {
                email: formData.email.toLowerCase(),
                emailVerified: false,
                status: 'pending',
                createdAt: new Date(),
                lastVerificationEmailSent: new Date()
            });

            return user;

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

    const resendVerificationEmail = async () => {
        if (!currentUser) return;
        
        setSubmitted(true);
        setError('');

        try {
            // Reload user to get latest state
            await currentUser.reload();
            
            // Check if already verified
            if (currentUser.emailVerified) {
                setError('Your email is already verified! You can now login.');
                setTimeout(() => {
                    router.push('/login?verified=true');
                }, 2000);
                return;
            }

            await sendFirebaseVerificationEmail(currentUser);
            
            // Update Firestore with new timestamp
            await setDoc(doc(db, 'authentication', currentUser.uid), {
                lastVerificationEmailSent: new Date()
            }, { merge: true });
            
            setError('✅ Verification email sent! Please check your inbox and spam folder.');
        } catch (err: any) {
            setError(err.message || 'Failed to resend verification email.');
        } finally {
            setSubmitted(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

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
            setSubmitted(true);
            setCheckingEmail(true);

            console.log('Starting registration process...');
            console.log('Email to check:', formData.email);

            // Check if email already exists (with timeout)
            const emailCheckPromise = checkEmailExists(formData.email);
            const timeoutPromise = new Promise<boolean>((_, reject) => 
                setTimeout(() => reject(new Error('Email check timeout')), 5000)
            );

            let emailExists = false;
            try {
                emailExists = await Promise.race([emailCheckPromise, timeoutPromise]);
            } catch (timeoutError) {
                console.warn('Email check timed out or failed, proceeding with registration');
                emailExists = false; // Proceed if check fails/times out
            }
            
            if (emailExists) {
                setError('This email is already registered. Please use a different email or sign in.');
                setCheckingEmail(false);
                setSubmitted(false);
                return;
            }

            console.log('Email available, creating user...');
            setCheckingEmail(false);

            // Create Firebase user
            const user = await createFirebaseUser();
            
            console.log('User created, sending verification email...');
            
            // Send verification email
            await sendFirebaseVerificationEmail(user);
            
            console.log('Moving to verification step...');
            
            // Move to verification step
            setRegistrationStep('verification');

        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed. Please try again.');
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
                    {registrationStep === 'verification' ? (
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
                                    We sent a verification email to:
                                </p>
                                <p className="font-semibold text-lg break-all bg-blue-50 p-3 rounded border">
                                    {formData.email}
                                </p>
                                <p className="text-sm text-gray-600">
                                    Please check your email and click the verification link to activate your account.
                                </p>
                            </div>

                            {verificationEmailSent && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <p className="text-green-700 font-medium">
                                        ✅ Verification email sent successfully!
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className={`p-3 border rounded text-sm ${
                                    error.includes('✅') 
                                        ? 'bg-green-100 border-green-300 text-green-700' 
                                        : 'bg-red-100 border-red-300 text-red-700'
                                }`}>
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <Button 
                                        onClick={resendVerificationEmail}
                                        className="w-full bg-blue-600 hover:bg-blue-700"
                                        disabled={submitted}
                                    >
                                        {submitted ? (
                                            <>
                                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Resend Verification Email
                                            </>
                                        )}
                                    </Button>

                                    <Button 
                                        onClick={() => router.push('/login')}
                                        variant="outline"
                                        className="w-full"
                                    >
                                        Go to Login Page
                                    </Button>

                                    <Button 
                                        onClick={() => router.push('/')}
                                        variant="ghost"
                                        className="w-full"
                                    >
                                        <Home className="mr-2 h-4 w-4" />
                                        Back to Website
                                    </Button>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="font-semibold text-yellow-800 mb-2">Important Tips:</h4>
                                <ul className="text-sm text-yellow-700 space-y-2 text-left">
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold mt-0.5">📧</span>
                                        <span><strong>Check spam/junk folder</strong> - Firebase emails sometimes go there</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold mt-0.5">⏰</span>
                                        <span>Email may take <strong>1-5 minutes</strong> to arrive</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold mt-0.5">📱</span>
                                        <span>Check on <strong>mobile email apps</strong> as well</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold mt-0.5">🔍</span>
                                        <span>Search for emails from <strong>"noreply"</strong> or <strong>"Firebase"</strong></span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold mt-0.5">✅</span>
                                        <span>You can login <strong>after verifying</strong> your email</span>
                                    </li>
                                </ul>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Still can't find the email?</strong> Click "Resend Verification Email" above and wait a few minutes. 
                                    Make sure to check your spam folder!
                                </p>
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
                                        {' '}and understand that I need to verify my email before my account is activated.
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
                                        <>
                                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        'Create Account'
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

            {/* Terms and Conditions Modal */}
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
                                    <p>Your account will be activated only after you verify your email address using the link we send to your email.</p>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-lg mb-2">3. Password Security</h3>
                                    <p>You are responsible for maintaining the confidentiality of your password.</p>
                                </section>

                                <section>
                                    <h3 className="font-semibold text-lg mb-2">4. Data Privacy</h3>
                                    <p>Your personal information will only be used for parish communications and event management.</p>
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