'use client';

import { useState, useEffect } from 'react';
import { getJoinRequests, updateJoinRequestStatus, deleteJoinRequest } from '@/app/firebase/firestoreOperations';
import { JoinRequest } from '@/app/types';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { auth } from '@/app/firebase/firebaseConfig';
import { formatLinkedInUrl } from '@/utils/linkedin';
import AdminProtectedPage from "@/components/AdminProtectedPage";

export default function JoinRequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  useEffect(() => {
    loadJoinRequests();
  }, []);

  const loadJoinRequests = async () => {
    const fetchedRequests = await getJoinRequests();
    setRequests(fetchedRequests);
  };

  const handleRequestAction = async (requestId: string, action: 'approved' | 'rejected') => {
    try {
      if (action === 'rejected') {
        await handleRejection(requestId);
        return;
      }
      await handleApproval(requestId);
    } catch (error) {
      handleActionError(error);
    }
  };

  const handleRejection = async (requestId: string) => {
    await updateJoinRequestStatus(requestId, 'rejected', auth.currentUser?.email ?? '');
    toast.success('Request rejected successfully');
    await loadJoinRequests();
  };

  const handleApproval = async (requestId: string) => {
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

    await sendApprovalEmail(request.email, token);
    await updateJoinRequestStatus(requestId, 'approved', auth.currentUser?.email ?? '');
    toast.success('Request approved and welcome email sent successfully');
    await loadJoinRequests();
  };

  const sendApprovalEmail = async (email: string, token: string) => {
    const response = await fetch('/api/send-approval-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email })
    });

    const responseClone = response.clone();
    
    try {
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }
      return data;
    } catch (error) {
      const responseText = await responseClone.text();
      console.error('Error sending approval email:', {
        error,
        status: response.status,
        responseText
      });
      throw new Error('Failed to send approval email');
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

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to delete this request?')) {
      return;
    }

    try {
      await deleteJoinRequest(requestId);
      toast.success('Request deleted successfully');
      await loadJoinRequests();
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    }
  };

  const handleActionError = (error: unknown) => {
    console.error('Error in request action:', error);
    if (error instanceof Error) {
      toast.error(`Failed to process request: ${error.message}`);
    } else {
      toast.error('Failed to process request');
    }
  };

  // Group requests by status
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const otherRequests = requests.filter(r => r.status !== 'pending');

  return (
    <AdminProtectedPage>
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
                      className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-400 relative"
                    >
                      <button
                        onClick={() => handleDelete(request.id!)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete request"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                      {/* Request content */}
                      <h3 className="text-xl font-semibold mb-1">{request.name}</h3>
                      <p className="text-gray-600 mb-3">{request.email}</p>
                      
                      <div className="mb-3">
                        <p className="text-gray-600">
                          <span className="font-medium">Interests:</span> {request.interests}
                        </p>
                        {request.linkedinUrl && (
                          <a 
                            href={formatLinkedInUrl(request.linkedinUrl)}
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
                      className={`bg-white rounded-lg shadow p-4 border-l-4 relative ${
                        request.status === 'approved' ? 'border-emerald-400' : 'border-red-400'
                      }`}
                    >
                      <button
                        onClick={() => handleDelete(request.id!)}
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete request"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                      {/* Request content */}
                      <h3 className="text-xl font-semibold mb-1">{request.name}</h3>
                      <p className="text-gray-600 mb-3">{request.email}</p>
                      
                      <div className="mb-3">
                        <p className="text-gray-600">
                          <span className="font-medium">Interests:</span> {request.interests}
                        </p>
                        {request.linkedinUrl && (
                          <a 
                            href={formatLinkedInUrl(request.linkedinUrl)}
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
    </AdminProtectedPage>
  );
} 