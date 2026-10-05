import React from "react";
import LoginForm from "./LoginForm";
import logo from "../../assets/images/logo.jpg";
import loginBg from "../../assets/images/Loginpic.jpeg";

function LoginPage() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden="true"
        className="absolute inset-0 scale-110 bg-cover bg-center blur-md"
        style={{ backgroundImage: `url(${loginBg})` }}
      />

      <div aria-hidden="true" className="absolute inset-0 bg-gray/20" />

      <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-300 shadow-md bg-white p-6 font-primary sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 h-20 w-20 overflow-hidden rounded-full border-4 border-white">
            <img src={logo} alt="School Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-lg font-extrabold text-primary sm:text-xl">
            CECILIO M. SALIBA
          </h1>
          <h1 className="text-lg font-extrabold text-primary sm:text-xl">
            ELEMENTARY SCHOOL
          </h1>
          <p className="mt-1 text-sm text-gray">Student Attendance System</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}

export default LoginPage;