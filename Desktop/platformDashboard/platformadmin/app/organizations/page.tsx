'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUi } from '../context/UiContext';
import { apiFetch } from '../../lib/api';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const SearchIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const FilterIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
);
const DownloadIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);
const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const ExternalLinkIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
);
const UserIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function OrganizationsPage() {
  const { setActiveTab } = useUi();
  const router = useRouter();
  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [plans, setPlans] = useState<any[]>([]);

  const PlusIcon = ({ size = 20 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  );

  useEffect(() => {
    setActiveTab('Organizations');
    loadCompanies();
    loadPlans();
  }, [page]);

  const loadPlans = async () => {
    try {
      const res = await apiFetch('/plans');
      setPlans(res.data || res);
    } catch (err) {
      console.error('Failed to load plans', err);
    }
  };

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/platform/companies?page=${page}&limit=${limit}`);
      setCompanies(res.data);
      setTotal(res.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      console.error('Failed to load companies', err);
    } finally {
      setLoading(false);
    }
  };

  const [downloading, setDownloading] = useState(false);

  const downloadExcel = () => {
    setDownloading(true);
    
    // Small timeout to allow spinner to show
    setTimeout(() => {
      // Generate HTML for Excel to support styling and avoid auto-date formatting
      const title = "FINCH AXIS - ORGANIZATIONS REPORT";
      const headers = ["Company Name", "Plan", "Users Count", "Status", "Code"];
      
      const rows = companies.map(c => `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">${c.name}</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">${c.plan?.name || 'NO PLAN'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">'${c.userCount} / ${c.maxUsers}</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">${c.status}</td>
          <td style="border: 1px solid #e2e8f0; padding: 8px;">${c.code}</td>
        </tr>
      `).join("");

      const htmlContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:Name>Organizations</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
        <body>
          <table style="border-collapse: collapse; font-family: sans-serif;">
            <tr>
              <th colspan="5" style="background-color: #10b981; color: white; padding: 20px; font-size: 18px; text-align: center;">${title}</th>
            </tr>
            <tr style="background-color: #f8fafc;">
              ${headers.map(h => `<th style="border: 1px solid #e2e8f0; padding: 12px; text-align: left; background-color: #f1f5f9;">${h}</th>`).join("")}
            </tr>
            ${rows}
          </table>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `organizations_report_${new Date().toLocaleDateString()}.xls`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(false);
    }, 1000);
  };

  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    name: '', code: '', industry: 'Pharmaceuticals', contactEmail: '', phoneNumber: '', orgType: 'Private Limited', address: '',
    planId: '', billingCycle: 'Monthly', userCount: 10, startDate: new Date().toISOString().split('T')[0],
    additionalCharges: 0, discountPercentage: 0, taxRate: 18
  });

  const handleOnboard = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardLoading(true);
    try {
      await apiFetch('/platform/companies/onboard', {
        method: 'POST',
        body: JSON.stringify(onboardForm)
      });
      setShowOnboardModal(false);
      loadCompanies();
      setOnboardForm({
        name: '', code: '', industry: 'Pharmaceuticals', contactEmail: '', phoneNumber: '', orgType: 'Private Limited', address: '',
        planId: '', billingCycle: 'Monthly', userCount: 10, startDate: new Date().toISOString().split('T')[0],
        additionalCharges: 0, discountPercentage: 0, taxRate: 18
      });
    } catch (err: any) {
      alert(err.message || 'Failed to onboard organization');
    } finally {
      setOnboardLoading(false);
    }
  };

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-[#F8FAFC]">
      
      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 space-y-8 animate-in fade-in duration-700">
        
        {/* Onboarding Modal */}
        {showOnboardModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !onboardLoading && setShowOnboardModal(false)} />
             <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[48px] border border-white p-10 shadow-2xl animate-in zoom-in-95 duration-400 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between mb-8">
                   <div>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Onboard New Organization</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Register tenant & initial billing</p>
                   </div>
                   <button onClick={() => !onboardLoading && setShowOnboardModal(false)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
                      <XIcon size={24} />
                   </button>
                </div>

                <form onSubmit={handleOnboard} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
                   {/* Basic Info */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                         <div className="w-2 h-6 bg-indigo-600 rounded-full" />
                         <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">General Information</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Company Name</label>
                            <input required type="text" value={onboardForm.name} onChange={e => setOnboardForm({...onboardForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="e.g. Acme Pharma" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unique Code (4 Letters + 4 Digits)</label>
                            <input required type="text" maxLength={8} value={onboardForm.code} onChange={e => setOnboardForm({...onboardForm, code: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all uppercase" placeholder="ACME1234" />
                         </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                            <input required type="email" value={onboardForm.contactEmail} onChange={e => setOnboardForm({...onboardForm, contactEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="admin@company.com" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                            <input type="text" value={onboardForm.phoneNumber} onChange={e => setOnboardForm({...onboardForm, phoneNumber: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="+91 00000 00000" />
                         </div>
                      </div>
                   </div>

                   {/* Subscription Info */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                         <div className="w-2 h-6 bg-emerald-500 rounded-full" />
                         <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Subscription Plan</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Plan</label>
                            <select required value={onboardForm.planId} onChange={e => setOnboardForm({...onboardForm, planId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all appearance-none">
                               <option value="" disabled>Choose a plan...</option>
                               {plans.map((p: any) => (
                                 <option key={p._id} value={p._id}>{p.name} - ₹{p.price}/user</option>
                               ))}
                            </select>
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Cycle</label>
                            <div className="flex bg-slate-100 p-1 rounded-2xl">
                               <button type="button" onClick={() => setOnboardForm({...onboardForm, billingCycle: 'Monthly'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${onboardForm.billingCycle === 'Monthly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Monthly</button>
                               <button type="button" onClick={() => setOnboardForm({...onboardForm, billingCycle: 'Yearly'})} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${onboardForm.billingCycle === 'Yearly' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Yearly (20% Off)</button>
                            </div>
                         </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Initial User Count</label>
                            <input required type="number" min={1} value={onboardForm.userCount} onChange={e => setOnboardForm({...onboardForm, userCount: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Activation Date</label>
                            <input required type="date" value={onboardForm.startDate} onChange={e => setOnboardForm({...onboardForm, startDate: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                      </div>
                   </div>

                   {/* Financial Adjustments */}
                   <div className="space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                         <div className="w-2 h-6 bg-amber-500 rounded-full" />
                         <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Financial Adjustments</h3>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Add. Fees (₹)</label>
                            <input type="number" value={onboardForm.additionalCharges} onChange={e => setOnboardForm({...onboardForm, additionalCharges: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Disc. (%)</label>
                            <input type="number" value={onboardForm.discountPercentage} onChange={e => setOnboardForm({...onboardForm, discountPercentage: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax (%)</label>
                            <input type="number" value={onboardForm.taxRate} onChange={e => setOnboardForm({...onboardForm, taxRate: parseFloat(e.target.value) || 18})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                      </div>
                   </div>

                   <button disabled={onboardLoading} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3">
                      {onboardLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>Finalize Onboarding & Generate Invoice</>
                      )}
                   </button>
                </form>
             </div>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-[280px]">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">Organisation Management</h1>
            <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Global Platform Control Center</p>
          </div>
          <div className="flex items-center gap-4 flex-1 lg:flex-none justify-end">
            <div className="relative flex-1 sm:flex-none group min-w-[200px]">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors z-10 pointer-events-none">
                <SearchIcon size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search organizations..." 
                className="bg-white border border-slate-200 rounded-2xl pl-12 pr-5 py-3 text-[11px] font-black w-full sm:w-64 focus:ring-4 focus:ring-indigo-100 transition-all outline-none relative shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Organizations Table */}
        <div className="glass-card rounded-[32px] overflow-hidden border border-white/40 shadow-xl">
           <div className="px-10 py-6 border-b border-slate-100 flex items-center justify-between bg-white/40 backdrop-blur-md">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Active Organizations <span className="ml-2 text-xs text-slate-400 font-bold">({total})</span></h3>
              <div className="flex items-center gap-2">
                 <button 
                   onClick={() => setShowOnboardModal(true)}
                   className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2"
                 >
                    <PlusIcon size={14} /> Onboard Organization
                 </button>
                 <button 
                   onClick={downloadExcel}
                   disabled={downloading}
                   className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-white/60 rounded-xl transition-all flex items-center justify-center min-w-[44px]" 
                   title="Export to Excel"
                 >
                    {downloading ? (
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <DownloadIcon size={18} />
                    )}
                 </button>
              </div>
           </div>
           
           <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                 <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/30">
                       <th className="px-10 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Company & Code</th>
                       <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subscription Plan</th>
                       <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Users Quota</th>
                       <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Status</th>
                       <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : filteredCompanies.map((company) => (
                      <tr 
                        key={company._id} 
                        className="hover:bg-white/40 transition-all group cursor-pointer" 
                        onClick={() => router.push(`/organizations/${company._id}`)}
                      >
                         <td className="px-10 py-6">
                            <div className="flex items-center gap-4">
                               <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border-2 border-white group-hover:scale-110 transition-transform flex items-center justify-center font-black text-indigo-600 shadow-sm">
                                  {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" /> : company.name.charAt(0)}
                               </div>
                               <div>
                                  <p className="text-sm font-black text-slate-900 tracking-tight leading-none">{company.name}</p>
                                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{company.code}</p>
                                </div>
                            </div>
                         </td>
                         <td className="px-6 py-6">
                            <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-100 shadow-sm">
                               {company.plan?.name || 'NO PLAN'}
                            </span>
                         </td>
                         <td className="px-6 py-6">
                            <div className="flex items-center gap-2">
                               <div className={`w-1.5 h-1.5 rounded-full ${company.userCount >= company.maxUsers ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                               <p className="text-xs font-black text-slate-700">{company.userCount} / {company.maxUsers}</p>
                            </div>
                         </td>
                         <td className="px-6 py-6">
                            <div className="flex justify-center">
                               <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                 company.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                               }`}>
                                 {company.status}
                               </span>
                            </div>
                         </td>
                         <td className="px-6 py-6 text-right">
                            <button 
                              className="p-3 text-slate-400 hover:text-indigo-600 transition-all bg-white/20 rounded-xl hover:bg-white/60"
                              onClick={(e) => { e.stopPropagation(); router.push(`/organizations/${company._id}`); }}
                            >
                               <ExternalLinkIcon size={18} />
                            </button>
                         </td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>

           {/* Pagination Footer */}
           {!loading && totalPages > 1 && (
             <div className="px-10 py-6 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   Showing {((page - 1) * limit) + 1} - {Math.min(page * limit, total)} of {total} Organizations
                </p>
                <div className="flex items-center gap-2">
                   <button 
                     disabled={page === 1}
                     onClick={() => setPage(p => p - 1)}
                     className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all disabled:opacity-30 disabled:pointer-events-none"
                   >
                      Previous
                   </button>
                   <div className="flex items-center gap-1 px-4">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <button 
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${p === page ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-slate-900'}`}
                        >
                           {p}
                        </button>
                      ))}
                   </div>
                   <button 
                     disabled={page === totalPages}
                     onClick={() => setPage(p => p + 1)}
                     className="px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600 transition-all disabled:opacity-30 disabled:pointer-events-none"
                   >
                      Next
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>

    </div>
  );
}
