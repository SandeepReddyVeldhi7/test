'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useUi } from '../context/UiContext';
import { usePathname } from 'next/navigation';

const MenuIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="18" y2="18" /></svg>
);
const SearchIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);
const BellIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);

export const TopNav = () => {
  const { toggleSidebar } = useUi();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    const savedAdmin = localStorage.getItem('admin');
    if (savedAdmin) {
      setAdmin(JSON.parse(savedAdmin));
    }
  }, []);

  if (pathname === '/login') return null;

  return (
    <header className="h-20 lg:h-24 bg-white/80 backdrop-blur-2xl border-b border-slate-100/50 px-6 sm:px-12 flex items-center justify-between sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center gap-4 lg:gap-12">
        <button
          className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-slate-100 transition-all border border-slate-100 shadow-sm"
          onClick={() => toggleSidebar()}
        >
          <MenuIcon size={20} />
        </button>
        <nav className="hidden md:flex items-center gap-8">
          {['Global Dashboard'].map((tab) => (
            <button key={tab} className={`text-xs sm:text-sm font-black tracking-tight transition-all relative py-1 ${tab === 'Global Dashboard' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-900'}`}>
              {tab}
              {tab === 'Global Dashboard' && <div className="absolute -bottom-1 left-0 w-full h-1 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3 sm:gap-8">

        <div className="flex items-center gap-2 sm:gap-4">

          <div className="h-8 w-[1px] bg-white/20 mx-1 hidden sm:block" />
          <Link href="/profile" className="flex items-center gap-3 pl-1 group cursor-pointer">
            <div className="text-right hidden xs:block">
              <p className="text-[11px] font-black text-slate-900 leading-none">{admin?.name || 'Super Admin'}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">{admin?.role?.name || 'Control Center'}</p>
            </div>
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-slate-900 overflow-hidden border-2 border-white/50 shadow-xl shadow-slate-900/10 group-hover:scale-105 transition-transform">
              <img src={`https://ui-avatars.com/api/?name=${admin?.name || 'Admin'}&background=0f172a&color=fff`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};
