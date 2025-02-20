import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { POINTS } from '@/app/config/points';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RulesModal({ isOpen, onClose }: RulesModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <div className="flex justify-between items-start">
                  <Dialog.Title className="text-xl font-semibold">
                    How to Earn Points
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Participation</h3>
                    <ul className="space-y-1 text-sm">
                      <li className="flex justify-between">
                        <span>Gradient Connect signup</span>
                        <span>{POINTS.GRADIENT_CONNECT_SIGNUP} pts</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Gradient Connect attendance</span>
                        <span>{POINTS.GRADIENT_CONNECT_ATTENDANCE} pts</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Content</h3>
                    <ul className="space-y-1 text-sm">
                      <li className="flex justify-between">
                        <span>Add to reading list</span>
                        <span>{POINTS.READING_LIST_ADD} pts</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Workshop presentation</span>
                        <span>{POINTS.WORKSHOP_PRESENTATION} pts</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Workshop attendance</span>
                        <span>{POINTS.WORKSHOP_ATTENDANCE} pts</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Profile</h3>
                    <ul className="space-y-1 text-sm">
                      <li className="flex justify-between">
                        <span>Complete profile</span>
                        <span>{POINTS.PROFILE_COMPLETION} pts</span>
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Engagement</h3>
                    <ul className="space-y-1 text-sm">
                      <li className="flex justify-between">
                        <span>Weekly login</span>
                        <span>{POINTS.WEEKLY_LOGIN} pts</span>
                      </li>
                      <li className="flex justify-between">
                        <span>First 4-week streak</span>
                        <span>{POINTS.FIRST_LOGIN_STREAK} pts</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 