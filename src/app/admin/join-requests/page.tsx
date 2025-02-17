'use client';

import { useState, useEffect } from 'react';
import { getJoinRequests, updateJoinRequestStatus } from '@/app/firebase/firestoreOperations';
import { JoinRequest } from '@/app/types';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { auth } from '@/app/firebase/firebaseConfig';

export default function JoinRequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  useEffect(() => {
    const fetchRequests = async () => {
      const fetchedRequests = await getJoinRequests();
      setRequests(fetchedRequests);
    };

    fetchRequests();
  }, []);

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      // If rejecting, we can proceed directly
      if (action === 'rejected') {
        await updateJoinRequestStatus(requestId, action, auth.currentUser?.email ?? '');
        toast.success('Request rejected successfully');
        const updatedRequests = await getJoinRequests();
        setRequests(updatedRequests);
        return;
      }

      // For approvals, we need to send the email first
      console.log('Request being approved, sending welcome email first...');
      const request = requests.find(r => r.id === requestId);
      if (!request) {
        toast.error('Request not found');
        return;
      }

      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication error');
        return;
      }

      // Try to send email first
      const response = await fetch('/api/send-approval-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: request.email
        })
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (error) {
        console.error('Error parsing response:', error);
        console.error('Response status:', response.status);
        console.error('Response text:', await response.text());
        toast.error('Server error - please check logs');
        return;
      }

      if (!response.ok) {
        console.error('Email send failed:', responseData);
        toast.error(`Failed to send welcome email: ${responseData.error}${responseData.details ? ` - ${responseData.details}` : ''}`);
        return;
      }

      // Only if email succeeds, update the status
      await updateJoinRequestStatus(requestId, action, auth.currentUser?.email ?? '');
      toast.success('Request approved and welcome email sent successfully');
      const updatedRequests = await getJoinRequests();
      setRequests(updatedRequests);

    } catch (error) {
      console.error('Error in request action:', error);
      if (error instanceof Error) {
        toast.error(`Failed to process request: ${error.message}`);
      } else {
        toast.error('Failed to process request');
      }
    }
  };

  const handleRevertToPending = async (requestId: string) => {
    try {
      await updateJoinRequestStatus(requestId, 'pending', auth.currentUser?.email ?? '');
      const updatedRequests = await getJoinRequests();
      setRequests(updatedRequests);
      toast.success('Request reverted to pending');
    } catch (error) {
      console.error('Error reverting request:', error);
      toast.error('Failed to revert request');
    }
  };

  const handleResendEmail = async (request: JoinRequest) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch('/api/send-approval-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: request.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      toast.success('Approval email resent');
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error('Failed to resend email');
    }
  };

  // Group requests by status
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const otherRequests = requests.filter(r => r.status !== 'pending');

  return (
    <main className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/admin"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">Join Requests</h1>
        </div>

        <div className="space-y-6">
          {/* Pending Requests Section */}
          {pendingRequests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Pending Requests ({pendingRequests.length})
              </h2>
              <div className="space-y-4">
                {pendingRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-400"
                  >
                    {/* Request content */}
                    <h3 className="text-xl font-semibold mb-1">{request.name}</h3>
                    <p className="text-gray-600 mb-3">{request.email}</p>
                    
                    <div className="mb-3">
                      <p className="text-gray-600">
                        <span className="font-medium">Interests:</span> {request.interests}
                      </p>
                      {request.linkedinUrl && (
                        <a 
                          href={request.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 text-sm"
                        >
                          LinkedIn Profile
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleRequestAction(request.id!, 'approved')}
                        className="px-4 py-2 text-sm bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRequestAction(request.id!, 'rejected')}
                        className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Divider if both sections have content */}
          {pendingRequests.length > 0 && otherRequests.length > 0 && (
            <hr className="my-8 border-gray-200" />
          )}

          {/* Other Requests Section */}
          {otherRequests.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Processed Requests ({otherRequests.length})
              </h2>
              <div className="space-y-4">
                {otherRequests.map((request) => (
                  <div 
                    key={request.id} 
                    className={`bg-white rounded-lg shadow p-4 border-l-4 ${
                      request.status === 'approved' ? 'border-emerald-400' : 'border-red-400'
                    }`}
                  >
                    {/* Request content */}
                    <h3 className="text-xl font-semibold mb-1">{request.name}</h3>
                    <p className="text-gray-600 mb-3">{request.email}</p>
                    
                    <div className="mb-3">
                      <p className="text-gray-600">
                        <span className="font-medium">Interests:</span> {request.interests}
                      </p>
                      {request.linkedinUrl && (
                        <a 
                          href={request.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 text-sm"
                        >
                          LinkedIn Profile
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        request.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                      <button
                        onClick={() => handleRevertToPending(request.id!)}
                        className="px-4 py-2 text-sm bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 cursor-pointer"
                      >
                        Revert to Pending
                      </button>
                      {request.status === 'approved' && (
                        <button
                          onClick={() => handleResendEmail(request)}
                          className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 cursor-pointer"
                        >
                          Resend Email
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
} 