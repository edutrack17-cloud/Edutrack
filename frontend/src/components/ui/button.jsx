import React from "react";

function Button({ children, type, onClick, className = "" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`cursor-pointer rounded-lg border border-transparent px-3 py-1.5 text-sm font-semibold transition-colors ${className}`}>
      {children}
    </button>
  );
}

export default Button;