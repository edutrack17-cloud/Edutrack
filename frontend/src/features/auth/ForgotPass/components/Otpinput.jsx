import { useRef } from "react";

// Segmented one-time-code input: one box per digit, auto-advances on type,
// steps back on backspace, and accepts a full pasted / autofilled code.
//
// `value` is always a plain string of digits with NO gaps ("123" -> boxes 1-3
// filled, 4-6 empty). Every edit below goes through that string, so a digit
// can never end up in box 5 while box 3 is still empty.
function OtpInput({
  length = 6,
  value = "",
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

  // Used for paste and for SMS autofill (iOS / Android "one-time-code").
  function applyCode(raw) {
    const code = raw.replace(/\D/g, "").slice(0, length);
    if (!code) return;
    onChange(code);
    focusInput(Math.min(code.length, length - 1));
  }

  function handleChange(index, e) {
    const raw = e.target.value.replace(/\D/g, "");

    // Box got emptied some way other than Backspace (cut, Delete, mobile keyboard).
    if (!raw) {
      if (index < value.length) {
        onChange(value.slice(0, index) + value.slice(index + 1));
      }
      return;
    }

    // 3+ digits arriving in one change event = SMS autofill. Treat like a paste.
    if (raw.length > 2) {
      applyCode(raw);
      return;
    }

    // 1 digit = normal typing. 2 = typed into a box that already had a digit
    // (cursor sat after it) - keep the newest one.
    const digit = raw.slice(-1);
    const position = Math.min(index, value.length); // never leave a gap
    const next = value.slice(0, position) + digit + value.slice(position + 1);
    onChange(next.slice(0, length));

    if (position < length - 1) focusInput(position + 1);
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (index < value.length) {
        // Box has a digit: remove it, stay put.
        onChange(value.slice(0, index) + value.slice(index + 1));
      } else if (index > 0) {
        // Box is empty: remove the previous digit and step back.
        onChange(value.slice(0, index - 1) + value.slice(index));
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
    applyCode(e.clipboardData.getData("text"));
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
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(index, e)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            // Selecting on focus means typing replaces the digit instead of
            // being blocked / appended.
            onFocus={(e) => e.target.select()}
            // Clicking a box past the end of the code jumps to the first empty one.
            onClick={() => {
              if (index > value.length) focusInput(value.length);
            }}
            onBlur={index === length - 1 ? onBlur : undefined}
            aria-label={`Digit ${index + 1} of ${length}`}
            aria-invalid={Boolean(touched && error)}
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