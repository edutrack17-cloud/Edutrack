import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

function MainLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      
      <div className="flex flex-col flex-1">
        <Header
          title="Dashboard"
          fullname="IORI YAGAMI"
          role="Teacher"/>

        <main className="flex-1 p-6 bg-gray/40">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}


export default MainLayout;