import React from "react";

function Button({ children, type, onClick }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="w-full py-3 rounded-md font-bold text-white bg-primary hover:bg-sky-700 "
    >
      {children}
    </button>
  );
}

export default Button;