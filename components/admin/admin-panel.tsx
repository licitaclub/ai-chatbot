"use client";

import { useState } from "react";

import { AdminChatPanel } from "./chat-panel";
import { AdminDashboard } from "./dashboard";

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-50">
      {/* Top bar */}
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-slate-800">LicitaClub</h1>
          <span className="text-xs text-slate-400">Panel de Control</span>
        </div>
        <nav className="flex items-center gap-1">
          {[
            { id: "home", label: "Inicio" },
            { id: "oportunidades", label: "Oportunidades" },
            { id: "licitaciones", label: "Licitaciones" },
            { id: "proveedores", label: "Proveedores" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Two-column body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Admin content (70%) */}
        <div className="w-[70%] overflow-y-auto p-6">
          <AdminDashboard activeTab={activeTab} />
        </div>

        {/* Right: Chatbot (30%) */}
        <div className="w-[30%] border-l border-slate-200 bg-white">
          <AdminChatPanel />
        </div>
      </div>
    </div>
  );
}
