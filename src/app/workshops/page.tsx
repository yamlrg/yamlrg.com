'use client';

import { useEffect, useState, useCallback } from 'react';
import { Workshop } from '../types';
import { addPresentationRequest, getUserProfile } from '../firebase/firestoreOperations';
import { auth, db } from '../firebase/firebaseConfig';
import { ADMIN_EMAILS } from '../config/admin';
import toast, { Toaster } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { FaYoutube, FaBook, FaLink } from 'react-icons/fa';

// Add these constants at the top
const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;
const URL_MAX_LENGTH = 500;

const getMinDate = () => {
  const date = new Date();
  date.setDate(date.getDate() + 7); // Add 7 days
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
};

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
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
  const user = auth.currentUser;

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
        if (!user) {
          return;
        }
        
        const userProfile = await getUserProfile(user.uid);
        if (!userProfile && !ADMIN_EMAILS.includes(user.email || '')) {
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
  }, [user, router]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      await addPresentationRequest({
        userId: user.uid,
        userName: user.displayName ?? '',
        userEmail: user.email ?? '',
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
    <main className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Workshops & Presentations</h1>
          <div className="flex flex-col sm:flex-row gap-3 sm:space-x-4">
            <button
              onClick={() => {
                if (!user) {
                  setShowLoginPrompt(true);
                  return;
                }
                setRequestType('give');
                setShowRequestForm(true);
              }}
              className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 whitespace-nowrap"
            >
              Present Something
            </button>
            <button
              onClick={() => {
                if (!user) {
                  setShowLoginPrompt(true);
                  return;
                }
                setRequestType('request');
                setShowRequestForm(true);
              }}
              className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 whitespace-nowrap"
            >
              Request a Topic
            </button>
          </div>
        </div>

        {/* Login Prompt Modal */}
        {showLoginPrompt && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">Login Required</h2>
              <p className="text-gray-600 mb-6">
                Please log in to submit workshop requests or presentations.
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <a
                  href="/login"
                  className="px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800"
                >
                  Log In
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Request Form Modal */}
        {showRequestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold mb-4">
                {requestType === 'give' ? 'Present Something' : 'Request a Topic'}
              </h2>
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">
                      {requestType === 'give' ? 'Title' : 'Topic You Want to Learn About'}
                    </label>
                    <span className="text-xs text-gray-500">
                      {newRequest.title.length}/{TITLE_MAX_LENGTH}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newRequest.title}
                    onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value.slice(0, TITLE_MAX_LENGTH) })}
                    className="w-full px-3 py-2 border rounded"
                    required
                    maxLength={TITLE_MAX_LENGTH}
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
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium">Description</label>
                        <span className="text-xs text-gray-500">
                          {newRequest.description.length}/{DESCRIPTION_MAX_LENGTH}
                        </span>
                      </div>
                      <textarea
                        value={newRequest.description}
                        onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value.slice(0, DESCRIPTION_MAX_LENGTH) })}
                        className="w-full px-3 py-2 border rounded"
                        rows={4}
                        required
                        maxLength={DESCRIPTION_MAX_LENGTH}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Preferred Date (optional)</label>
                      <input
                        type="date"
                        value={newRequest.proposedDate}
                        onChange={(e) => setNewRequest({ ...newRequest, proposedDate: e.target.value })}
                        min={getMinDate()}
                        className="w-full px-3 py-2 border rounded"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Must be at least a week from today
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium">Relevant Link (optional)</label>
                      <span className="text-xs text-gray-500">
                        {newRequest.description.length}/{URL_MAX_LENGTH}
                      </span>
                    </div>
                    <input
                      type="url"
                      value={newRequest.description}
                      onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value.slice(0, URL_MAX_LENGTH) })}
                      className="w-full px-3 py-2 border rounded"
                      placeholder="https://..."
                      maxLength={URL_MAX_LENGTH}
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
              <a 
                key={workshop.id}
                href="https://lu.ma/YAMLRG"
                target="_blank"
                rel="noopener noreferrer"
                className="block border rounded-lg p-6 bg-white hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{workshop.title}</h3>
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <span>By </span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(workshop.presenterLinkedIn, '_blank');
                        }}
                        className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                      >
                        {workshop.presenterName}
                      </button>
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
                            <button
                              key={index}
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(resource, '_blank');
                              }}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {resource.includes('github.com') ? (
                                <FaBook className="w-4 h-4" />
                              ) : (
                                <FaLink className="w-4 h-4" />
                              )}
                              <span>Resource {index + 1}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {workshop.youtubeUrl && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(workshop.youtubeUrl, '_blank');
                          }}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:underline ml-auto"
                          title="Watch Recording"
                        >
                          <FaYoutube className="w-4 h-4" />
                          <span>Watch Recording</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </a>
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
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          window.open(workshop.presenterLinkedIn, '_blank');
                        }}
                        className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                      >
                        {workshop.presenterName}
                      </button>
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
                            <button
                              key={index}
                              onClick={(e) => {
                                e.preventDefault();
                                window.open(resource, '_blank');
                              }}
                              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              {resource.includes('github.com') ? (
                                <FaBook className="w-4 h-4" />
                              ) : (
                                <FaLink className="w-4 h-4" />
                              )}
                              <span>Resource {index + 1}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {workshop.youtubeUrl && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            window.open(workshop.youtubeUrl, '_blank');
                          }}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:underline ml-auto"
                          title="Watch Recording"
                        >
                          <FaYoutube className="w-4 h-4" />
                          <span>Watch Recording</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>
    </main>
  );
} 