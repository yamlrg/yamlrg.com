'use client';

import ProtectedPage from "@/components/ProtectedPage";
import { useEffect, useState } from "react";
import { getReadingList, addToReadingList, deleteReadingListItem } from "../firebase/firestoreOperations";
import Link from "next/link";
import { trackEvent } from "@/utils/analytics";
import { XMarkIcon } from '@heroicons/react/24/outline';
import { auth } from "../firebase/firebaseConfig";
import { toast } from "react-hot-toast";
import { ADMIN_EMAILS } from "../config/admin";

type ReadingItem = {
  id: string;
  title: string;
  url: string;
  author?: string;
  addedBy: string;  // email for identification
  addedByName: string;  // display name for UI
  addedAt: string;
};

export default function ReadingListPage() {
  const [readingList, setReadingList] = useState<ReadingItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ReadingItem | null>(null);
  const [newItem, setNewItem] = useState({
    title: '',
    url: '',
    author: ''
  });

  useEffect(() => {
    fetchReadingList();
  }, []);

  const fetchReadingList = async () => {
    const list = await getReadingList();
    setReadingList(list as ReadingItem[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addToReadingList(newItem);
      trackEvent('reading_list_item_added', {
        title: newItem.title,
        has_author: !!newItem.author
      });
      setNewItem({ title: '', url: '', author: '' });
      setShowAddForm(false);
      await fetchReadingList();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleDeleteClick = (item: ReadingItem) => {
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;

    // Check if user can delete this item
    const canDelete = item.addedBy === currentUser.email || 
                     ADMIN_EMAILS.includes(currentUser.email);
    
    if (!canDelete) {
      toast.error('You can only delete your own items');
      return;
    }

    setItemToDelete(item);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await deleteReadingListItem(itemToDelete.id);
      toast.success('Item deleted successfully');
      await fetchReadingList();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <ProtectedPage>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Reading List 📚</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full sm:w-auto px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {showAddForm ? 'Cancel' : 'Add Resource'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-8 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={newItem.title}
                  onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">URL *</label>
                <input
                  type="url"
                  value={newItem.url}
                  onChange={(e) => setNewItem({ ...newItem, url: e.target.value })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Author (optional)</label>
                <input
                  type="text"
                  value={newItem.author}
                  onChange={(e) => setNewItem({ ...newItem, author: e.target.value })}
                  className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  placeholder="e.g., John Doe"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Add to Reading List
              </button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {readingList.map((item) => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow relative">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <h2 className="text-lg sm:text-xl font-semibold break-words">
                    <Link href={item.url} target="_blank" className="hover:text-blue-500">
                      {item.title}
                    </Link>
                  </h2>
                  {item.author && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">by {item.author}</p>
                  )}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 shrink-0">
                  <p>Added by {item.addedByName}</p>
                  <p>{new Date(item.addedAt).toLocaleDateString()}</p>
                </div>
              </div>
              
              {/* Delete button */}
              {(auth.currentUser?.email && 
                (item.addedBy === auth.currentUser.email ||
                 ADMIN_EMAILS.includes(auth.currentUser.email))) && (
                <button
                  onClick={() => handleDeleteClick(item)}
                  className="absolute top-4 right-4 p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-gray-100"
                  title="Delete item"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}

          {readingList.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No resources added yet. Be the first to share something!
            </p>
          )}
        </div>

        {/* Confirmation Modal */}
        {itemToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
              <p className="mb-6">
                Are you sure you want to delete &quot;{itemToDelete.title}&quot;?
              </p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setItemToDelete(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
} 