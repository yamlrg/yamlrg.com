'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithGoogle, signInWithEmail, resetPassword } from '../firebase/authFunctions';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/firebaseConfig';
import { getUserProfile, getApprovedJoinRequestByEmail } from '../firebase/firestoreOperations';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

type ApprovedJoinRequest = { id: string; loginMethod?: string };

export default function LoginPage() {
  const [user, loading] = useAuthState(auth);
  const router = useRouter();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showPendingMessage, setShowPendingMessage] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      if (loading) return;
      
      if (user) {
        console.log('User is authenticated:', user.email);
        const profile = await getUserProfile(user.uid);
        console.log('User profile:', profile);
        if (profile) {
          console.log('Profile exists, redirecting to /members');
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
      console.log('Starting sign in process...');
      const result = await signInWithGoogle(router);
      console.log('Sign in result:', result);
      
      if (result?.status === 'pending') {
        console.log('User has a pending join request');
        setShowPendingMessage(true);
      } else if (result?.status === 'no_request') {
        console.log('No join request found, redirecting to /join');
        await auth.signOut(); // Make sure user is signed out
        router.push('/join');
      } else if (result?.status === 'approved') {
        console.log('User is approved, redirecting to /members');
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

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    setResetSent(false);
    console.log('[Login] Attempting email login for:', email);
    try {
      const result = await signInWithEmail(email, password);
      console.log('[Login] signInWithEmail result:', result);
      toast.success('Logged in successfully!');
      // The useEffect will handle redirect
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Authentication failed';
      console.error('[Login] Error during signInWithEmail:', error);
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
      console.log('[Login] Login finished. Loading:', authLoading);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      toast.error('Please enter your email address to reset your password.');
      return;
    }
    setAuthError(null);
    setResetSent(false);
    setAuthLoading(true);
    try {
      const approvedRequest = await getApprovedJoinRequestByEmail(email) as ApprovedJoinRequest | null;
      if (!approvedRequest) {
        toast.error('This email has not been approved by the admin yet.');
        setAuthError('This email has not been approved by the admin yet.');
        setAuthLoading(false);
        return;
      }
      if (approvedRequest.loginMethod === 'google') {
        toast.error('This account was approved for Google login. Please use the "Sign in with Google" button below.');
        setAuthError('This account was approved for Google login. Please use the "Sign in with Google" button below.');
        setAuthLoading(false);
        return;
      }
      await resetPassword(email);
      setResetSent(true);
      toast.success('Password reset email sent!');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Failed to send reset email';
      toast.error(errMsg);
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    console.log('[Login] useAuthState:', { user, loading });
    if (user) {
      console.log('[Login] Authenticated user:', user);
      getUserProfile(user.uid).then(profile => {
        console.log('[Login] getUserProfile result:', profile);
      });
    }
  }, [user, loading]);

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
      <Toaster position="top-center" />
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-4">Welcome Back! 👋</h2>
          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
              autoComplete="email"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12.001C3.226 16.273 7.24 19.5 12 19.5c1.658 0 3.237-.336 4.646-.94m3.374-2.14A10.45 10.45 0 0022.066 12c-1.292-4.272-5.306-7.5-10.066-7.5-1.272 0-2.492.222-3.627.63" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0-1.192.214-2.333.611-3.382C4.772 5.477 8.113 2.25 12 2.25c3.887 0 7.228 3.227 9.139 6.368.397 1.05.611 2.19.611 3.382s-.214 2.333-.611 3.382C19.228 18.523 15.887 21.75 12 21.75c-3.887 0-7.228-3.227-9.139-6.368A10.45 10.45 0 012.25 12z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                )}
              </button>
            </div>
            {authError && <div className="text-red-600 text-sm">{authError}</div>}
            {resetSent && <div className="text-emerald-700 text-sm">Password reset email sent!</div>}
            <button
              type="submit"
              disabled={authLoading}
              className="w-full px-4 py-2 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {authLoading ? 'Signing in...' : 'Sign in'}
            </button>
            <div className="flex justify-end items-center text-sm mt-2">
              <button
                type="button"
                className="text-gray-500 hover:underline focus:outline-none flex items-center gap-2"
                onClick={handleResetPassword}
              >
                Forgot password?
                {authLoading && (
                  <svg className="animate-spin h-4 w-4 text-emerald-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                )}
              </button>
            </div>
          </form>
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.23l6.85-6.85C35.64 2.7 30.18 0 24 0 14.82 0 6.71 5.82 2.69 14.09l7.98 6.2C12.13 13.16 17.62 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.64 7.01l7.19 5.59C43.98 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.29c-1.13-3.36-1.13-6.97 0-10.33l-7.98-6.2C.86 16.09 0 19.94 0 24c0 4.06.86 7.91 2.69 12.24l7.98-6.2z"/><path fill="#EA4335" d="M24 48c6.18 0 11.64-2.03 15.84-5.53l-7.19-5.59c-2.01 1.35-4.59 2.13-8.65 2.13-6.38 0-11.87-3.66-13.33-8.79l-7.98 6.2C6.71 42.18 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
            {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
          </button>
          <p className="mt-4 text-sm text-gray-600">
            Not a member yet?{' '}
            <Link href="/join" className="text-emerald-700 hover:text-emerald-800">
              Request to join
            </Link>
          </p>
          <p className="mt-2 text-sm text-gray-600">
            If you&apos;re having trouble logging in, please let{' '}
            <a 
              href="https://wa.me/447599973293"
              target="_blank"
              rel="noopener noreferrer"
              className="text-emerald-700 hover:text-emerald-800 underline"
            >
              Maria
            </a>
            {' '}know
          </p>
        </div>
      </div>
    </div>
  );
}
