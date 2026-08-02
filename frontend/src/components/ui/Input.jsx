import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// use props and destructure it para makuha yung data sa parent nya kung saan man sya gagamitin na form
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
  labelClassName = "text-primary",
}) {
  const [showPassword, setShowPassword] = useState(false);

  // this function kung showpassword value nya is false magiging true
  function togglePasswordVisibility() {
    setShowPassword(!showPassword);
  }

  // type nya is password and showpassword is true
  const isPasswordVisible = type === "password" && showPassword;

  // if password is true show text like "password123" kapag no type nya which is input type = password
  const inputType = isPasswordVisible ? "text" : type;

  // check if na touch na or may error
  const showError = Boolean(touched && error);

 
  const boxClass = showError
    ? `flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-white border-danger ${className}`
    : `flex items-center gap-2 rounded-lg border px-3 py-2.5 bg-white border-gray-300 transition-colors focus-within:border-primary ${className}`;

  const toggleIcon = showPassword ? <EyeOff size={18} /> : <Eye size={18} />;

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className={`mb-1 block text-sm font-semibold ${labelClassName}`}
        >
          {label}
        </label>
      )}

      <div className={boxClass}>
        {icon && <span className="text-gray">{icon}</span>}

        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          className="w-full bg-transparent outline-none border-0 text-sm text-gray-700 placeholder:text-gray-400"
        />

        {type === "password" && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="text-gray"
          >
            {toggleIcon}
          </button>
        )}
      </div>

      {showError && <p className="mt-1 text-sm text-danger">{error}</p>}
    </div>
  );
}

export default Input;