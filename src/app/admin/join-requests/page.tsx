'use client';

import { useState, useEffect } from 'react';
import { getJoinRequests } from '../../firebase/firestoreOperations';
import { JoinRequest } from '../../types';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

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
      // Get the current user's token
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      if (action === 'approved') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          console.log('Starting approval process for:', {
            requestId,
            userEmail: request.email,
            approverEmail: auth.currentUser?.email
          });

          // Send welcome email first
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

          console.log('Email API response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Email API error details:', errorData);
            throw new Error(`Failed to send approval email: ${response.status} ${response.statusText}`);
          }

          console.log('Email sent successfully, updating request status');
          // Only update request status after email is sent successfully
          await updateJoinRequestStatus(requestId, action, auth.currentUser?.email || '');
        }
      } else {
        // For rejection, just update the status
        await updateJoinRequestStatus(requestId, action, auth.currentUser?.email || '');
      }

      // Refresh requests
      const updatedRequests = await getJoinRequests();
      setRequests(updatedRequests);
      toast.success(`Request ${action} successfully`);
    } catch (error) {
      console.error('Error in handleRequestAction:', {
        error,
        action,
        requestId,
        currentUser: auth.currentUser?.email
      });
      toast.error(error instanceof Error ? error.message : 'Failed to update request');
    }
  };

  const handleRevertToPending = async (requestId: string) => {
    try {
      await updateJoinRequestStatus(requestId, 'pending', auth.currentUser?.email || '');
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
          {requests.map((request) => (
            <div 
              key={request.id} 
              className="bg-white rounded-lg shadow p-4"
            >
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
                {request.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleRequestAction(request.id!, 'approved')}
                      className="px-4 py-2 text-sm bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRequestAction(request.id!, 'rejected')}
                      className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      request.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                    <button
                      onClick={() => handleRevertToPending(request.id!)}
                      className="px-4 py-2 text-sm bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100"
                    >
                      Revert to Pending
                    </button>
                    {request.status === 'approved' && (
                      <button
                        onClick={() => handleResendEmail(request)}
                        className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                      >
                        Resend Email
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
} 