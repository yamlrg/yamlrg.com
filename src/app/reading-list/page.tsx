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

const isLessThanTwoWeeksOld = (date: string) => {
  const itemDate = new Date(date);
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  return itemDate > twoWeeksAgo;
};

const getTimeElapsed = (date: string) => {
  const now = new Date();
  const itemDate = new Date(date);
  const diffInDays = Math.floor((now.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'today';
  if (diffInDays === 1) return 'yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 14) return '1 week ago';
  if (diffInDays < 21) return '2 weeks ago';
  if (diffInDays < 30) return '3 weeks ago';
  if (diffInDays < 60) return '1 month ago';
  return `${Math.floor(diffInDays / 30)} months ago`;
};

const TITLE_MAX_LENGTH = 100;
const URL_MAX_LENGTH = 500;
const AUTHOR_MAX_LENGTH = 50;

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
      toast.success('Resource added successfully!');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add resource');
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
      <main className="min-h-screen p-4">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold">Reading List 📚</h1>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800"
            >
              {showAddForm ? 'Cancel' : 'Add Resource'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-8 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">Title *</label>
                    <span className="text-xs text-gray-500">
                      {newItem.title.length}/{TITLE_MAX_LENGTH}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newItem.title}
                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value.slice(0, TITLE_MAX_LENGTH) })}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required
                    maxLength={TITLE_MAX_LENGTH}
                    placeholder="Enter a descriptive title"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">URL *</label>
                    <span className="text-xs text-gray-500">
                      {newItem.url.length}/{URL_MAX_LENGTH}
                    </span>
                  </div>
                  <input
                    type="url"
                    value={newItem.url}
                    onChange={(e) => setNewItem({ ...newItem, url: e.target.value.slice(0, URL_MAX_LENGTH) })}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    required
                    maxLength={URL_MAX_LENGTH}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium">Author (optional)</label>
                    <span className="text-xs text-gray-500">
                      {newItem.author.length}/{AUTHOR_MAX_LENGTH}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={newItem.author}
                    onChange={(e) => setNewItem({ ...newItem, author: e.target.value.slice(0, AUTHOR_MAX_LENGTH) })}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                    maxLength={AUTHOR_MAX_LENGTH}
                    placeholder="e.g., John Doe"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-emerald-700 text-white rounded hover:bg-emerald-800"
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
                    <p>{getTimeElapsed(item.addedAt)}</p>
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
                <div className="space-y-4">
                  <p>
                    Are you sure you want to delete &quot;{itemToDelete.title}&quot;?
                  </p>
                  {isLessThanTwoWeeksOld(itemToDelete.addedAt) && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                      This item was added {getTimeElapsed(itemToDelete.addedAt)}. Items need to stay in the reading list for at least 2 weeks to keep the point you earned for adding it.
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-4 mt-6">
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
      </main>
    </ProtectedPage>
  );
} 