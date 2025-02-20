'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/firebaseConfig';
import { getUserProfile } from '../firebase/firestoreOperations';
import { toast, Toaster } from 'react-hot-toast';
import { ADMIN_EMAILS } from '../config/admin';
import { trackEvent } from "@/utils/analytics";
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

// Move this outside the component
const MEETUP_DATE = new Date('2024-03-05T17:00:00Z');

export default function GradientConnectPage() {
  const [user, loading] = useAuthState(auth);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // Use the constant instead
  const meetupDate = MEETUP_DATE;

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) return;
      
      const userProfile = await getUserProfile(user.uid);
      if (!userProfile && !ADMIN_EMAILS.includes(user.email || '')) {
        router.push('/join');
        return;
      }

      // Check if user is already signed up
      try {
        const db = getFirestore();
        const signupsRef = collection(db, 'gradientConnectSignups');
        const q = query(
          signupsRef, 
          where('userId', '==', user.uid),
          where('matchingDate', '==', meetupDate.toISOString())
        );
        
        const snapshot = await getDocs(q);
        setIsSignedUp(!snapshot.empty);
      } catch (error) {
        console.error('Error checking signup status:', error);
      }
    };

    checkUserStatus();
  }, [user, router, meetupDate]);

  const handleSignUp = async () => {
    if (!user) {
      toast.error('Please log in to sign up for Gradient Connect');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = await user.getIdToken();

      const response = await fetch('/api/gradient-connect/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          userName: user.displayName,
          matchingDate: meetupDate.toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign up');
      }

      if (data.alreadySignedUp) {
        setIsSignedUp(true);
        toast.success("You're already signed up for this round!");
        trackEvent('gradient_connect_already_signed_up', {
          userId: user.uid,
          matchingDate: meetupDate.toISOString()
        });
        return;
      }

      setIsSignedUp(true);
      toast.success("You&apos;re signed up! Maria will send you a calendar invite.");
      trackEvent('gradient_connect_signup', {
        userId: user.uid,
        matchingDate: meetupDate.toISOString()
      });
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to sign up. Please try again.');
      trackEvent('gradient_connect_signup_error', {
        userId: user.uid,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Gradient Connect</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Next Meetup</h2>
          <div className="bg-emerald-50 p-4 rounded-lg mb-6">
            <p className="text-lg font-medium text-emerald-900">
              Wednesday, March 5th at 5:00 PM GMT
            </p>
          </div>
          <p className="text-gray-600 mb-6">
            Sign up to be matched with another YAMLRG member for a 30-minute 1v1 chat!
          </p>
          <p className="text-gray-500 text-sm italic mb-6">
            Psst... yes, you can ask Maria to play cupid and match you with someone you really want to talk to 😉
          </p>

          {!user ? (
            <p className="text-gray-600">
              Please <a href="/login" className="text-emerald-700 hover:underline">log in</a> to sign up for Gradient Connect
            </p>
          ) : isSignedUp ? (
            <div className="bg-gradient-to-r from-pink-100 via-orange-50 to-orange-100 text-pink-900 p-6 rounded-lg border border-pink-200/50 shadow-sm">
              <p className="font-medium">
                You&apos;re all set! Maria will send you a calendar invite soon.
              </p>
            </div>
          ) : (
            <button
              onClick={handleSignUp}
              disabled={isSubmitting}
              className="bg-emerald-700 text-white px-6 py-2 rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Signing up...' : "I'm in!"}
            </button>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">How it works</h2>
          <ul className="space-y-3 text-gray-700">
            <li>• Sign up for the next round</li>
            <li>• You&apos;ll be matched with another YAMLRG member</li>
            <li>• Maria will send you a calendar invite for March 5th at 5pm GMT</li>
            <li>• Join the call and enjoy a 30-minute chat!</li>
            <li>• Meet someone new and expand your network!</li>
          </ul>
        </div>
      </div>
    </main>
  );
} 