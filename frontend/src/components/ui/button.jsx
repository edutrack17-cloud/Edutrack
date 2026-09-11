import React from "react";

function Button({ children, type, onClick, className = "", disabled = false, ...rest }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`cursor-pointer rounded-lg border border-transparent px-3 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;