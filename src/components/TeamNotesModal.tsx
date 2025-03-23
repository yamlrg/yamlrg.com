'use client';

import { useState } from 'react';

interface Props {
  teamId: string;
  currentNotes?: string;
  onSave: (notes: string) => void;
  onClose: () => void;
}

export function TeamNotesModal({ teamId, currentNotes = '', onSave, onClose }: Props) {
  const [notes, setNotes] = useState(currentNotes);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">Team {teamId} Notes</h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full h-32 p-2 border rounded-md mb-4"
          placeholder="Add notes about this team..."
        />
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(notes);
              onClose();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
} 