import React, { useRef } from "react";

// Segmented one-time-code input: one box per digit, auto-advances on type,
// steps back on backspace, and accepts a full pasted code in one go.
function OtpInput({
  length = 6,
  value,
  onChange,
  onBlur,
  name = "otp",
  error,
  touched,
  disabled,
}) {
  const inputRefs = useRef([]);
  const digits = value.split("").concat(Array(length).fill("")).slice(0, length);

  function focusInput(index) {
    inputRefs.current[index]?.focus();
  }

  function handleChange(index, e) {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);

    const next = [...digits];
    next[index] = digit;
    onChange(next.join("").slice(0, length));

    if (digit && index < length - 1) focusInput(index + 1);
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const next = [...digits];
      if (next[index]) {
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        next[index - 1] = "";
        onChange(next.join(""));
        focusInput(index - 1);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1);
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    focusInput(Math.min(pasted.length, length - 1));
  }

  return (
    <div>
      <div className="flex justify-between gap-2" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            id={index === 0 ? name : undefined}
            name={`${name}-${index}`}
            type="text"
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onBlur={index === length - 1 ? onBlur : undefined}
            aria-label={`Digit ${index + 1} of ${length}`}
            className={`h-14 w-11 rounded-lg border bg-gray-100 text-center text-xl font-medium text-gray-900 outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/30 sm:h-16 sm:w-14 sm:text-2xl ${
              touched && error ? "border-danger" : "border-transparent"
            }`}
          />
        ))}
      </div>

      {touched && error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}

export default OtpInput;