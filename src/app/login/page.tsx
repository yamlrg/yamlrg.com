'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle } from '../firebase/authFunctions';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/firebaseConfig';
import { getUserProfile } from '../firebase/firestoreOperations';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Only redirect if we have a confirmed logged-in user with a profile
  useEffect(() => {
    const checkUser = async () => {
      // Wait until we're done loading
      if (loading) return;
      
      // If we have a user and we're not in the process of signing in
      if (user && !sessionStorage.getItem('signingIn')) {
        const profile = await getUserProfile(user.uid);
        if (!profile) {
          // No profile found, sign out
          await auth.signOut();
          return;
        }
        router.replace('/members');
      }
    };

    checkUser();
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      sessionStorage.setItem('signingIn', 'true');
      await signInWithGoogle(router);
      sessionStorage.removeItem('signingIn');
    } catch (error) {
      sessionStorage.removeItem('signingIn');
      console.error('Login error:', error);
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Only show loading while actually loading auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not logged in
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-8">Login</h1>
      <button
        onClick={handleSignIn}
        disabled={isSigningIn}
        className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
      </button>
      <p className="mt-6 text-gray-600">
        Don&apos;t have an account?{' '}
        <Link href="/join" className="text-emerald-600 hover:text-emerald-700">
          Request to join YAMLRG
        </Link>
      </p>
    </div>
  );
}
