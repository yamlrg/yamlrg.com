'use client';

import { useEffect, useState, useCallback } from 'react';
import { Workshop } from '../types';
import { addPresentationRequest, getUserProfile } from '../firebase/firestoreOperations';
import { auth, db } from '../firebase/firebaseConfig';
import { ADMIN_EMAILS } from '../config/admin';
import toast, { Toaster } from 'react-hot-toast';
import ProtectedPage from '@/components/ProtectedPage';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { FaYoutube, FaBook, FaLink } from 'react-icons/fa';

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestType, setRequestType] = useState<'give' | 'request'>();
  const [newRequest, setNewRequest] = useState<{
    title: string;
    description: string;
    type: 'paper' | 'startup' | 'other';
    proposedDate: string;
  }>({
    title: '',
    description: '',
    type: 'paper',
    proposedDate: ''
  });
  const router = useRouter();

  const fetchWorkshops = useCallback(async () => {
    try {
      const workshopsRef = collection(db, 'workshops');
      const workshopsSnap = await getDocs(workshopsRef);
      
      if (workshopsSnap.empty) {
        return;
      }

      const workshopData = workshopsSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Workshop));

      setWorkshops(workshopData);
    } catch (error) {
      console.error('Error fetching workshops:', error);
    }
  }, []);

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          return;
        }
        
        const userProfile = await getUserProfile(currentUser.uid);
        if (!userProfile && !ADMIN_EMAILS.includes(currentUser.email || '')) {
          router.push('/join');
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        router.push('/join');
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkUserStatus();
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error('You must be logged in');
        return;
      }

      await addPresentationRequest({
        userId: currentUser.uid,
        userName: currentUser.displayName ?? '',
        userEmail: currentUser.email ?? '',
        title: newRequest.title,
        type: requestType === 'request' ? 'request' : newRequest.type,
        ...(requestType === 'request' 
          ? { description: newRequest.description || '' }
          : {
              description: newRequest.description,
              proposedDate: newRequest.proposedDate
            }
        )
      });

      setShowRequestForm(false);
      setNewRequest({
        title: '',
        description: '',
        type: 'paper',
        proposedDate: ''
      });
      setRequestType(undefined);
      toast.success('Request submitted successfully!');
    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request');
    }
  };

  return (
    <ProtectedPage>
      <div className="min-h-screen p-4">
        <Toaster position="top-center" />
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Workshops & Presentations</h1>
            <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4">
              <button
                onClick={() => {
                  setRequestType('give');
                  setShowRequestForm(true);
                }}
                className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 whitespace-nowrap"
              >
                Present Something
              </button>
              <button
                onClick={() => {
                  setRequestType('request');
                  setShowRequestForm(true);
                }}
                className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 whitespace-nowrap"
              >
                Request a Topic
              </button>
            </div>
          </div>

          {/* Request Form Modal */}
          {showRequestForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-semibold mb-4">
                  {requestType === 'give' ? 'Present Something' : 'Request a Topic'}
                </h2>
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {requestType === 'give' ? 'Title' : 'Topic You Want to Learn About'}
                    </label>
                    <input
                      type="text"
                      value={newRequest.title}
                      onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>

                  {requestType === 'give' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select
                          value={newRequest.type}
                          onChange={(e) => setNewRequest({ ...newRequest, type: e.target.value as 'paper' | 'startup' | 'other' })}
                          className="w-full px-3 py-2 border rounded"
                        >
                          <option value="paper">Paper Presentation</option>
                          <option value="startup">Startup Presentation</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea
                          value={newRequest.description}
                          onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                          className="w-full px-3 py-2 border rounded"
                          rows={4}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Preferred Date (optional)</label>
                        <input
                          type="date"
                          value={newRequest.proposedDate}
                          onChange={(e) => setNewRequest({ ...newRequest, proposedDate: e.target.value })}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-1">Relevant Link (optional)</label>
                      <input
                        type="url"
                        value={newRequest.description}
                        onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="https://..."
                      />
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRequestForm(false);
                        setRequestType(undefined);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                    >
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Workshops List */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-4">Upcoming Workshops</h2>
            {workshops
              .filter(workshop => {
                const workshopDate = new Date(workshop.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return workshopDate >= today;
              })
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map(workshop => (
                <div key={workshop.id} className="border rounded-lg p-6 bg-white hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{workshop.title}</h3>
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <span>By </span>
                        <a
                          href={workshop.presenterLinkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                        >
                          {workshop.presenterName}
                        </a>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(workshop.date).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <span className={`px-3 py-1 text-sm rounded-full inline-block ${
                        workshop.type === 'startup' 
                          ? 'bg-purple-100 text-purple-800' 
                          : workshop.type === 'paper'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {workshop.type}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-gray-700">{workshop.description}</p>

                  {/* Resources section with YouTube */}
                  {((workshop.resources || []).length > 0 || workshop.youtubeUrl) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        {(workshop.resources || []).length > 0 && (
                          <div className="space-y-2">
                            {(workshop.resources || []).map((resource, index) => (
                              <a
                                key={index}
                                href={resource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {resource.includes('github.com') ? (
                                  <FaBook className="w-4 h-4" />
                                ) : (
                                  <FaLink className="w-4 h-4" />
                                )}
                                <span>Resource {index + 1}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        {workshop.youtubeUrl && (
                          <a
                            href={workshop.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:underline ml-auto"
                            title="Watch Recording"
                          >
                            <FaYoutube className="w-4 h-4" />
                            <span>Watch Recording</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

            {!workshops.some(w => {
              const workshopDate = new Date(w.date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return workshopDate >= today;
            }) && (
              <div className="text-center py-6 px-4 border-2 border-dashed rounded-lg">
                <p className="text-gray-600 mb-3">No upcoming workshops scheduled yet!</p>
                <p className="text-gray-600">
                  Have something interesting to share? {' '}
                  <button
                    onClick={() => {
                      setRequestType('give');
                      setShowRequestForm(true);
                    }}
                    className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                  >
                    Present something
                  </button>
                  {' '} or {' '}
                  <button
                    onClick={() => {
                      setRequestType('request');
                      setShowRequestForm(true);
                    }}
                    className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                  >
                    request a topic
                  </button>
                  .
                </p>
              </div>
            )}

            <h2 className="text-xl font-semibold mt-8 mb-4">Past Workshops</h2>
            {workshops
              .filter(workshop => {
                const workshopDate = new Date(workshop.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return workshopDate < today;
              })
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Most recent first
              .map(workshop => (
                <div key={workshop.id} className="border rounded-lg p-6 bg-white hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-grow">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{workshop.title}</h3>
                      <div className="flex items-center gap-2 text-gray-600 mb-1">
                        <span>By </span>
                        <a
                          href={workshop.presenterLinkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                        >
                          {workshop.presenterName}
                        </a>
                      </div>
                      <p className="text-sm text-gray-500 mb-2">
                        {new Date(workshop.date).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                      <span className={`px-3 py-1 text-sm rounded-full inline-block ${
                        workshop.type === 'startup' 
                          ? 'bg-purple-100 text-purple-800' 
                          : workshop.type === 'paper'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {workshop.type}
                      </span>
                    </div>
                  </div>

                  <p className="mt-4 text-gray-700">{workshop.description}</p>

                  {/* Resources section with YouTube */}
                  {((workshop.resources || []).length > 0 || workshop.youtubeUrl) && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex flex-wrap justify-between items-start gap-4">
                        {(workshop.resources || []).length > 0 && (
                          <div className="space-y-2">
                            {(workshop.resources || []).map((resource, index) => (
                              <a
                                key={index}
                                href={resource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {resource.includes('github.com') ? (
                                  <FaBook className="w-4 h-4" />
                                ) : (
                                  <FaLink className="w-4 h-4" />
                                )}
                                <span>Resource {index + 1}</span>
                              </a>
                            ))}
                          </div>
                        )}
                        {workshop.youtubeUrl && (
                          <a
                            href={workshop.youtubeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:underline ml-auto"
                            title="Watch Recording"
                          >
                            <FaYoutube className="w-4 h-4" />
                            <span>Watch Recording</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
} 