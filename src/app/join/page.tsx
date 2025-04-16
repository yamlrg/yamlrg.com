'use client';

import { useState, useEffect, useRef } from 'react';
import { addJoinRequest } from '../firebase/firestoreOperations';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { trackEvent } from "@/utils/analytics";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { formatLinkedInUrl } from '@/utils/linkedin';
import ReCAPTCHA from "react-google-recaptcha";

export default function JoinRequestPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    linkedinUrl: '',
    interests: '',
    loginMethod: 'google', // default to google
  });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleLinkedInChange = (value: string) => {
    // When submitting join request, store just the username
    setFormData(prev => ({ 
      ...prev, 
      linkedinUrl: formatLinkedInUrl(value, true)
    }));
  };

  // Handle reCAPTCHA change
  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  // Handle reCAPTCHA expiration
  const handleCaptchaExpired = () => {
    setCaptchaToken(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Validate reCAPTCHA
    if (!captchaToken) {
      toast.error('Please complete the captcha verification.');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const fullLinkedInUrl = formatLinkedInUrl(formData.linkedinUrl);

      // Verify reCAPTCHA token server-side
      const verifyResponse = await fetch('/api/verify-recaptcha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: captchaToken }),
      });

      const verifyResult = await verifyResponse.json();
      
      if (!verifyResult.success) {
        toast.error('Captcha verification failed. Please try again.');
        // Reset captcha
        if (recaptchaRef.current) {
          recaptchaRef.current.reset();
        }
        setCaptchaToken(null);
        setIsSubmitting(false);
        return;
      }

      const result = await addJoinRequest({
        ...formData,
        linkedinUrl: fullLinkedInUrl,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Send admin notification
      try {
        await fetch('/api/send-approval-email/admin-notification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            interests: formData.interests,
            linkedinUrl: fullLinkedInUrl
          })
        });
      } catch (error) {
        console.error('Error sending admin notification:', error);
        // Don't block the main flow if notification fails
      }

      // Always track and redirect, whether new or existing
      trackEvent('join_request_submitted', {
        is_duplicate: result.exists
      });

      await signOut(auth);
      
      toast.success('Request submitted successfully!');
      router.push('/join/success');
    } catch (error) {
      console.error('Error submitting join request:', error);
      toast.error('Failed to submit request. Please try again.');
      
      // Reset captcha
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setCaptchaToken(null);
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
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">LinkedIn Username *</label>
            <div className="flex items-center">
              <span className="text-gray-500 bg-gray-50 px-3 py-2 border border-r-0 rounded-l">
                linkedin.com/in/
              </span>
              <input
                type="text"
                required
                value={formData.linkedinUrl}
                onChange={(e) => handleLinkedInChange(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-r"
                placeholder="yourusername"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enter your LinkedIn username or paste your full profile URL
            </p>
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

          <div>
            <label className="block text-sm font-medium mb-1">Preferred Login Method *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="loginMethod"
                  value="google"
                  checked={formData.loginMethod === 'google'}
                  onChange={() => setFormData(prev => ({ ...prev, loginMethod: 'google' }))}
                />
                Google
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="loginMethod"
                  value="email"
                  checked={formData.loginMethod === 'email'}
                  onChange={() => setFormData(prev => ({ ...prev, loginMethod: 'email' }))}
                />
                Email
              </label>
            </div>
          </div>

          {/* reCAPTCHA component */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Verify you're human *
            </label>
            <div className="mt-2">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''}
                onChange={handleCaptchaChange}
                onExpired={handleCaptchaExpired}
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              This helps us prevent spam submissions.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !captchaToken}
            className="w-full bg-emerald-700 text-white py-2 px-4 rounded hover:bg-emerald-800 disabled:opacity-50"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>
      </div>
    </main>
  );
} 