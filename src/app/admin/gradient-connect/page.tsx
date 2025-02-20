'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/app/firebase/firebaseConfig';
import { ADMIN_EMAILS } from '@/app/config/admin';
import { GradientConnectSignup } from '@/app/types';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { toast, Toaster } from 'react-hot-toast';
import { CheckIcon, EnvelopeIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

type GroupedSignups = {
  [key: string]: GradientConnectSignup[];
};

type UnsavedNotes = { [key: string]: string };

export default function GradientConnectAdminPage() {
  const [user] = useAuthState(auth);
  const [signups, setSignups] = useState<GroupedSignups>({});
  const [loading, setLoading] = useState(true);
  const [unsavedNotes, setUnsavedNotes] = useState<UnsavedNotes>({});

  useEffect(() => {
    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      window.location.href = '/';
      return;
    }

    fetchSignups();
  }, [user]);

  const fetchSignups = async () => {
    try {
      const db = getFirestore();
      const signupsRef = collection(db, 'gradientConnectSignups');
      const snapshot = await getDocs(signupsRef);
      
      const signupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        status: {
          inviteSent: false,
          inviteAccepted: false,
          attended: false,
          notes: '',
          ...(doc.data().status || {})
        }
      })) as GradientConnectSignup[];

      // Group by matchingDate
      const grouped = signupsData.reduce((acc, signup) => {
        const date = new Date(signup.matchingDate);
        const dateKey = date.toLocaleDateString('en-US', { 
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(signup);
        return acc;
      }, {} as GroupedSignups);

      setSignups(grouped);
    } catch (error) {
      toast.error('Failed to fetch signups');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateSignupStatus = async (signupId: string, updates: Partial<GradientConnectSignup['status']>) => {
    try {
      const db = getFirestore();
      const signupRef = doc(db, 'gradientConnectSignups', signupId);
      
      await updateDoc(signupRef, {
        status: updates
      });
      
      toast.success('Status updated successfully');
      fetchSignups();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  const handleNoteChange = (signupId: string, value: string) => {
    setUnsavedNotes(prev => ({
      ...prev,
      [signupId]: value
    }));
  };

  const saveNotes = async (signupId: string, currentStatus: GradientConnectSignup['status']) => {
    try {
      const db = getFirestore();
      const signupRef = doc(db, 'gradientConnectSignups', signupId);
      
      await updateDoc(signupRef, {
        status: {
          ...currentStatus,
          notes: unsavedNotes[signupId]
        }
      });
      
      setUnsavedNotes(prev => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [signupId]: _, ...rest } = prev;
        return rest;
      });
      
      toast.success('Notes saved successfully');
      fetchSignups();
    } catch (error) {
      toast.error('Failed to save notes');
      console.error(error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Gradient Connect Admin</h1>

        {Object.entries(signups).map(([dateKey, dateSignups]) => (
          <div key={dateKey} className="mb-8">
            <h2 className="text-xl font-semibold mb-4">{dateKey}</h2>
            <div className="grid grid-cols-1 gap-4">
              {dateSignups.map((signup) => (
                <div key={signup.id} className="bg-white p-4 rounded-lg shadow relative">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{signup.userName}</h3>
                        <p className="text-sm text-gray-600">{signup.userEmail}</p>
                        
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes & Matching
                          </label>
                          <textarea
                            value={(unsavedNotes[signup.id!] ?? signup.status.notes) || ''}
                            onChange={(e) => handleNoteChange(signup.id!, e.target.value)}
                            placeholder="Add notes or matching details here..."
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            rows={2}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-3 sm:mt-0 sm:ml-4">
                        <button
                          onClick={() => updateSignupStatus(signup.id!, {
                            ...signup.status,
                            inviteSent: !signup.status.inviteSent
                          })}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                            signup.status.inviteSent 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700'
                          }`}
                        >
                          <EnvelopeIcon className="h-4 w-4" />
                          Invite Sent
                        </button>

                        <button
                          onClick={() => updateSignupStatus(signup.id!, {
                            ...signup.status,
                            inviteAccepted: !signup.status.inviteAccepted
                          })}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                            signup.status.inviteAccepted 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700'
                          }`}
                        >
                          <CheckIcon className="h-4 w-4" />
                          Accepted
                        </button>

                        <button
                          onClick={() => updateSignupStatus(signup.id!, {
                            ...signup.status,
                            attended: !signup.status.attended
                          })}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                            signup.status.attended 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-700'
                          }`}
                        >
                          <CheckIcon className="h-4 w-4" />
                          Attended
                        </button>
                      </div>
                    </div>
                  </div>

                  {unsavedNotes[signup.id!] !== undefined && (
                    <button
                      onClick={() => saveNotes(signup.id!, signup.status)}
                      className="absolute bottom-4 right-4 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors flex items-center gap-2"
                      title="Save notes"
                    >
                      <ArrowUpTrayIcon className="h-4 w-4" />
                      Save
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
} 