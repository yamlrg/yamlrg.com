'use client';

import { useState } from 'react';
import { fixMissingJoinDates, fixTimestampJoinDates } from '@/app/firebase/firestoreOperations';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function MigrationsPage() {
  const [isRunning, setIsRunning] = useState(false);

  const handleFixJoinDates = async () => {
    try {
      setIsRunning(true);
      toast.loading('Running migration...');
      await fixMissingJoinDates();
      toast.dismiss();
      toast.success('Successfully fixed missing join dates');
    } catch (error) {
      console.error('Migration error:', error);
      toast.dismiss();
      toast.error('Failed to run migration');
    } finally {
      setIsRunning(false);
    }
  };

  const handleFixTimestampJoinDates = async () => {
    try {
      setIsRunning(true);
      toast.loading('Running migration...');
      await fixTimestampJoinDates();
      toast.dismiss();
      toast.success('Successfully converted timestamp join dates');
    } catch (error) {
      console.error('Migration error:', error);
      toast.dismiss();
      toast.error('Failed to run migration');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link 
            href="/admin"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </Link>
          <h1 className="text-3xl font-bold">Database Migrations</h1>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Available Migrations</h2>
          
          <div className="space-y-6">
            <div className="border-b pb-6">
              <h3 className="font-medium mb-2">Fix Missing Join Dates</h3>
              <p className="text-gray-600 text-sm mb-4">
                This migration will set the joinedAt field for all users who have an approvedAt date but no joinedAt date.
              </p>
              <button
                onClick={handleFixJoinDates}
                disabled={isRunning}
                className={`px-4 py-2 rounded-md text-white ${
                  isRunning 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isRunning ? 'Running...' : 'Run Migration'}
              </button>
            </div>

            <div className="border-b pb-6">
              <h3 className="font-medium mb-2">Convert Timestamp Join Dates</h3>
              <p className="text-gray-600 text-sm mb-4">
                This migration will convert joinedAt fields from Firestore Timestamps to ISO string format.
              </p>
              <button
                onClick={handleFixTimestampJoinDates}
                disabled={isRunning}
                className={`px-4 py-2 rounded-md text-white ${
                  isRunning 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isRunning ? 'Running...' : 'Run Migration'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
} 