'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface ToastType {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface DateRange {
  key: string;
  label: string;
  startDate: string;
  endDate: string;
}

interface UiContextType {
  isSidebarOpen: boolean;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  setSidebarOpen: (open: boolean) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  dateRange: DateRange;
  setDateRange: (key: 'Today' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'custom', custom?: { start: string; end: string }) => void;
}

const UiContext = createContext<UiContextType | undefined>(undefined);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [toasts, setToasts] = useState<ToastType[]>([]);
  const [dateRange, setDateRangeState] = useState<DateRange>({
    key: '1M',
    label: 'Last 30 Days',
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const setDateRange = (key: 'Today' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'custom', custom?: { start: string; end: string }) => {
    const end = new Date();
    let start = new Date();
    let label = '';

    switch (key) {
      case 'Today':
        label = 'Today';
        break;
      case '1W':
        start.setDate(end.getDate() - 7);
        label = 'Last 7 Days';
        break;
      case '1M':
        start.setDate(end.getDate() - 30);
        label = 'Last 30 Days';
        break;
      case '3M':
        start.setMonth(end.getMonth() - 3);
        label = 'Last 3 Months';
        break;
      case '6M':
        start.setMonth(end.getMonth() - 6);
        label = 'Last 6 Months';
        break;
      case '1Y':
        start.setFullYear(end.getFullYear() - 1);
        label = 'Last 1 Year';
        break;
      case 'custom':
        if (custom) {
          start = new Date(custom.start);
          end.setTime(new Date(custom.end).getTime());
          label = `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
        }
        break;
    }

    setDateRangeState({
      key,
      label,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
      const savedCollapse = localStorage.getItem('sidebar_collapsed');
      if (savedCollapse === 'true') {
        setIsSidebarCollapsed(true);
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined' && window.innerWidth < 1024 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebar_collapsed', String(newState));
      return newState;
    });
  };

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  return (
    <UiContext.Provider value={{ 
      isSidebarOpen, 
      isSidebarCollapsed,
      toggleSidebar, 
      toggleSidebarCollapse,
      setSidebarOpen: setIsSidebarOpen, 
      activeTab, 
      setActiveTab,
      showToast,
      dateRange,
      setDateRange
    }}>
      {children}
      {/* Toast Portal */}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`
              pointer-events-auto
              flex items-center gap-4 px-6 py-4 rounded-[24px] 
              border backdrop-blur-xl shadow-2xl animate-in slide-in-from-right-10 duration-500
              ${toast.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 
                toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-600' : 
                'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'}
            `}
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'} animate-pulse`} />
            <span className="text-[10px] font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        ))}
      </div>
    </UiContext.Provider>
  );
}

export function useUi() {
  const context = useContext(UiContext);
  if (context === undefined) {
    throw new Error('useUi must be used within a UiProvider');
  }
  return context;
}
