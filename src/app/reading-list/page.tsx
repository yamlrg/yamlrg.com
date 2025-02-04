'use client';

import ProtectedPage from "@/components/ProtectedPage";
import { useEffect, useState } from "react";
import { getReadingList, addToReadingList } from "../firebase/firestoreOperations";
import Link from "next/link";
import { trackEvent } from "@/utils/analytics";

type ReadingItem = {
  id: string;
  title: string;
  url: string;
  author?: string;
  addedBy: string;
  addedAt: string;
};

export default function ReadingListPage() {
  const [readingList, setReadingList] = useState<ReadingItem[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
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
            <div key={item.id} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow">
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
                  <p>Added by {item.addedBy}</p>
                  <p>{new Date(item.addedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}

          {readingList.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              No resources added yet. Be the first to share something!
            </p>
          )}
        </div>
      </div>
    </ProtectedPage>
  );
} 