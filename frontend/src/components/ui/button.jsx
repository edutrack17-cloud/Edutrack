import React from "react";

function Button({ children, type, onClick, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`rounded-md px-4 py-2.5 font-semibold transition-colors ${className}`}>
      {children}
    </button>
  );
}

export default Button;