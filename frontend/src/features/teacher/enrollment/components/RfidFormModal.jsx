import React, { useEffect, useRef, useState } from "react";
import { X, Rss, Check } from "lucide-react";

// REAL SCANNER CONNECTION (replaces the old simulateTap() mock)
//
// The USB RFID readers we're targeting don't need any special driver,
// WebUSB/WebHID permission prompt, or backend endpoint - they're
// "keyboard wedge" devices. To the browser they look exactly like
// someone typing on a keyboard: tapping a card makes the reader type
// out the card's UID character-by-character, then press Enter, all
// within a few milliseconds. A person can't type anywhere near that
// fast, so we tell a real tap apart from real typing purely by timing
// the gap between keydown events - no hardware API needed, as long as
// this modal has focus somewhere on the page (which it always does
// while it's the open modal).
//
// If your specific reader behaves differently (e.g. it needs Web
// Serial/Web HID because it does NOT emulate a keyboard, or it sends a
// prefix character before the UID, or its digits arrive slower than
// SCAN_KEY_GAP_MS apart), this is the one place to adjust - everything
// below just needs onScan(uid) to eventually get called.
const SCAN_KEY_GAP_MS = 50; // max ms between characters that still counts as "one tap" rather than a human typing
const SCAN_MIN_LENGTH = 4; // ignore anything shorter than this - stray/accidental keypresses, not a real UID
const CONFIRM_DELAY_MS = 600; // how long "Card Detected" stays on screen before a tap auto-confirms and the scanner resets for the next card

function useRfidScanner(isActive, onScan) {
  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(event) {
      const now = Date.now();
      const gapSinceLastKey = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (event.key === "Enter") {
        const scannedUid = bufferRef.current;
        bufferRef.current = "";
        if (scannedUid.length >= SCAN_MIN_LENGTH) {
          // Stop that Enter from doing anything else (e.g. "clicking"
          // whatever element the browser thinks has default focus).
          event.preventDefault();
          onScan(scannedUid);
        }
        return;
      }

      // event.key is a multi-character string for anything that isn't
      // a single printable character - "Shift", "Tab", "Backspace",
      // "ArrowLeft", etc. Skip those; only real characters count
      // towards a UID.
      if (event.key.length !== 1) return;

      // A gap this big means this keystroke isn't part of the same
      // fast burst a reader produces - start a fresh buffer instead of
      // gluing unrelated keypresses (e.g. two separate stray taps, or
      // someone genuinely typing on the keyboard) together.
      if (gapSinceLastKey > SCAN_KEY_GAP_MS) {
        bufferRef.current = "";
      }

      bufferRef.current += event.key;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, onScan]);
}

function RfidFormModal({ isOpen, onClose, onConfirm }) {
  const [uid, setUid] = useState("");

  // Clear out whatever was left over from the last time this modal was
  // opened, so a stale UID from a previous student doesn't carry over.
  useEffect(() => {
    if (isOpen) setUid("");
  }, [isOpen]);

  // Listens the whole time this modal is open - tapping a different
  // card just overwrites "uid" with the new one, same as before.
  useRfidScanner(isOpen, setUid);

  // Keep the latest onConfirm in a ref rather than as a useEffect
  // dependency below - if the parent re-renders and passes a new
  // onConfirm function while we're mid-countdown, we don't want that
  // to restart the delay and delay the auto-add even further.
  const onConfirmRef = useRef(onConfirm);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
  }, [onConfirm]);

  // A tap no longer just fills in the UID and waits for someone to
  // click "Add" - it flashes "Card Detected" for a moment, then
  // auto-confirms and clears back to "Waiting for tap..." so the
  // scanner is ready for the next card. Clicking "Add" by hand still
  // works too (see handleAdd) - it just short-circuits this same
  // delay for an instant confirm.
  useEffect(() => {
    if (!uid) return;
    const timer = setTimeout(() => {
      onConfirmRef.current(uid);
      setUid("");
    }, CONFIRM_DELAY_MS);
    return () => clearTimeout(timer);
  }, [uid]);

  if (!isOpen) return null;

  function handleClear() {
    setUid("");
  }

  // Manual shortcut: a tap already auto-confirms on its own after
  // CONFIRM_DELAY_MS (see the useEffect above), so this button just
  // lets someone confirm right away instead of waiting out the delay.
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

          {/* No longer a clickable button - there's nothing to trigger
              by hand anymore, this is just a live status indicator
              while we wait for useRfidScanner() to catch a real tap. */}
          <div
            className={`flex h-32 flex-col items-center justify-center gap-2 rounded-lg border transition-colors sm:h-40 ${
              uid
                ? "border-success text-success"
                : "border-gray-300 text-gray-500"
            }`}
          >
            {uid ? <Check size={40} /> : <Rss size={40} className="animate-pulse" />}
            <span className="text-sm font-semibold">
              {uid ? "Card Detected" : "Tap RFID card on the Scanner"}
            </span>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-primary ">
              RFID UID
            </label>
            {/* Plain display, not an <input> - there's nothing here to
                click into, focus, or type on. The only way this value
                changes is useRfidScanner() catching a real tap. */}
            <div
              className={`w-full select-none rounded-lg border px-3 py-2.5 text-sm ${
                uid ? "border-success text-success font-semibold" : "border-gray-500 text-gray-500"
              }`}
            >
              {uid || "Waiting for tap..."}
            </div>
          </div>
        </div>

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
            className="flex-1 cursor-pointer rounded-lg bg-gray-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-600"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}

export default RfidFormModal;