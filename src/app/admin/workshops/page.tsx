'use client';

import { useState, useEffect } from 'react';
import { Workshop, PresentationRequest } from '../../types';
import { getWorkshops, addWorkshop, updateWorkshop, getPresentationRequests, deletePresentationRequest } from '../../firebase/firestoreOperations';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase/firebaseConfig';
import AdminProtectedPage from "@/components/AdminProtectedPage";

export default function WorkshopsPage() {
  const [user, loading] = useAuthState(auth);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [workshop, setWorkshop] = useState<Workshop>({
    title: '',
    presenterName: '',
    presenterLinkedIn: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    youtubeUrl: '',
    resources: [],
    type: 'paper'
  });
  const [presentationRequests, setPresentationRequests] = useState<PresentationRequest[]>([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    requestId: string | null;
  }>({
    isOpen: false,
    requestId: null
  });

  useEffect(() => {
    const fetchData = async () => {
      if (loading) return; // Wait while auth is loading
      if (!user) return; // Don't fetch if no user

      try {
        const [workshopsData, requestsData] = await Promise.all([
          getWorkshops(),
          getPresentationRequests()
        ]);
        
        setWorkshops(workshopsData);
        setPresentationRequests(requestsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load data');
      }
    };

    fetchData();
  }, [user, loading]); // Depend on user and loading state

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanedWorkshop = {
        ...workshop,
        resources: (workshop.resources ?? []).filter(r => r.trim() !== '')
      };

      if (editingWorkshop?.id) {
        await updateWorkshop(editingWorkshop.id, cleanedWorkshop);
        toast.success('Workshop updated successfully');
      } else {
        await addWorkshop(cleanedWorkshop);
        toast.success('Workshop created successfully');
      }

      // Refresh workshops list
      const updatedWorkshops = await getWorkshops();
      setWorkshops(updatedWorkshops);
      
      // Reset form
      setShowForm(false);
      setEditingWorkshop(null);
      setWorkshop({
        title: '',
        presenterName: '',
        presenterLinkedIn: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        youtubeUrl: '',
        resources: [],
        type: 'paper'
      });
    } catch (error) {
      console.error('Error saving workshop:', error);
      toast.error('Failed to save workshop');
    }
  };

  const handleEdit = (workshop: Workshop) => {
    setEditingWorkshop(workshop);
    setWorkshop({
      ...workshop,
      date: new Date(workshop.date).toISOString().split('T')[0]
    });
    setShowForm(true);
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await deletePresentationRequest(requestId);
      setPresentationRequests(prev => 
        prev.filter(request => request.id !== requestId)
      );
      toast.success('Request deleted successfully');
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    }
  };

  // Show loading state
  if (loading) {
    return (
      <main className="min-h-screen p-4 md:p-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
            <h1 className="text-3xl font-bold">Workshops</h1>
          </div>
          <p className="text-center text-gray-500">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <AdminProtectedPage>
      <main className="min-h-screen p-4">
        <Toaster position="top-center" />
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin"
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeftIcon className="w-6 h-6" />
              </Link>
              <h1 className="text-3xl font-bold">Workshops</h1>
            </div>
            <button
              onClick={() => {
                setEditingWorkshop(null);
                setWorkshop({
                  title: '',
                  presenterName: '',
                  presenterLinkedIn: '',
                  date: new Date().toISOString().split('T')[0],
                  description: '',
                  youtubeUrl: '',
                  resources: [],
                  type: 'paper'
                });
                setShowForm(true);
              }}
              className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
            >
              Add Workshop
            </button>
          </div>

          {/* Workshop Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">
                    {editingWorkshop ? 'Edit Workshop' : 'New Workshop'}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Form fields */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Title</label>
                    <input
                      type="text"
                      value={workshop.title}
                      onChange={(e) => setWorkshop(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Presenter Name</label>
                    <input
                      type="text"
                      value={workshop.presenterName}
                      onChange={(e) => setWorkshop(prev => ({ ...prev, presenterName: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Presenter LinkedIn URL</label>
                    <input
                      type="url"
                      value={workshop.presenterLinkedIn}
                      onChange={(e) => setWorkshop(prev => ({ ...prev, presenterLinkedIn: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={workshop.date}
                      onChange={(e) => setWorkshop(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select
                      value={workshop.type}
                      onChange={(e) => setWorkshop(prev => ({ ...prev, type: e.target.value as Workshop['type'] }))}
                      className="w-full px-3 py-2 border rounded"
                    >
                      <option value="paper">Paper Presentation</option>
                      <option value="startup">Startup Presentation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <textarea
                      value={workshop.description}
                      onChange={(e) => setWorkshop(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                      rows={4}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">YouTube Recording URL</label>
                    <input
                      type="url"
                      value={workshop.youtubeUrl}
                      onChange={(e) => setWorkshop(prev => ({ ...prev, youtubeUrl: e.target.value }))}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Resources</label>
                    <div className="space-y-2">
                      {(workshop.resources ?? []).map((resource, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="url"
                            value={resource}
                            onChange={(e) => {
                              const newResources = [...(workshop.resources ?? [])];
                              newResources[index] = e.target.value;
                              setWorkshop(prev => ({ ...prev, resources: newResources }));
                            }}
                            placeholder="Resource URL"
                            className="flex-1 px-3 py-2 border rounded"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setWorkshop(prev => ({
                                ...prev,
                                resources: (prev.resources ?? []).filter((_, i) => i !== index)
                              }));
                            }}
                            className="px-3 py-2 text-red-600 hover:text-red-800"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setWorkshop(prev => ({
                            ...prev,
                            resources: [...(prev.resources ?? []), '']
                          }));
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        + Add Resource
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                    >
                      {editingWorkshop ? 'Update Workshop' : 'Create Workshop'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Workshops List */}
          <div className="space-y-6">
            {workshops.map((workshop) => (
              <div key={workshop.id} className="bg-white rounded-lg shadow p-4 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{workshop.title}</h3>
                    <p className="text-gray-600">{workshop.presenterName}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(workshop.date).toLocaleDateString()}
                    </p>
                    <p className="mt-2">{workshop.description}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEdit(workshop)}
                      className="px-4 py-2 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <section className="mt-8">
            <h2 className="text-xl font-bold mb-6">Presentation Requests</h2>
            
            {presentationRequests.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No presentation requests</p>
            ) : (
              <div className="space-y-4">
                {presentationRequests.map((request) => (
                  <div key={request.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{request.title}</h3>
                        <p className="text-sm text-gray-600">
                          By {request.userName} ({request.userEmail})
                        </p>
                        <p className="text-sm mt-2">{request.description}</p>
                        {request.proposedDate && (
                          <p className="text-sm text-gray-600 mt-1">
                            Proposed Date: {new Date(request.proposedDate).toLocaleDateString()}
                          </p>
                        )}
                        <div className="flex gap-2 mt-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            request.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            {request.type}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => setDeleteConfirmation({ 
                          isOpen: true, 
                          requestId: request.id! 
                        })}
                        className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Delete Confirmation Modal */}
          {deleteConfirmation.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                <h3 className="text-lg font-semibold mb-4">Delete Request</h3>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to delete this request? This action cannot be undone.
                </p>
                <div className="flex justify-end gap-4">
                  <button
                    onClick={() => setDeleteConfirmation({ isOpen: false, requestId: null })}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (deleteConfirmation.requestId) {
                        handleDeleteRequest(deleteConfirmation.requestId);
                        setDeleteConfirmation({ isOpen: false, requestId: null });
                      }
                    }}
                    className="px-4 py-2 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </AdminProtectedPage>
  );
} 