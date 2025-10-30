"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { SettingsProvider } from "../../context/SettingsContext";
import { Sidebar, SidebarIcon } from "../../components/Sidebar";
import { SettingsScreen } from "../../components/SettingsScreen";
import { Home, Settings, Bot, HistoryIcon } from "lucide-react";
import Dashboard from "@/components/Dashboard";
import HistoryScreen from "@/components/HistoryScreen";
import HistoryPage from "./history/page";

export default function DashboardLayout() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const [activeView, setActiveView] = useState<"home" | "settings" | "historico">("home");

  useEffect(() => {
    if (!isAuthenticated) router.replace("/");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        Carregando...
      </div>
    );
  }

  return (
    <SettingsProvider>
      <div className="flex h-screen bg-gray-900 text-gray-200">
        <Sidebar>
          <SidebarIcon
            icon={<Home size={22} />}
            text="Início"
            active={activeView === "home"}
            onClick={() => setActiveView("home")}
          />
          <SidebarIcon
            icon={<Settings size={22} />}
            text="Configurações"
            active={activeView === "settings"}
            onClick={() => setActiveView("settings")}
          />
          <SidebarIcon
            icon={<HistoryIcon size={22} />}
            text="Histórico"
            active={activeView === "historico"}
            onClick={() => setActiveView("historico")}
          />
        </Sidebar>

        <main className="flex-1 p-6 overflow-y-auto">
          {activeView === "home" && (
            <Dashboard />
          )}

          {activeView === "settings" && (
            <SettingsScreen
              currentLanguage="Português do Brasil"
              currentFocusKeywords="tecnologia, IA, inovação"
              onSave={(data) => console.log("Configurações salvas:", data)}
            />
          )}

          {activeView === "historico" && (
            <HistoryPage />
          )}
        </main>
      </div>
    </SettingsProvider>
  );
}
