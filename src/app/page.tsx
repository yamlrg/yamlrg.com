'use client';

import { useEffect, useState } from 'react';
import { auth } from './firebase/firebaseConfig';
import { getUserProfile } from './firebase/firestoreOperations';
import Link from 'next/link';

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        setLoading(true);
        setIsLoggedIn(!!user);
        
        if (user) {
          await getUserProfile(user.uid);
        }
        
      } catch (error) {
        console.error('Error in home page:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading && auth.currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-[400px]">
          <h2 className="text-xl mb-4">yet another machine learning reading group?</h2>
          <p className="mb-2">YAMLRG is a community of machine learning researchers, engineers, and hobbyists.</p>
          <p className="mb-2">We regularly meet to share, discuss, and ideate on new work in the AI space.</p>
          {isLoggedIn ? (
            <div className="mt-6">
              <Link
                href="/members"
                className="inline-block bg-emerald-700 text-white px-6 py-2 rounded-lg hover:bg-emerald-800 transition-colors"
              >
                Go to Members →
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-6">
                <Link
                  href="/join"
                  className="inline-block bg-emerald-700 text-white px-6 py-2 rounded-lg hover:bg-emerald-800 transition-colors"
                >
                  Request to Join
                </Link>
              </div>
              <p className="text-gray-600 mt-3">
                or{' '}
                <a href="/login" className="text-emerald-700 hover:underline">
                  login if you&apos;re already a member 😎
                </a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}