// DeleteModal.jsx
//used to confirm deletion of items like repositories or documents
import React from "react";

export default function DeleteModal({
  isOpen,
  onClose,
  onConfirm,
  itemType = "item",
  itemName = "",
  itemContent = "",
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60]">
      <div className="bg-white dark:bg-gray-800 p-6 w-[400px] shadow-xl">
        <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
          Confirm Delete
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Are you sure you want to delete the following {itemType}?
        </p>

        {itemContent && (
          <div className="w-full px-3 py-2 mb-4 h-48 border bg-white dark:bg-gray-900 dark:border-gray-600 text-gray-900 dark:text-gray-100 overflow-y-auto break-words">
            {itemContent}
          </div>
        )}

        {itemName && !itemContent && (
          <p className="text-gray-900 dark:text-gray-100 mb-4">{itemName}</p>
        )}

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-400 dark:hover:bg-gray-600"
          >
            No
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-[#3200c8] dark:bg-[#8080ff] text-white hover:bg-[#220094] dark:hover:bg-[#6060dd]"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
