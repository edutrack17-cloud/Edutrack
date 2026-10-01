import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// True if a className string already sets a Tailwind font size
// (text-xs / text-sm / text-base / text-lg / text-xl ...). Used below so the
// default size only applies when the caller did NOT pick one - otherwise
// "text-sm" and e.g. "text-base" would both be on the element and the winner
// would depend on Tailwind's stylesheet order, not on the order written here.
const HAS_TEXT_SIZE = /(^|\s)text-(xs|sm|base|lg|xl|2xl|3xl|\[[^\]]+\])(\s|$)/;

function Input({
  label,
  icon,
  id,
  name,
  type,
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  touched,
  className = "",
  inputClassName = "",
  labelClassName = "text-primary",
  ...rest
}) {
  const [showPassword, setShowPassword] = useState(false);

  const inputType =
    type === "password" && showPassword ? "text" : type;

  // Type scale: inputs are text-base (16px), labels/errors are text-sm (14px).
  // Pages that pass their own size in inputClassName still win.
  const inputSizeClass = HAS_TEXT_SIZE.test(inputClassName) ? "" : "text-base";
  const labelSizeClass = HAS_TEXT_SIZE.test(labelClassName) ? "" : "text-sm";

  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className={`mb-1 block font-semibold ${labelSizeClass} ${labelClassName}`}
        >
          {label}
        </label>
      )}

      <div
        className={`flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-primary ${className}`}
      >
        {icon && <span className="text-gray-500">{icon}</span>}

        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`flex-1 bg-transparent outline-none text-gray-700 placeholder:text-gray-500 ${inputSizeClass} ${inputClassName}`}
          {...rest}
        />

        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className=" text-gray-500 "
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {touched && error && (
        <p className="mt-1 text-sm text-danger">{error}</p>
      )}
    </div>
  );
}

export default Input;