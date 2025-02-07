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

  return (
    <main className="min-h-screen p-4 md:p-8">
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
          {requests.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No pending join requests</p>
          ) : (
            requests.map((request) => (
              <div 
                key={request.id} 
                className="bg-white rounded-lg shadow p-4 md:p-6"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Request Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{request.name}</h3>
                    <p className="text-gray-600">{request.email}</p>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600">
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
                  </div>

                  {/* Request Status */}
                  <div className="flex flex-wrap md:justify-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      request.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>

                  {/* Actions */}
                  {request.status === 'pending' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleRequestAction(request.id!, 'approved')}
                        className="px-4 py-2 text-sm bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRequestAction(request.id!, 'rejected')}
                        className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
} 