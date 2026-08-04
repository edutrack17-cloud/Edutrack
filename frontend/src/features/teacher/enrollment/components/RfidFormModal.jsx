import React, { useState } from "react";
import { X, Rss, Check } from "lucide-react";

function RfidFormModal({ isOpen, onClose, onConfirm }) {
  const [uid, setUid] = useState("");

  if (!isOpen) return null;

  // TODO: BACKEND / HARDWARE CONNECTION
  // Replace this with a real listener for the RFID reader. Most USB
  // RFID readers act like a keyboard — they "type" the UID + Enter
  // very fast into whatever input is focused. For now, this button
  // just fakes a random 9-digit UID so the flow can be tested without
  // physical hardware connected.
  function simulateTap() {
    const fakeUid = String(Math.floor(100000000 + Math.random() * 900000000));
    setUid(fakeUid);
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
    <div className="font-primary fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4">
      <div className="max-h-[95vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="w-6" />
          <h2 className="flex-1 text-center text-base font-bold text-primary sm:text-lg md:text-xl">
            RFID FORM
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-700">
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
          <h3 className="text-sm font-bold tracking-wide text-primary uppercase">
            RFID Information
          </h3>

          <button
            type="button"
            onClick={simulateTap}
            className={`flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border transition-colors sm:h-40 ${
              uid
                ? "border-success text-success"
                : "border-gray-300 text-gray-500  hover:border-gray"
            }`}
          >
            {uid ? <Check size={40} /> : <Rss size={40} />}
            <span className="text-sm font-semibold">
              {uid ? "Card Detected" : "Tap RFID card on the Scanner"}
            </span>
          </button>

          <div>
            <label className="mb-1 block text-sm font-semibold text-primary ">
              RFID UID
            </label>
            <input
              type="text"
              value={uid}
              readOnly
              placeholder="Waiting for tap..."
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none ${
                uid ? "border-success text-success font-semibold" : "border-gray-500 text-gray-700"
              }`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-200 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!uid}
            className="flex-1 cursor-pointer rounded-lg bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-90"
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