'use client';

import { useEffect, useState } from 'react';
import { Workshop } from '../types';
import { addPresentationRequest, getWorkshops, getUserProfile } from '../firebase/firestoreOperations';
import { auth } from '../firebase/firebaseConfig';
import { ADMIN_EMAILS } from '../config/admin';
import toast, { Toaster } from 'react-hot-toast';
import ProtectedPage from '@/components/ProtectedPage';

console.log('Workshops page - Admin emails:', ADMIN_EMAILS);

export default function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
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

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const currentUser = auth.currentUser;
        const isAdminUser = currentUser?.email ? ADMIN_EMAILS.includes(currentUser.email) : false;
        setIsAdmin(isAdminUser);
        
        if (isAdminUser) {
          setIsApproved(true);
          return;
        }

        if (currentUser) {
          const userProfile = await getUserProfile(currentUser.uid);
          setIsApproved(!!userProfile?.isApproved);
        }
      } catch (error) {
        console.error('Error checking user status:', error);
        setIsApproved(false);
      }
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        checkUserStatus();
      } else {
        setIsAdmin(false);
        setIsApproved(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchWorkshops = async () => {
      if (isApproved || isAdmin) {
        const allWorkshops = await getWorkshops();
        setWorkshops(allWorkshops);
      }
    };

    fetchWorkshops();
  }, [isApproved, isAdmin]);

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

  if (!isApproved && !isAdmin) {
    return (
      <ProtectedPage>
        <div className="min-h-screen p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-yellow-700">
                You need to be an approved member to view workshops.
                Please contact an admin for approval.
              </p>
            </div>
          </div>
        </div>
      </ProtectedPage>
    );
  }

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
                <div key={workshop.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">{workshop.title}</h3>
                      <p className="text-gray-600">
                        By{' '}
                        <a
                          href={workshop.presenterLinkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {workshop.presenterName}
                        </a>
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(workshop.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                      {workshop.type}
                    </span>
                  </div>
                  <p className="mt-2">{workshop.description}</p>
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
                <p className="text-gray-600 mb-3">
                  Have something interesting to share? Or want to learn about a specific topic?
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => {
                      setRequestType('give');
                      setShowRequestForm(true);
                    }}
                    className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 text-sm"
                  >
                    Present Something
                  </button>
                  <button
                    onClick={() => {
                      setRequestType('request');
                      setShowRequestForm(true);
                    }}
                    className="bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 text-sm"
                  >
                    Request a Topic
                  </button>
                </div>
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
                <div key={workshop.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">{workshop.title}</h3>
                      <p className="text-gray-600">
                        By{' '}
                        <a
                          href={workshop.presenterLinkedIn}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {workshop.presenterName}
                        </a>
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(workshop.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                      {workshop.type}
                    </span>
                  </div>
                  <p className="mt-2">{workshop.description}</p>
                  {workshop.youtubeUrl && (
                    <a
                      href={workshop.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline block mt-2"
                    >
                      Watch Recording →
                    </a>
                  )}
                  {workshop.resources && workshop.resources.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Resources:</p>
                      <ul className="list-disc list-inside">
                        {workshop.resources.map((resource, index) => (
                          <li key={index}>
                            <a
                              href={resource}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Resource {index + 1}
                            </a>
                          </li>
                        ))}
                      </ul>
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