'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { addWorkshop, getWorkshops, updateWorkshop } from '@/app/firebase/firestoreOperations';
import { Workshop } from '@/app/types';
import { auth } from '@/app/firebase/firebaseConfig';
import { ADMIN_EMAILS } from '@/app/config/admin';
import toast, { Toaster } from 'react-hot-toast';

export default function WorkshopForm() {
  const router = useRouter();
  const params = useParams();
  const isEditing = params.action !== 'new';
  
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
    const checkAdmin = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser?.email || !ADMIN_EMAILS.includes(currentUser.email)) {
        router.push('/');
        toast.error('Unauthorized access');
        return;
      }

      if (isEditing) {
        // Fetch workshop data if editing
        const workshops = await getWorkshops();
        const workshopToEdit = workshops.find(w => w.id === params.action);
        if (workshopToEdit) {
          setWorkshop({
            ...workshopToEdit,
            date: new Date(workshopToEdit.date).toISOString().split('T')[0]
          });
        } else {
          toast.error('Workshop not found');
          router.push('/admin');
        }
      }
    };

    checkAdmin();
  }, [router, isEditing, params.action]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Filter out empty resource URLs
      const cleanedWorkshop = {
        ...workshop,
        resources: (workshop.resources ?? []).filter(r => r.trim() !== '')
      };

      if (isEditing) {
        await updateWorkshop(params.action as string, cleanedWorkshop);
        toast.success('Workshop updated successfully');
      } else {
        await addWorkshop(cleanedWorkshop);
        toast.success('Workshop created successfully');
      }
      
      router.push('/admin');
    } catch (error) {
      console.error('Error saving workshop:', error);
      toast.error('Failed to save workshop');
    }
  };

  const addResourceField = () => {
    setWorkshop(prev => ({
      ...prev,
      resources: [...(prev.resources ?? []), '']
    }));
  };

  const updateResource = (index: number, value: string) => {
    const newResources = [...(workshop.resources ?? [])];
    newResources[index] = value;
    setWorkshop(prev => ({
      ...prev,
      resources: newResources
    }));
  };

  const removeResource = (index: number) => {
    setWorkshop(prev => ({
      ...prev,
      resources: (prev.resources ?? []).filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="min-h-screen p-4">
      <Toaster position="top-center" />
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Workshop' : 'New Workshop'}
          </h1>
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                    onChange={(e) => updateResource(index, e.target.value)}
                    placeholder="Resource URL"
                    className="flex-1 px-3 py-2 border rounded"
                  />
                  <button
                    type="button"
                    onClick={() => removeResource(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addResourceField}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                + Add Resource
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push('/admin')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600"
            >
              {isEditing ? 'Update Workshop' : 'Create Workshop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 