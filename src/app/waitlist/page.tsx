'use client';

import { useState, useRef } from 'react';
import { addDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { trackEvent } from '@/utils/analytics';
import ReCAPTCHA from "react-google-recaptcha";

export default function WaitlistPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [interests, setInterests] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Handle reCAPTCHA change
  const handleCaptchaChange = (token: string | null) => {
    setCaptchaToken(token);
  };

  // Handle reCAPTCHA expiration
  const handleCaptchaExpired = () => {
    setCaptchaToken(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !name) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate reCAPTCHA
    if (!captchaToken) {
      toast.error('Please complete the captcha verification.');
      return;
    }

    setIsSubmitting(true);

    try {
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

      // Check if email already exists in the waitlist
      const waitlistRef = collection(db, 'waitlist');
      const q = query(waitlistRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        toast.success('You are already on our waitlist!');
        setIsSubmitted(true);
        trackEvent('waitlist_duplicate', {
          email: email
        });
        return;
      }

      // Add to waitlist
      await addDoc(waitlistRef, {
        email: email.toLowerCase(),
        name,
        interests: interests || '',
        createdAt: new Date().toISOString()
      });

      // Track success
      trackEvent('waitlist_signup', {
        success: true
      });

      toast.success('You have been added to the waitlist!');
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error adding to waitlist:', error);
      toast.error('Failed to join waitlist. Please try again.');
      
      // Reset captcha
      if (recaptchaRef.current) {
        recaptchaRef.current.reset();
      }
      setCaptchaToken(null);
      
      // Track error
      trackEvent('waitlist_signup', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">YAMLRG Waitlist</h1>
        
        <div className="bg-emerald-50 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold text-emerald-800 mb-3">About the Waitlist</h2>
          <p className="text-emerald-700 mb-2">
            Join our waitlist to stay updated on upcoming events, workshops, and opportunities to connect with other ML enthusiasts.
          </p>
          <p className="text-emerald-700">
            We&apos;ll notify you when new community events are scheduled and when your membership request is approved.
          </p>
        </div>
        
        {isSubmitted ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">
            <h2 className="text-2xl font-bold mb-4">Thanks for joining our waitlist! 🎉</h2>
            <p className="mb-4">
              We&apos;ll keep you updated on our upcoming events and when your membership is approved.
            </p>
            <Link 
              href="/"
              className="inline-block mt-4 bg-emerald-700 text-white px-6 py-2 rounded-lg hover:bg-emerald-800 transition-colors"
            >
              Return to Home Page
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="Your full name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                placeholder="your.email@example.com"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium">
                  What interests you about YAMLRG?
                </label>
                <span className="text-sm text-gray-500">
                  {interests.length}/250
                </span>
              </div>
              <textarea
                maxLength={250}
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                rows={4}
                placeholder="Tell us what you're interested in learning or discussing..."
              />
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
              {isSubmitting ? 'Submitting...' : 'Join Waitlist'}
            </button>
          </form>
        )}
        
        <p className="text-center mt-8 text-gray-600">
          Already a member?{' '}
          <Link href="/login" className="text-emerald-700 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </main>
  );
}