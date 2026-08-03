import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

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
}) {
  const [showPassword, setShowPassword] = useState(false);

  const inputType =
    type === "password" && showPassword ? "text" : type;

  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          className={`mb-1 block text-sm font-semibold ${labelClassName}`}
        >
          {label}
        </label>
      )}

      <div
        className={`flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 focus-within:border-primary ${className}`}
      >
        {icon && <span className="text-gray-400">{icon}</span>}

        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 ${inputClassName}`}
        />

        {type === "password" && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className=" text-gray-400 "
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