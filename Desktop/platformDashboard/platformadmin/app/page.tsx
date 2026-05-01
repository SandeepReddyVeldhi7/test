'use client';

import React, { useEffect } from 'react';
import { useUi } from './context/UiContext';
import { apiFetch } from '../lib/api';
import { useRouter } from 'next/navigation';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const DashboardIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></svg>
);
const OrgIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 21h18" /><path d="M5 21V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14" /><path d="M9 5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1-1v2" /><path d="M10 9h4" /><path d="M10 13h4" /><path d="M10 17h4" /></svg>
);
const AnalyticsIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
);
const TeamIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
const TrendingUpIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
);
const RefreshIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
);
const AlertIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
);
const BellIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
);
const SettingsIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
);
const PlusIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
const ExportIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
);
const CalendarIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
);
const ChevronDownIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m6 9 6 6 6-6" /></svg>
);
const SearchIcon = ({ size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);

// ─── Components ─────────────────────────────────────────────────────────────

const MetricCard = ({ icon: Icon, title, value, trend, colorClass = "glass-card", iconColor = "text-indigo-600" }) => (
  <div className={`${colorClass} p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] flex flex-col gap-6 transition-all duration-500 hover:shadow-[0_32px_64px_-16px_rgba(59,130,246,0.2)] hover:scale-[1.05] hover:bg-white/90 hover:border-indigo-200/50 active:scale-[0.98] group cursor-pointer relative overflow-hidden border border-white/20`}>
    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
    <div className="flex items-center justify-between relative z-10">
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/40 flex items-center justify-center ${iconColor} group-hover:scale-110 transition-transform shadow-sm`}>
        <Icon size={Icon === AlertIcon ? 24 : 28} />
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 backdrop-blur-md rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider">
          <TrendingUpIcon size={12} /> {trend}
        </div>
      )}
    </div>
    <div className="relative z-10">
      <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{title}</p>
      <h3 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{value}</h3>
    </div>
  </div>
);

const ChartPlaceholder = ({ title, height = "h-40", data = [], type = "revenue" }) => (
  <div className="glass-card p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] flex flex-col h-full relative overflow-hidden group">
    <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all" />
    <div className="flex items-center justify-between mb-8 relative z-10">
      <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h4>
      <div className="w-2 h-2 rounded-full bg-slate-300" />
    </div>
    <div className={`w-full ${height} bg-white/20 backdrop-blur-sm rounded-2xl sm:rounded-3xl flex items-end justify-between px-4 sm:px-6 py-4 gap-1.5 sm:gap-2 relative z-10 border border-white/20 shadow-inner`}>
      {data.length === 0 ? (
        <p className="w-full text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-8">Waiting for data...</p>
      ) : data.map((item: any, i: number) => {
        const val = type === 'revenue' ? item.total : item.count;
        const max = Math.max(...data.map((d: any) => type === 'revenue' ? d.total : d.count)) || 1;
        const heightPct = Math.max(10, (val / max) * 100);
        return (
          <div key={i} className="flex-1 bg-indigo-500/30 rounded-t-md sm:rounded-t-lg transition-all hover:bg-indigo-600 hover:scale-x-110 shadow-lg relative group/bar" style={{ height: `${heightPct}%` }}>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity">
              {type === 'revenue' ? `₹${val.toLocaleString()}` : val}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default function GlobalDashboard() {
  const router = useRouter();
  const { setActiveTab, dateRange, setDateRange } = useUi();
  const [data, setData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    setActiveTab('Dashboard');
    fetchStats();
  }, [dateRange]);

  const [rangePickerOpen, setRangePickerOpen] = React.useState(false);
  const pickerRef = React.useRef<HTMLDivElement>(null);
  const [tempDates, setTempDates] = React.useState({
    start: dateRange?.startDate || new Date().toISOString().split('T')[0],
    end: dateRange?.endDate || new Date().toISOString().split('T')[0]
  });

  // Close picker on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setRangePickerOpen(false);
      }
    }
    if (rangePickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [rangePickerOpen]);

  // Sync temp dates when range picker is opened
  useEffect(() => {
    if (rangePickerOpen) {
      setTempDates({
        start: dateRange?.startDate || new Date().toISOString().split('T')[0],
        end: dateRange?.endDate || new Date().toISOString().split('T')[0]
      });
    }
  }, [rangePickerOpen, dateRange]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const query = `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
      const res = await apiFetch(`/platform/companies/stats${query}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch platform stats', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const stats = data?.metrics || {};
  const trends = data?.trends || {};
  const topOrgs = data?.topOrgs || [];

  return (
    <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
      <div className="p-6 sm:p-12 space-y-10 sm:space-y-12 max-w-[1600px] mx-auto w-full relative">

        {/* ── Background Abstract Shapes (Local to Page) ── */}
        <div className="fixed inset-0 z-[-1] overflow-hidden">
          <div className="absolute top-[10%] right-[5%] w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[20%] left-[10%] w-[400px] h-[400px] bg-purple-200/30 rounded-full blur-[100px]" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
          <div className="animate-in slide-in-from-left-4 duration-1000">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-tight drop-shadow-sm">Global Dashboard</h1>
            <p className="text-xs sm:text-sm font-bold text-slate-500 mt-2">All Organisations Performance & Control Overview</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 animate-in slide-in-from-right-4 duration-1000">

            {/* Pro Date Selector */}
            <div className="relative" ref={pickerRef}>
              <div
                onClick={() => setRangePickerOpen(!rangePickerOpen)}
                className="flex items-center bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl px-5 py-3.5 gap-4 shadow-xl shadow-slate-200/40 cursor-pointer hover:bg-white/60 transition-all group"
              >
                <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                  <CalendarIcon size={18} />
                </div>
                <div className="flex flex-col">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Timeframe</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 tracking-tight">{dateRange.label}</span>
                    <ChevronDownIcon size={14} className={`text-slate-400 transition-transform ${rangePickerOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>

              {rangePickerOpen && (
                <div className="absolute top-full right-0 mt-4 w-72 bg-white border border-slate-100 rounded-[32px] shadow-[0_32px_64px_-16px_rgba(15,23,42,0.2)] z-[100] p-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="space-y-1">
                    {[
                      { key: 'Today', label: 'Today' },
                      { key: '1W', label: 'Last 7 Days' },
                      { key: '1M', label: 'Last 30 Days' },
                      { key: '3M', label: 'Last 3 Months' },
                      { key: '1Y', label: 'Last 1 Year' },
                    ].map((range) => (
                      <button
                        key={range.key}
                        onClick={() => {
                          setDateRange(range.key as any);
                          setRangePickerOpen(false);
                        }}
                        className={`w-full text-left px-5 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${dateRange.key === range.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        {range.label}
                      </button>
                    ))}

                    <div className="pt-4 border-t border-slate-100 mt-3 px-1 pb-2">
                      <p className="px-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 text-center">Custom Precision</p>
                      <div className="flex flex-col gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">Start Date</label>
                          <input
                            type="date"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={tempDates.start}
                            onChange={(e) => setTempDates(prev => ({ ...prev, start: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest pl-2">End Date</label>
                          <input
                            type="date"
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            value={tempDates.end}
                            onChange={(e) => setTempDates(prev => ({ ...prev, end: e.target.value }))}
                          />
                        </div>
                        <button
                          onClick={() => {
                            setDateRange('custom', { start: tempDates.start, end: tempDates.end });
                            setRangePickerOpen(false);
                          }}
                          className="w-full py-4 flex items-center justify-center gap-3 rounded-2xl bg-slate-900 text-white hover:bg-indigo-600 shadow-2xl shadow-slate-900/20 transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
                        >
                          <SearchIcon size={14} />
                          Apply temporal filter
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button onClick={fetchStats} className="flex items-center gap-2.5 px-6 sm:px-8 py-4.5 sm:py-5 bg-indigo-600 text-white rounded-[24px] sm:rounded-[28px] font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all">
              <RefreshIcon size={16} /> <span className="hidden sm:inline">Sync Intelligence</span>
            </button>
          </div>
        </div>

        {/* ── Metric Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 sm:gap-8 animate-in fade-in zoom-in-95 duration-1000">
          <MetricCard title="Total Orgs" value={stats.totalOrgs || 0} trend={`${stats.activeOrgs} Active`} icon={OrgIcon} />
          <MetricCard title="New Personnel" value={stats.newUsersInRange || 0} trend={`In ${dateRange.label}`} icon={TeamIcon} />
          <MetricCard title="Total Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString()}`} trend="Settled Income" icon={AnalyticsIcon} />
          <MetricCard title="Outstanding Dues" value={`₹${(stats.outstandingDues || 0).toLocaleString()}`} trend={`${stats.pendingBillsCount || 0} Bills`} icon={AlertIcon} iconColor="text-rose-500" />
          <MetricCard title="Expired Licenses" value={stats.expiredLicenses || 0} icon={DashboardIcon} iconColor="text-amber-500" />
          <MetricCard title="Suspended Orgs" value={stats.suspendedOrgs || 0} icon={AnalyticsIcon} iconColor="text-rose-600" />
          <MetricCard title="Total Users" value={stats.totalUsers || 0} icon={TeamIcon} />
          <MetricCard title="Pending Reports" value="0" icon={AlertIcon} iconColor="text-orange-500" />
        </div>

        {/* ── Insights Section ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ChartPlaceholder title="Monthly Revenue Trend" data={trends.revenueTrend} type="revenue" />
          <div className="glass-card p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] space-y-8 relative overflow-hidden">
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-indigo-500/5 rounded-full blur-[80px]" />
            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest relative z-10">Health Snapshot</h4>
            <div className="space-y-6 relative z-10">
              {[
                { name: 'ACTIVE ORGS', val: stats.totalOrgs ? Math.floor((stats.activeOrgs / stats.totalOrgs) * 100) : 0, color: 'bg-emerald-500' },
                { name: 'REVENUE SETTLED', val: (stats.totalRevenue + stats.outstandingDues) ? Math.floor((stats.totalRevenue / (stats.totalRevenue + stats.outstandingDues)) * 100) : 0, color: 'bg-indigo-600' },
                { name: 'LICENSE COMPLIANCE', val: stats.totalOrgs ? Math.floor(((stats.totalOrgs - stats.expiredLicenses) / stats.totalOrgs) * 100) : 0, color: 'bg-amber-500' },
              ].map(p => (
                <div key={p.name} className="space-y-2">
                  <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-500">
                    <span>{p.name}</span>
                    <span className="text-slate-900">{p.val}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/30 backdrop-blur-sm rounded-full overflow-hidden border border-white/20">
                    <div className={`h-full ${p.color} shadow-sm`} style={{ width: `${p.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ChartPlaceholder title="User Onboarding" height="h-32" data={trends.userOnboardingTrend} type="users" />
          <div className="glass-card p-6 sm:p-8 rounded-[32px] sm:rounded-[40px] flex flex-col items-center justify-center space-y-6">
            <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-widest self-start">Activation Ratio</h4>
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-white/20" />
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="440" strokeDashoffset={440 - (440 * (stats.totalUsers ? (stats.activeUsersToday / stats.totalUsers) : 0))} className="text-indigo-600 stroke-round drop-shadow-lg" />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter">
                  {stats.totalUsers ? Math.floor((stats.activeUsersToday / stats.totalUsers) * 100) : 0}%
                </span>
                <span className="text-[8px] sm:text-[10px] font-black text-indigo-400 uppercase tracking-widest">Global</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Table Section ── */}
        <div className="glass-card rounded-[40px] sm:rounded-[48px] p-6 sm:p-10 space-y-8 sm:space-y-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px]" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter leading-none">Top Performance Orgs</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar -mx-6 sm:mx-0 relative z-10">
            <table className="w-full text-left min-w-[900px] sm:min-w-0">
              <thead>
                <tr className="border-b border-white/40">
                  <th className="px-6 sm:px-0 pb-6 sm:pb-8 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Organisation Name</th>
                  <th className="pb-6 sm:pb-8 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan</th>
                  <th className="pb-6 sm:pb-8 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Personnel</th>
                  <th className="pb-6 sm:pb-8 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue (Paid)</th>
                  <th className="pb-6 sm:pb-8 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="pb-6 sm:pb-8 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/20">
                {topOrgs.length === 0 ? (
                  <tr><td colSpan={6} className="py-10 text-center text-slate-400 font-bold">No organizational data available yet.</td></tr>
                ) : topOrgs.map((row: any, i: number) => (
                  <tr key={i} className="group hover:bg-white/40 transition-all duration-300">
                    <td className="px-6 sm:px-0 py-6 sm:py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/60 backdrop-blur-md flex items-center justify-center text-indigo-600 font-black text-xs sm:text-sm shadow-sm border border-white/40">{row.name.charAt(0)}</div>
                        <div>
                          <p className="text-xs sm:sm font-black text-slate-900 tracking-tight leading-none">{row.name}</p>
                          <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">CODE: {row.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 sm:py-8">
                      <span className="px-2.5 sm:px-3 py-1 bg-white/60 backdrop-blur-md text-indigo-600 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest border border-white/50">{row.plan || 'Monthly'}</span>
                    </td>
                    <td className="py-6 sm:py-8">
                      <p className="text-[10px] sm:text-xs font-black text-slate-700">{row.userCount} Users</p>
                    </td>
                    <td className="py-6 sm:py-8 text-[11px] sm:text-sm font-black text-slate-900">₹{row.revenue.toLocaleString()}</td>
                    <td className="py-6 sm:py-8">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${row.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-rose-500'} shadow-[0_0_8px_rgba(0,0,0,0.1)]`} />
                        <span className="text-[10px] sm:text-xs font-black text-slate-700 uppercase tracking-widest">{row.status}</span>
                      </div>
                    </td>
                    <td className="py-6 sm:py-8 text-right pr-4 sm:pr-0">
                      <button 
                        onClick={() => router.push(`/organizations/${row.id}`)}
                        className="p-2 sm:p-3 text-slate-300 hover:text-indigo-600 transition-all bg-white/20 rounded-xl hover:bg-white/60"
                      >
                        <DashboardIcon size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>




      </div>
    </div>
  );
}
