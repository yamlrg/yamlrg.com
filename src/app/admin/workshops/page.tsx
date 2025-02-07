'use client';

import { useState, useEffect } from 'react';
import { Workshop } from '../../types';
import { getWorkshops, addWorkshop, updateWorkshop } from '../../firebase/firestoreOperations';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function WorkshopsPage() {
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

  useEffect(() => {
    const fetchWorkshops = async () => {
      const fetchedWorkshops = await getWorkshops();
      setWorkshops(fetchedWorkshops);
    };

    fetchWorkshops();
  }, []);

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

  return (
    <main className="min-h-screen p-4 md:p-8">
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
      </div>
    </main>
  );
} 