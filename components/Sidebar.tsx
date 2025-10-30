
"use client";

import React from 'react';

// FIX: Define and export SidebarIcon component for use in App.tsx
interface SidebarIconProps {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  onClick?: () => void;
}

interface SidebarIconProps {
  icon: React.ReactNode;
  text: string;
  active?: boolean;
  onClick?: () => void;
}

export const SidebarIcon: React.FC<SidebarIconProps> = ({ icon, text, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors
    ${active ? "bg-primary/20 text-primary" : "text-gray-400 hover:bg-gray-700 hover:text-white"}`}
  >
    {icon}
    <span className="font-medium">{text}</span>
  </div>
);



interface SidebarProps {
    children: React.ReactNode;
}

// FIX: Modify Sidebar component to accept children, making it composable from App.tsx.
export const Sidebar: React.FC<SidebarProps> = ({ children }) => {
    return (
        <aside className="h-screen">
        <nav className="h-full flex flex-col bg-gray-800 border-r border-gray-700 shadow-sm">
            <div className="p-4 pb-2 flex justify-center items-center">
                <span className="text-xl font-bold text-primary">P</span>
                <span className="text-xl font-bold text-white">N</span>
                <span className="text-xl font-bold text-primary">A</span>
                <span className="text-xl font-bold text-white">I</span>
            </div>
            <div className="flex flex-col flex-1 px-3 mt-4">
               {children}
            </div>
        </nav>
        </aside>
  );
};