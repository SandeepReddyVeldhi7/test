import type { Metadata } from "next";
import { Righteous, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./Providers";

const righteous = Righteous({
  weight: "400",
  variable: "--font-righteous",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finch Axis | Global Admin Dashboard",
  description: "Enterprise Platform Control Center",
};

import { Sidebar } from "./components/Sidebar";
import { TopNav } from "./components/TopNav";
import { AuthGuard } from "./components/AuthGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${righteous.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="antialiased h-full">
        <Providers>
          <AuthGuard>
            <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
              {/* Sidebar only shows if not on login page - AuthGuard handles the logic but we need to hide UI parts */}
              <SidebarWrapper />
              <main className="flex-1 relative flex flex-col bg-slate-50/50 overflow-hidden">
                <TopNavWrapper />
                <div className="flex-1 relative flex flex-col min-h-0">
                  {children}
                </div>
              </main>
            </div>
          </AuthGuard>
        </Providers>
      </body>
    </html>
  );
}

// Helper components to avoid repetition and handle pathname logic
function SidebarWrapper() {
  return <Sidebar />;
}

function TopNavWrapper() {
  return <TopNav />;
}
