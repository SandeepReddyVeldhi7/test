'use client';

import React from 'react';
import { useUi } from '../context/UiContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const DashboardIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
);
const OnboardingIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>
);
const OrgIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 21h18" /><path d="M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14" /><path d="M9 5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1-1v2" /><path d="M10 9h4" /><path d="M10 13h4" /><path d="M10 17h4" /></svg>
);
const SubIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
);
const AnalyticsIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
);
const TeamIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const ComplaintsIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
);
const RoleIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
const BillingIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /><path d="M7 15h.01" /><path d="M11 15h2" /></svg>
);
const XIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
);

const PanelIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></svg>
);

export const Sidebar = () => {
  const { isSidebarOpen, isSidebarCollapsed, setSidebarOpen, toggleSidebarCollapse, activeTab } = useUi();
  const pathname = usePathname();

  if (pathname === '/login') return null;

  const navItems = [
    { id: 'Dashboard', icon: DashboardIcon, href: '/' },
    { id: 'Onboarding', icon: OnboardingIcon, href: '/onboarding' },
    { id: 'Organizations', icon: OrgIcon, href: '/organizations' },
    { id: 'Subscriptions', icon: SubIcon, href: '/subscriptions' },
    { id: 'Analytics', icon: AnalyticsIcon, href: '/' },
    { id: 'Users', icon: TeamIcon, href: '/users' },
    { id: 'Billing', icon: BillingIcon, href: '/billing-config' },
    { id: 'Complaints', icon: ComplaintsIcon, href: '/complaints' },
    { id: 'Roles', icon: RoleIcon, href: '/roles' },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    window.location.href = '/login';
  };

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-[60] lg:hidden animate-in fade-in duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:sticky top-0 h-screen z-[70] lg:z-40 bg-[#17283E] border-r border-white/5 flex flex-col shrink-0 transition-all duration-300 ease-spring overflow-y-auto overflow-x-hidden custom-scrollbar-dark text-white shadow-[0_0_50px_rgba(0,0,0,0.3)]
        ${isSidebarOpen 
          ? (isSidebarCollapsed ? 'w-20 px-0' : 'w-[280px] sm:w-[300px] px-4 sm:px-6') + ' py-12 left-0 shadow-2xl lg:shadow-none' 
          : 'w-0 overflow-hidden px-0 py-12 -left-full lg:left-0 lg:border-none opacity-0'
        }
      `}>
        <div className={`${isSidebarCollapsed ? 'w-full' : 'w-[220px] sm:w-[220px]'} flex flex-col h-full whitespace-nowrap transition-all duration-300`}>
          <div className={`flex items-center ${isSidebarCollapsed ? 'flex-col gap-8' : 'justify-between mb-16 px-4'}`}>
            {!isSidebarCollapsed ? (
              <div className="animate-float">
                <h2 className="text-2xl font-black tracking-tighter text-white">Finch Axis</h2>
                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1">Global Admin</p>
              </div>
            ) : (
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 mb-4 animate-float">
                <span className="font-black text-lg">F</span>
              </div>
            )}
            
            <button
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors hidden lg:block"
              onClick={toggleSidebarCollapse}
              title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <PanelIcon size={20} className={isSidebarCollapsed ? 'rotate-180' : ''} />
            </button>

            <button
              className="lg:hidden p-2 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <XIcon size={20} />
            </button>
          </div>

          <nav className={`flex flex-col gap-2.5 ${isSidebarCollapsed ? 'items-center px-2' : ''}`}>
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                title={isSidebarCollapsed ? item.id : ""}
                className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-12 h-12 p-0' : 'gap-4 sm:gap-5 px-5 sm:px-6 py-4'} rounded-[20px] transition-all duration-300 group ${activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'group-hover:text-white'} />
                {!isSidebarCollapsed && <span className="text-xs sm:text-sm font-black tracking-tight animate-in fade-in slide-in-from-left-2 duration-300">{item.id}</span>}
              </Link>
            ))}
          </nav>

          <div className={`mt-auto pt-10 ${isSidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
            <button
              onClick={handleLogout}
              title={isSidebarCollapsed ? "Logout" : ""}
              className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-12 h-12 p-0' : 'w-full gap-4 px-6 py-5'} rounded-[24px] text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all font-black text-xs uppercase tracking-widest group`}
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-rose-500/20 transition-colors shrink-0">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
              </div>
              {!isSidebarCollapsed && <span className="animate-in fade-in slide-in-from-left-2 duration-300">Log Out</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
