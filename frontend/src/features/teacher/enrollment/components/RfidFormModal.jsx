import React, { useState } from "react";
import { X, Rss } from "lucide-react";

function RfidFormModal({ isOpen, onClose, onConfirm }) {
  const [uid, setUid] = useState("");

  if (!isOpen) return null;

  // TODO: replace with a real listener for the RFID reader's keystrokes.
  function simulateTap() {
    setUid(String(Math.floor(100000000 + Math.random() * 900000000)));
  }

  function handleClear() {
    setUid("");
  }

  function handleAdd() {
    if (!uid) return;
    onConfirm(uid);
    setUid("");
  }

  return (
    <div className="font-primary fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center border-b border-gray-200 px-4 py-4 sm:px-6">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">RFID FORM</h2>
          <button onClick={onClose} className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6">
          <h3 className="text-sm font-bold tracking-wide text-primary uppercase">
            RFID Information
          </h3>

          <button
            type="button"
            onClick={simulateTap}
            className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-gray-300 text-primary transition-colors hover:border-primary"
          >
            <Rss size={40} />
            <span className="text-sm font-semibold">Tap RFID card here</span>
          </button>

          <div>
            <label className="mb-1 block text-sm font-semibold text-primary">
              RFID UID
            </label>
            <input
              type="text"
              value={uid}
              readOnly
              placeholder="Waiting for tap..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 outline-none"
            />
          </div>
        </div>

        {/* Footer — separated, rounded Add/Clear buttons */}
        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default RfidFormModal;