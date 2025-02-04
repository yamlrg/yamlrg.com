'use client';

import { useState } from 'react';
import { addJoinRequest } from '../firebase/firestoreOperations';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { trackEvent } from "@/utils/analytics";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

export default function JoinRequestPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    linkedinUrl: '',
    interests: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await addJoinRequest({
        ...formData,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      trackEvent('join_request_submitted', {
        has_linkedin: true // Always true now as it's required
      });

      // Sign out the user after successful submission
      await signOut(auth);
      
      toast.success('Request submitted successfully!');
      router.push('/join/success');
    } catch (error) {
      console.error('Error submitting join request:', error);
      toast.error('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Join YAMLRG</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">LinkedIn URL *</label>
            <input
              type="url"
              required
              value={formData.linkedinUrl}
              onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              placeholder="https://linkedin.com/in/yourusername"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium">
                Tell us about yourself and why you want to join YAMLRG *
              </label>
              <span className="text-sm text-gray-500">
                {formData.interests.length}/250
              </span>
            </div>
            <textarea
              required
              maxLength={250}
              value={formData.interests}
              onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
              className="w-full px-3 py-2 border rounded"
              rows={4}
              placeholder="Tell us about your background and what interests you about YAMLRG..."
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-700 text-white py-2 px-4 rounded hover:bg-emerald-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </main>
  );
} 