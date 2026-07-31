import React from "react";
import LoginForm from "./LoginForm";
import logo from "../../assets/images/logo.jpg";

function LoginPage() {
  return (

    <div className="min-h-screen w-full flex  items-center justify-center bg-gray">
      <div className="w-full max-w-md bg-white border-2 border-primary rounded-md shadow-md p-8 font-primary">

        <div className="flex flex-col items-center mb-6 text-center">
      
          <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white mb-3">
                     <img src={logo} alt="School Logo" className="w-full h-full object-cover" />
           </div>
          <h1 className="text-primary font-extrabold text-xl">
            CECILIO M. SALIBA
          </h1>
          <h1 className="text-primary font-extrabold text-xl">
            ELEMENTARY SCHOOL
          </h1>
          <p className="text-gray text-sm mt-1">Student Attendance System</p>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}

export default LoginPage;