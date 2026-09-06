import React, { useEffect, useRef, useState } from "react";
import { useFormik } from "formik";
import { X, Clock, ChevronDown } from "lucide-react";

function getCurrentTimeRounded(stepMinutes = 1) {
  const now = new Date();
  const totalMinutes = now.getHours() * 60 + now.getMinutes();
  const roundedMinutes = totalMinutes - (totalMinutes % stepMinutes);
  const hours = String(Math.floor(roundedMinutes / 60)).padStart(2, "0");
  const minutes = String(roundedMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function buildTimeOptions(stepMinutes = 1) {
  const options = [];
  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += stepMinutes) {
    const hours24 = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const value = `${String(hours24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const label = `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;

    options.push({ value, label, totalMinutes });
  }
  return options;
}

const TIME_OPTIONS = buildTimeOptions(1);

function TimeDropdown({ value, onChange, onBlur, hasError }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selectedRef = useRef(null);

  const nowTotalMinutes = (() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  })();

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        onBlur?.();
      }
    }
    function handleEscapeKey(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
        onBlur?.();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isOpen, onBlur]);

  useEffect(() => {
    if (isOpen) {
      selectedRef.current?.scrollIntoView({ block: "center" });
    }
  }, [isOpen]);

  const selectedOption = TIME_OPTIONS.find((option) => option.value === value);

  function handleSelect(nextValue) {
    onChange(nextValue);
    setIsOpen(false);
    onBlur?.();
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        id="time"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex w-full items-center justify-between rounded-lg border py-2.5 pl-3 pr-9 text-left text-sm outline-none transition-colors focus:border-primary ${
          hasError ? "border-danger" : "border-gray-300"
        } text-gray-700`}
      >
        <span>{selectedOption?.label ?? "Select time"}</span>
      </button>
      <ChevronDown
        size={16}
        className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition-transform ${
          isOpen ? "rotate-180" : ""
        }`}
      />

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {TIME_OPTIONS.map((option) => {
            const isSelected = option.value === value;
            const isDisabled = option.totalMinutes > nowTotalMinutes;
            return (
              <li key={option.value} ref={isSelected ? selectedRef : null} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(option.value)}
                  className={`block w-full px-3 py-2 text-left text-sm transition ${
                    isDisabled
                      ? "cursor-not-allowed text-gray-300"
                      : `hover:bg-gray-100 ${isSelected ? "bg-gray-100 font-medium text-primary" : "text-gray-700"}`
                  }`}
                >
                  {option.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ManualTimeModal({ isOpen, mode, attendance, onClose, onSubmit }) {
  const isTimeIn = mode === "in";

  const formik = useFormik({
    enableReinitialize: true,

    initialValues: {
      time:
        (isTimeIn ? attendance?.timeIn : attendance?.timeOut) ||
        getCurrentTimeRounded(),
    },

    validate: (values) => {
      const errors = {};
      if (!values.time) {
        errors.time = isTimeIn
          ? "Time in is required."
          : "Time out is required.";
      }
      return errors;
    },

    onSubmit: (values) => {
      // Time In -> POST /api/attendance/manual/{studentId}, Time Out -> PATCH /api/attendance/manual-timeout/{studentId}
      onSubmit?.(attendance?.id, mode, values.time);
      onClose();
    },
  });

  if (!isOpen || !attendance) {
    return null;
  }

  const accentColorClass = isTimeIn ? "text-success" : "text-danger";
  const buttonColorClass = isTimeIn
    ? "bg-success hover:bg-green-700"
    : "bg-primary hover:bg-sky-700";

  const hasError = Boolean(formik.touched.time && formik.errors.time);

  return (
    <div className="font-primary fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center border-b border-gray-200 px-6 py-4">
          <div className="w-6" />

          <h2 className="flex-1 text-center text-lg font-bold text-primary sm:text-xl">
            Manual {isTimeIn ? "Time In" : "Time Out"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 transition-colors hover:text-gray-700"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-6 py-6">
          <div className="flex items-center gap-3 rounded-lg bg-gray-50 px-4 py-3">
            <Clock size={18} className={accentColorClass} />
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {attendance.name}
              </p>
              <p className="text-xs text-gray-500">
                {attendance.gradeLevel} - {attendance.section}
              </p>
              <p className="mt-1 text-xs text-gray-400">{attendance.date}</p>
            </div>
          </div>

          <div>
            <label htmlFor="time" className="mb-1 block text-sm font-semibold text-gray-700">
              {isTimeIn ? "Time In" : "Time Out"}
            </label>
            <TimeDropdown
              value={formik.values.time}
              onChange={(nextValue) => formik.setFieldValue("time", nextValue)}
              onBlur={() => formik.setFieldTouched("time", true)}
              hasError={hasError}
            />
            {hasError && (
              <p className="mt-1 text-xs text-danger">{formik.errors.time}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={formik.handleSubmit}
            className={`flex-1 cursor-pointer rounded-lg py-3 text-sm font-semibold text-white transition-colors ${buttonColorClass}`}
          >
            Confirm {isTimeIn ? "Time In" : "Time Out"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex-1 cursor-pointer rounded-lg bg-secondary py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManualTimeModal;