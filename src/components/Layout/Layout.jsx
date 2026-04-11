import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-layout">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="main-area">
        <Navbar onMenu={() => setOpen(true)} />
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
