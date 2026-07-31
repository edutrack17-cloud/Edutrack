import React from "react";

function Header({ title , fullname , role }) {
  return (
   <header className="flex items-center justify-between h-20 px-6 bg-white shadow-md">
      <h1 className="text-3xl font-bold font-primary text-primary">
        {title}
      </h1>

      {/* Use user.fullname user.role using destructuring {fullname} {role} for the dynamic data */}
      <div className="text-center">
        <p className="font-semibold text-primary font-primary">
          {fullname}
        </p>
        <p className="text-sm text-gray font-primary">
          {role}
        </p>
      </div>
    </header>
  );
}

export default Header;