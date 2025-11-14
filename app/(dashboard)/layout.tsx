'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase-config';

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.replace('/login');
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    router.replace('/login');
                    return;
                }

                const userRole = userDoc.data().role;
                const isAdminRoute = pathname.startsWith('/a');
                const isClientRoute = pathname.startsWith('/c');

                // Check if user has correct role for the route
                if (isAdminRoute && userRole !== 'admin') {
                    router.replace('/login');
                    return;
                }

                if (isClientRoute && userRole !== 'user') {
                    router.replace('/login');
                    return;
                }

                setLoading(false);
            } catch (error) {
                console.error('Auth check error:', error);
                router.replace('/login');
            }
        });

        return () => unsubscribe();
    }, [router, pathname]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    return <div>{children}</div>;
};

export default DashboardLayout;