'use client';

import { useEffect } from 'react';
import { auth } from '../firebase/firebaseConfig';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const handleLogout = async () => {
      try {
        await auth.signOut();
        router.push('/');
      } catch (error) {
        console.error('Error logging out:', error);
        router.push('/');
      }
    };

    handleLogout();
  }, [router]);

  return null;
} 