'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase/firebaseConfig';
import { getUserProfile } from '../firebase/firestoreOperations';
import { toast, Toaster } from 'react-hot-toast';
import { ADMIN_EMAILS } from '../config/admin';
import { trackEvent } from "@/utils/analytics";
import { getFirestore, collection, query, where, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import ProtectedPage from '@/components/ProtectedPage';

interface GradientConnectEvent {
  id: string;
  date: string;
  status: 'upcoming' | 'completed';
}

function isGradientConnectEvent(obj: unknown): obj is GradientConnectEvent {
  const candidate = obj as { date?: unknown; status?: unknown };
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'date' in candidate &&
    'status' in candidate &&
    typeof candidate.date === 'string' &&
    typeof candidate.status === 'string'
  );
}

export default function GradientConnectPage() {
  const [user, loading] = useAuthState(auth);
  const [isSignedUp, setIsSignedUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upcomingEvent, setUpcomingEvent] = useState<GradientConnectEvent | null>(null);
  const [signupStatus, setSignupStatus] = useState<{
    inviteSent: boolean;
  } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      if (!user) return;
      
      // First check if user has profile
      const userProfile = await getUserProfile(user.uid);
      if (!userProfile && !ADMIN_EMAILS.includes(user.email || '')) {
        router.push('/join');
        return;
      }

      // Define checkStatus inside the effect
      const checkStatus = async () => {
        try {
          const db = getFirestore();
          
          // Get upcoming events
          const eventsRef = collection(db, 'gradientConnectEvents');
          const eventsQuery = query(
            eventsRef, 
            where('date', '>', new Date().toISOString())
          );
          const eventsSnapshot = await getDocs(eventsQuery);
          
          // Get the nearest upcoming event
          const events = eventsSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(isGradientConnectEvent)
            .filter(event => event.status === 'upcoming')
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (events.length === 0 || !user) {
            setUpcomingEvent(null);
            return;
          }

          const nextEvent = events[0];
          setUpcomingEvent(nextEvent);

          // Check if user is signed up
          const signupsRef = collection(db, 'gradientConnectSignups');
          const signupQuery = query(
            signupsRef,
            where('userId', '==', user.uid),
            where('matchingDate', '==', nextEvent.date)
          );
          
          const snapshot = await getDocs(signupQuery);
          setIsSignedUp(!snapshot.empty);
          if (!snapshot.empty) {
            setSignupStatus(snapshot.docs[0].data().status);
          }

        } catch (error) {
          console.error('Error checking status:', error);
        }
      };

      // Then check event status
      await checkStatus();
    };

    init();
  }, [user, router]); // No need for checkStatus in deps anymore

  const handleSignUp = async () => {
    if (!user || !upcomingEvent) {
      toast.error('Please log in to sign up for Gradient Connect');
      return;
    }

    setIsSubmitting(true);
    try {
      const db = getFirestore();
      const signupsRef = collection(db, 'gradientConnectSignups');
      
      // Check if already signed up
      const existingQuery = query(
        signupsRef,
        where('userId', '==', user.uid),
        where('matchingDate', '==', upcomingEvent.date)
      );
      const existingSnapshot = await getDocs(existingQuery);

      if (!existingSnapshot.empty) {
        setIsSignedUp(true);
        toast.success("You&apos;re already signed up for this round!");
        trackEvent('gradient_connect_already_signed_up', {
          userId: user.uid,
          matchingDate: upcomingEvent.date
        });
        return;
      }

      // Create new signup
      await addDoc(signupsRef, {
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        matchingDate: upcomingEvent.date,
        status: {
          inviteSent: false
        },
        createdAt: new Date().toISOString()
      });

      setIsSignedUp(true);
      toast.success("You&apos;re signed up! Maria will send you a calendar invite.");
      trackEvent('gradient_connect_signup', {
        userId: user.uid,
        matchingDate: upcomingEvent.date
      });
    } catch (error) {
      console.error('Error signing up:', error);
      toast.error('Failed to sign up. Please try again.');
      trackEvent('gradient_connect_signup_error', {
        userId: user.uid,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptOut = async () => {
    if (!user || !upcomingEvent) return;

    setIsSubmitting(true);
    try {
      const db = getFirestore();
      const signupsRef = collection(db, 'gradientConnectSignups');
      const signupQuery = query(
        signupsRef,
        where('userId', '==', user.uid),
        where('matchingDate', '==', upcomingEvent.date)
      );
      
      const snapshot = await getDocs(signupQuery);
      if (!snapshot.empty) {
        // Delete the signup document
        await deleteDoc(doc(db, 'gradientConnectSignups', snapshot.docs[0].id));
        setIsSignedUp(false);
        setSignupStatus(null);
        toast.success("You&apos;ve been removed from this round.");
        trackEvent('gradient_connect_opt_out', {
          userId: user.uid,
          matchingDate: upcomingEvent.date
        });
      }
    } catch (error) {
      console.error('Error opting out:', error);
      toast.error('Failed to opt out. Please try again.');
      trackEvent('gradient_connect_opt_out_error', {
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

  if (!upcomingEvent) {
    return (
      <ProtectedPage>
        <main className="min-h-screen p-4">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-4">Gradient Connect</h1>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8 text-gray-600">
                No upcoming events scheduled yet. Check back soon!
              </div>
            </div>
          </div>
        </main>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <main className="min-h-screen p-4">
        <Toaster position="top-center" />
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Gradient Connect</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Next Meetup</h2>
            <div className="bg-emerald-50 p-4 rounded-lg mb-6">
              <p className="text-lg font-medium text-emerald-900">
                {new Date(upcomingEvent.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })} at {new Date(upcomingEvent.date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: 'numeric',
                  timeZone: 'GMT'
                })} GMT
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
                <p className="font-medium mb-2">
                  {signupStatus?.inviteSent 
                    ? "Check your email, you should have received an invite!"
                    : "You will receive an email soon!"}
                </p>
                <p className="text-sm mb-4">
                  Once matched, you can coordinate with your partner to reschedule if the time doesn&apos;t work for you.
                </p>
                <button
                  onClick={handleOptOut}
                  disabled={isSubmitting}
                  className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                >
                  {isSubmitting ? 'Canceling...' : 'Cancel my signup'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignUp}
                disabled={isSubmitting}
                className="bg-emerald-700 text-white px-6 py-2 rounded-lg hover:bg-emerald-800 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Signing up...' : "Sign me up!"}
              </button>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">How it works</h2>
            <ul className="space-y-3 text-gray-700">
              <li>• Sign up for the next round</li>
              <li>• You&apos;ll be matched with another YAMLRG member</li>
              <li>• Maria will send you a calendar invite for {new Date(upcomingEvent.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric'
              })} at {new Date(upcomingEvent.date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: 'numeric',
                timeZone: 'GMT'
              })} GMT</li>
              <li>• Can&apos;t make it? No worries - you can coordinate with your match to find a better time</li>
              <li>• Join the call and enjoy a 30-minute chat!</li>
              <li>• Meet someone new and expand your network!</li>
            </ul>
          </div>
        </div>
      </main>
    </ProtectedPage>
  );
} 