import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
// use props and destructure it para makuha yung data sa parent nya kung saan man sya gagamitin na form
function Input({ label, icon, id, name, type, value, onChange, onBlur, placeholder, error, touched }) {
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

  // ginamit yung showError na variable if ture na touch or may error true
  const boxClass = showError
    ? "flex items-center gap-2 rounded-md border px-3 py-2 bg-white border-danger"
    : "flex items-center gap-2 rounded-md border px-3 py-2 bg-white border-gray-300 focus-within:border-primary";


  const toggleIcon = showPassword ? <EyeOff size={18} /> : <Eye size={18} />;

  return (
    <div className="mb-4">
      {label && (
        <label htmlFor={id} className="block text-primary font-semibold mb-1">
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
          className="w-full bg-transparent outline-none border-0 text-gray-700"
        />

        {type === "password" && (
          <button type="button" onClick={togglePasswordVisibility} className="text-gray">
            {toggleIcon}
          </button>
        )}
      </div>

      {showError && <p className="text-danger text-sm mt-1">{error}</p>}
    </div>
  );
}

export default Input;