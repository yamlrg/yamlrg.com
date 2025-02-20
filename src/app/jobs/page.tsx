'use client';

import { useEffect, useState } from 'react';
import { getAllUsers } from '../firebase/firestoreOperations';
import { YamlrgUserProfile, JobListing } from '../types';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';
import { auth, db } from '../firebase/firebaseConfig';
import { doc, updateDoc, DocumentData, getDoc } from 'firebase/firestore';
import { ADMIN_EMAILS } from '../config/admin';
import toast, { Toaster } from 'react-hot-toast';
import { EnvelopeIcon } from '@heroicons/react/24/outline';
import { FaLinkedin } from 'react-icons/fa';
import ProtectedPage from "@/components/ProtectedPage";

interface JobWithPoster {
  job: JobListing;
  poster: YamlrgUserProfile;
}

// Extract mapping function
const mapUserToJobs = (userData: DocumentData): JobWithPoster[] => {
  const user = userData as YamlrgUserProfile;
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
  const [showNewJobForm, setShowNewJobForm] = useState(false);
  const [newJob, setNewJob] = useState({
    title: '',
    company: '',
    link: ''
  });

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
      // Check if user is admin or the job poster
      if (!ADMIN_EMAILS.includes(auth.currentUser?.email || '') && auth.currentUser?.uid !== posterUid) {
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
      const jobListing: JobListing = {
        ...newJob,
        postedAt: new Date().toISOString()
      };

      // Get current user document
      const userRef = doc(db, 'users', auth.currentUser!.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      const currentListings = userData?.jobListings || [];
      const updatedListings = [...currentListings, jobListing];

      // Update Firestore
      await updateDoc(userRef, {
        jobListings: updatedListings
      });

      // Update local state
      const userDetails = jobs.find(j => j.poster.uid === auth.currentUser!.uid)?.poster || {
        uid: auth.currentUser!.uid,
        displayName: auth.currentUser!.displayName,
        photoURL: auth.currentUser!.photoURL
      };

      setJobs(prev => [...prev, {
        job: jobListing,
        poster: userDetails as YamlrgUserProfile
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
    <ProtectedPage>
      <main className="min-h-screen p-4 sm:p-8">
        <Toaster position="top-center" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Jobs at YAMLRG Companies</h1>
          <button
            onClick={() => setShowNewJobForm(true)}
            className="w-full sm:w-auto bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800"
          >
            Post a Job
          </button>
        </div>

        {/* New Job Form Modal */}
        {showNewJobForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
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
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4">
                  <button
                    onClick={() => setShowNewJobForm(false)}
                    className="w-full sm:w-auto px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddJob}
                    disabled={!newJob.title || !newJob.company || !newJob.link}
                    className="w-full sm:w-auto bg-emerald-700 text-white px-4 py-2 rounded hover:bg-emerald-800 disabled:opacity-50"
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
            <div key={`${poster.uid}-${index}`} className="relative group">
              <a
                href={job.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block border rounded-lg p-6 bg-white hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-emerald-600 transition-colors">
                      {job.title}
                    </h2>
                    <div className="flex items-center gap-2 text-gray-600 mb-1">
                      <span>at </span>
                      <span className="font-medium">{job.company}</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-3">
                      Posted {formatDistanceToNow(new Date(job.postedAt))} ago
                    </p>
                  </div>
                  {(ADMIN_EMAILS.includes(auth.currentUser?.email || '') || auth.currentUser?.uid === poster.uid) && (
                    <button
                      onClick={(e) => {
                        e.preventDefault(); // Prevent card click when clicking delete
                        handleDeleteJob(poster.uid, job);
                      }}
                      className="text-gray-400 hover:text-red-600 transition-colors z-10"
                      title="Delete job listing"
                    >
                      ❌
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    {poster.photoURL && (
                      <Image
                        src={poster.photoURL}
                        alt={poster.displayName ?? ''}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm text-gray-600">
                      Posted by {poster.displayName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        navigator.clipboard.writeText(poster.email);
                        toast.success('Email copied to clipboard!');
                      }}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title={poster.email}
                    >
                      <EnvelopeIcon className="w-5 h-5" />
                    </button>
                    {poster.linkedinUrl && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          const url = poster.linkedinUrl?.startsWith('http')
                            ? poster.linkedinUrl
                            : `https://www.linkedin.com/in/${poster.linkedinUrl || ''}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                        title="View LinkedIn Profile"
                      >
                        <FaLinkedin className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </a>
            </div>
          ))}

          {jobs.length === 0 && (
            <div className="col-span-full text-center py-6 px-4 border-2 border-dashed rounded-lg">
              <p className="text-gray-600 mb-3">No jobs posted yet!</p>
              <p className="text-gray-600">
                Have a position to fill? {' '}
                <button
                  onClick={() => setShowNewJobForm(true)}
                  className="text-emerald-600 hover:text-emerald-800 hover:underline font-medium"
                >
                  Post a job
                </button>
              </p>
            </div>
          )}
        </div>
      </main>
    </ProtectedPage>
  );
} 