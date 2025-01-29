'use client';

import { useEffect, useState } from 'react';
import { getAllUsers } from '../firebase/firestoreOperations';
import { ExtendedUser, JobListing } from '../types';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, updateDoc, DocumentData, getDoc } from 'firebase/firestore';
import { ADMIN_EMAILS } from '../config/admin';
import toast, { Toaster } from 'react-hot-toast';

interface JobWithPoster {
  job: JobListing;
  poster: ExtendedUser;
}

// Extract mapping function
const mapUserToJobs = (userData: DocumentData): JobWithPoster[] => {
  const user = userData as ExtendedUser;
  return (user.jobListings || []).map((job: JobListing) => ({
    job,
    poster: user
  }));
};

// Extract sorting function
const sortJobsByDate = (a: JobWithPoster, b: JobWithPoster): number => {
  return new Date(b.job.postedAt).getTime() - new Date(a.job.postedAt).getTime();
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobWithPoster[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    link: ''
  });

  useEffect(() => {
    const checkUserStatus = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      
      setIsApproved(userData?.isApproved || false);
    };

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAdmin(user?.email ? ADMIN_EMAILS.includes(user.email) : false);
      if (user) {
        checkUserStatus();
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchJobs = async () => {
      const users = await getAllUsers();
      const allJobs = users
        .flatMap(mapUserToJobs)
        .sort(sortJobsByDate);
      
      setJobs(allJobs);
    };

    fetchJobs();
  }, []);

  const handleDeleteJob = async (posterUid: string, jobToDelete: JobListing) => {
    if (!confirm('Are you sure you want to delete this job listing?')) {
      return;
    }

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error('You must be logged in');
        return;
      }

      // Check if user is admin or the job poster
      const isAdmin = ADMIN_EMAILS.includes(currentUser.email || '');
      if (!isAdmin && currentUser.uid !== posterUid) {
        toast.error('You can only delete your own job listings');
        return;
      }

      // Get current user document
      const userRef = doc(db, 'users', posterUid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (!userData?.jobListings) {
        toast.error('No job listings found');
        return;
      }

      // Find and remove the specific job
      const updatedListings = userData.jobListings.filter(
        (job: JobListing) => 
          job.title !== jobToDelete.title || 
          job.postedAt !== jobToDelete.postedAt
      );

      // Update Firestore
      await updateDoc(userRef, {
        jobListings: updatedListings
      });

      // Update local state
      setJobs(prevJobs => prevJobs.filter(
        job => 
          !(job.poster.uid === posterUid && 
            job.job.title === jobToDelete.title && 
            job.job.postedAt === jobToDelete.postedAt)
      ));

      toast.success('Job listing deleted successfully');
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job listing');
    }
  };

  const handleAddJob = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        toast.error('You must be logged in');
        return;
      }

      console.log('User status:', { isAdmin, isApproved, uid: currentUser.uid });

      if (!isAdmin && !isApproved) {
        toast.error('You must be an approved member to post jobs');
        return;
      }

      const jobListing: JobListing = {
        ...newJob,
        postedAt: new Date().toISOString()
      };

      console.log('Attempting to add job:', jobListing);

      // Get current user document
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      console.log('Current user data:', userData);

      const currentListings = userData?.jobListings || [];
      const updatedListings = [...currentListings, jobListing];

      console.log('Updating with listings:', updatedListings);

      // Update Firestore
      try {
        await updateDoc(userRef, {
          jobListings: updatedListings
        });
        console.log('Firestore update successful');
      } catch (error) {
        console.error('Firestore update failed:', error);
        throw error;
      }

      // Update local state
      const userDetails = jobs.find(j => j.poster.uid === currentUser.uid)?.poster || {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL
      };

      setJobs(prev => [...prev, {
        job: jobListing,
        poster: userDetails as ExtendedUser
      }]);

      // Reset form
      setNewJob({ title: '', company: '', link: '' });
      setShowNewJobForm(false);
      toast.success('Job posted successfully!');
    } catch (error) {
      console.error('Error posting job:', error);
      toast.error('Failed to post job');
    }
  };

  return (
    <main className="min-h-screen p-8">
      <Toaster position="top-center" />
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Jobs at YAMLRG Companies</h1>
        {(isAdmin || isApproved) && (
          <button
            onClick={() => setShowNewJobForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Post a Job
          </button>
        )}
      </div>

      {!isApproved && !isAdmin && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                You need to be an approved member to post jobs. Please contact an admin for approval.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New Job Form Modal */}
      {showNewJobForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Post a New Job</h2>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Job Title"
                value={newJob.title}
                onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <input
                type="text"
                placeholder="Company"
                value={newJob.company}
                onChange={(e) => setNewJob({ ...newJob, company: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <input
                type="url"
                placeholder="Link to Job Posting"
                value={newJob.link}
                onChange={(e) => setNewJob({ ...newJob, link: e.target.value })}
                className="w-full p-2 border rounded"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewJobForm(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddJob}
                  disabled={!newJob.title || !newJob.company || !newJob.link}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Post Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {jobs.map(({ job, poster }, index) => (
          <div key={`${poster.uid}-${index}`} className="border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-xl font-semibold">{job.title}</h2>
              {(isAdmin || auth.currentUser?.uid === poster.uid) && (
                <button
                  onClick={() => handleDeleteJob(poster.uid, job)}
                  className="text-red-600 hover:text-red-800 text-sm"
                  title="Delete job listing"
                >
                  ❌
                </button>
              )}
            </div>
            <p className="text-gray-600 mb-4">{job.company}</p>
            
            <div className="flex items-center gap-3 mb-4">
              {poster.photoURL && (
                <Image
                  src={poster.photoURL}
                  alt={poster.displayName ?? ''}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              )}
              <span className="text-sm text-gray-500">
                Posted by {poster.displayName}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <Link 
                href={job.link}
                target="_blank"
                className="text-blue-600 hover:text-blue-800"
              >
                View Job →
              </Link>
              <span className="text-sm text-gray-500">
                {formatDistanceToNow(new Date(job.postedAt))} ago
              </span>
            </div>
          </div>
        ))}
      </div>
      
      {jobs.length === 0 && (
        <p className="text-center text-gray-500 mt-8">
          No jobs posted yet. Check back soon!
        </p>
      )}
    </main>
  );
} 