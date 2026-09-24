import React from "react";
import ForgotPasswordForm from "./components/ForgotPasswordForm";
import logo from "../../../assets/images/logo.jpg";

function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-white p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-300 shadow-md bg-white p-6 font-primary sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 h-20 w-20 overflow-hidden rounded-full border-4 border-white">
            <img src={logo} alt="School Logo" className="h-full w-full object-cover" />
          </div>
          <h1 className="text-lg font-extrabold text-primary sm:text-xl">
            Forgot Password
          </h1>
          <p className="mt-1 text-sm text-gray">
            Reset your account password
          </p>
        </div>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}

export default ForgotPasswordPage;