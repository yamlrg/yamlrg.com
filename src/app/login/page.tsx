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
  const [showPendingMessage, setShowPendingMessage] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      if (loading) return;
      
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
          router.replace('/members');
          return;
        }
      }
    };

    checkUser();
  }, [user, loading, router]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      sessionStorage.setItem('signingIn', 'true');
      const result = await signInWithGoogle(router);
      
      if (result?.status === 'pending') {
        setShowPendingMessage(true);
      } else if (result?.status === 'no_request') {
        console.log('Redirecting to /join - no request found');
        await auth.signOut(); // Make sure user is signed out
        router.push('/join');
      } else if (result?.status === 'approved') {
        router.replace('/members');
      }
      // If status is 'exists', the router.replace in useEffect will handle it
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
      sessionStorage.removeItem('signingIn');
    }
  };

  if (showPendingMessage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Request Pending! 🎉</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your interest in YAMLRG. We will review your request and get back to you via email soon.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please make sure to check your spam folder if you do not hear from us within a few days.
            </p>
            <div className="mt-6 p-4 bg-emerald-50 rounded-lg">
              <p className="text-emerald-800">
                Want fast approval?{' '}
                <a 
                  href="https://wa.me/447599973293"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-800 underline"
                >
                  Message Maria on WhatsApp
                </a>
              </p>
            </div>
            <Link 
              href="/"
              className="mt-8 inline-block text-blue-600 hover:text-blue-800"
            >
              ← Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Welcome Back!</h2>
          <p className="text-gray-600 mb-8">Sign in to access the YAMLRG community.</p>
          
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-md text-white bg-emerald-700 hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSigningIn ? (
              'Signing in...'
            ) : (
              'Sign in with Google'
            )}
          </button>
          
          <p className="mt-4 text-sm text-gray-600">
            Not a member yet?{' '}
            <Link href="/join" className="text-emerald-600 hover:text-emerald-500">
              Request to join
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
