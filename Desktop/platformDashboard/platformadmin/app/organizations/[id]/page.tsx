'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUi } from '../../context/UiContext';
import { apiFetch } from '../../../lib/api';

const BackIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
);
const UserIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const ExternalLinkIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
);
const ShieldIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const HistoryIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);
const RefreshIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
const UpgradeIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>
);
const GiftIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect width="20" height="5" x="2" y="7"/><line x1="12" x2="12" y1="22" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
);
const CheckIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const DownloadIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
);

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { setActiveTab, showToast } = useUi();
  const [data, setData] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Modals state
  const [activeModal, setActiveModal] = useState<"RENEW" | "UPGRADE" | "TRIAL" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [renewForm, setRenewForm] = useState({ months: 12, additionalCharges: 0, discountPercentage: 0, taxRate: 18 });
  const [upgradeForm, setUpgradeForm] = useState({ planId: "", userCount: 10, additionalCharges: 0, discountPercentage: 0, taxRate: 18 });
  const [trialForm, setTrialForm] = useState({ months: 1, notes: "" });
  const [viewingBill, setViewingBill] = useState<any>(null);

  useEffect(() => {
    setActiveTab('Organizations');
    loadDetails();
  }, [params.id]);

  // Pre-fill forms when modals open
  useEffect(() => {
    if (!data?.company) return;
    const { company } = data;
    
    if (activeModal === 'RENEW') {
       setRenewForm({
          months: company.subscription?.months || 12,
          additionalCharges: 0,
          discountPercentage: 0,
          taxRate: 18
       });
    } else if (activeModal === 'UPGRADE') {
       setUpgradeForm({
          planId: company.plan?._id || "",
          userCount: company.maxUsers || company.subscription?.userCount || 10,
          additionalCharges: 0,
          discountPercentage: 0,
          taxRate: 18
       });
    }
  }, [activeModal, data]);

  const loadDetails = async () => {
    try {
      const [companyRes, billsRes, plansRes] = await Promise.all([
        apiFetch(`/platform/companies/${params.id}`),
        apiFetch(`/platform/companies/${params.id}/bills`),
        apiFetch('/plans')
      ]);
      setData(companyRes.data);
      setBills(billsRes.data);
      setPlans(plansRes.data || plansRes); // Adjust depending on plans response structure
      
      // Default upgrade form values
      if (companyRes.data && companyRes.data.company) {
         setUpgradeForm(prev => ({
            ...prev,
            userCount: companyRes.data.company.maxUsers || 10,
            planId: companyRes.data.company.plan?._id || ""
         }));
      }
    } catch (err) {
      console.error('Failed to load company details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setConfirming(true);
    try {
      const res = await apiFetch(`/platform/companies/${params.id}/toggle-status`, { method: 'PATCH' });
      setData({ ...data, company: { ...data.company, status: res.status } });
      setShowConfirmModal(false);
      showToast(`Organisation ${res.status === 'Active' ? 'Activated' : 'Deactivated'} Successfully!`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to toggle status', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleSubscriptionAction = async () => {
    setActionLoading(true);
    try {
      let endpoint = '';
      let payload = {};

      if (activeModal === 'RENEW') {
         endpoint = `/platform/companies/${params.id}/renew`;
         payload = renewForm;
      } else if (activeModal === 'UPGRADE') {
         endpoint = `/platform/companies/${params.id}/upgrade`;
         payload = upgradeForm;
      } else if (activeModal === 'TRIAL') {
         endpoint = `/platform/companies/${params.id}/free-trial`;
         payload = trialForm;
      }

      await apiFetch(endpoint, {
         method: 'POST',
         body: JSON.stringify(payload)
      });
      
      setActiveModal(null);
      showToast('Subscription Updated Successfully!', 'success');
      loadDetails(); 
    } catch (err: any) {
      showToast(err.message || 'Failed to process subscription action', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePayBill = async (billId: string) => {
    setActionLoading(true);
    try {
      await apiFetch(`/platform/companies/bills/${billId}/pay`, { method: 'PATCH' });
      showToast('Bill Marked as PAID Successfully!', 'success');
      setViewingBill(null);
      loadDetails();
    } catch (err: any) {
      showToast(err.message || 'Failed to update payment status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadBill = async (billId: string) => {
    try {
      const res = await apiFetch(`/platform/companies/bills/${billId}/download`);
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${res.data.pdf}`;
      link.download = res.data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Downloading Invoice PDF...', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to download PDF', 'error');
    }
  };

  if (loading) return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return <div className="p-10">Organization not found.</div>;

  const { company, users, userCount } = data;
  const currentSub = company.subscription || {};

  return (
    <div className="absolute inset-0 overflow-y-auto custom-scrollbar bg-[#F8FAFC] p-6 sm:p-10 space-y-10 animate-in fade-in duration-700">
      
      {/* Bill View Modal */}
      {viewingBill && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setViewingBill(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[40px] border border-white p-10 shadow-2xl animate-in zoom-in-95 duration-400 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
               <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Invoice Detail</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">{viewingBill.invoiceNumber} • {new Date(viewingBill.invoiceDate).toLocaleDateString()}</p>
               </div>
               <button onClick={() => setViewingBill(null)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-200">
                  <XIcon size={24} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Subscription Period</p>
                     <p className="text-sm font-black text-slate-900">
                        {new Date(viewingBill.subscriptionPeriod.start).toLocaleDateString()} - {new Date(viewingBill.subscriptionPeriod.end).toLocaleDateString()}
                     </p>
                     <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{viewingBill.subscriptionPeriod.months} Months Duration</p>
                  </div>
                  <div className="space-y-1 text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Snapshot</p>
                     <p className="text-sm font-black text-slate-900">{viewingBill.planSnapshot.planName}</p>
                     <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">₹{viewingBill.planSnapshot.pricePerUser}/user • {viewingBill.planSnapshot.billingCycle}</p>
                  </div>
               </div>

               <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Line Items</p>
                  {viewingBill.lineItems.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between py-2">
                       <div>
                          <p className="text-xs font-black text-slate-900">{item.description}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.quantity} units × ₹{item.unitPrice}</p>
                       </div>
                       <p className="text-sm font-black text-slate-900">₹{item.amount.toLocaleString()}</p>
                    </div>
                  ))}
               </div>

               <div className="bg-slate-50 rounded-3xl p-8 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                     <span>Subtotal</span>
                     <span>₹{viewingBill.subtotal.toLocaleString()}</span>
                  </div>
                  {viewingBill.additionalCharges > 0 && (
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                       <span>Additional Charges</span>
                       <span>₹{viewingBill.additionalCharges.toLocaleString()}</span>
                    </div>
                  )}
                  {viewingBill.discount.amount > 0 && (
                    <div className="flex justify-between text-xs font-bold text-rose-500">
                       <span>Discount ({viewingBill.discount.value}%)</span>
                       <span>- ₹{viewingBill.discount.amount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs font-bold text-slate-500 pt-2 border-t border-slate-200">
                     <span>Taxable Amount</span>
                     <span>₹{viewingBill.taxableAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                     <span>{viewingBill.taxBreakdown.taxType} ({viewingBill.taxBreakdown.rate}%)</span>
                     <span>₹{viewingBill.taxBreakdown.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200">
                     <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">Grand Total</p>
                     <p className="text-2xl font-black text-indigo-600 tracking-tighter">₹{viewingBill.totalAmount.toLocaleString()}</p>
                  </div>
               </div>
               
               {viewingBill.notes && (
                 <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Internal Notes</p>
                    <p className="text-xs font-bold text-amber-700 leading-relaxed">{viewingBill.notes}</p>
                 </div>
               )}
            </div>

            <div className="pt-8 border-t border-slate-100 flex justify-end">
               <button onClick={() => setViewingBill(null)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all">Close Bill View</button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-400 hover:text-indigo-600 hover:shadow-lg transition-all">
          <BackIcon size={20} />
        </button>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Organization Detail</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{company.name}</h1>
        </div>
      </div>

      {/* Hero & Subscription Info */}
      {/* Hero & Subscription Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card p-10 rounded-[48px] flex flex-col sm:flex-row items-center gap-10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
           <div className="w-32 h-32 rounded-[40px] bg-slate-100 overflow-hidden border-4 border-white shadow-2xl flex items-center justify-center text-4xl font-black text-indigo-600">
              {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" /> : company.name.charAt(0)}
           </div>
           <div className="flex-1 text-center sm:text-left space-y-6 z-10">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-3">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">{company.name}</h2>
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${company.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {company.status}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest">CODE: {company.code} • ACCESS: {company.accessKey}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                 <button onClick={() => setShowConfirmModal(true)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${company.status === 'ACTIVE' ? 'bg-rose-50 text-rose-600 border border-rose-100 shadow-rose-200/20' : 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-emerald-200/20'} hover:shadow-xl`}>
                   {company.status === 'ACTIVE' ? 'Suspend Organization' : 'Activate Organization'}
                 </button>
              </div>
           </div>
        </div>

         <div className="glass-card p-10 rounded-[48px] space-y-8 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-600/5 rounded-full blur-2xl" />
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Total Revenue</p>
                   <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                     <CheckIcon size={18} />
                   </div>
                </div>
                <div className="mt-2">
                   <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{(data.totalRevenue || 0).toLocaleString()}</p>
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Settled Income (PAID)</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">Outstanding Dues</p>
                   <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                     <HistoryIcon size={18} />
                   </div>
                </div>
                <div className="mt-2">
                   {(() => {
                      const pending = bills.filter(b => b.paymentStatus === 'PENDING').reduce((sum, b) => sum + b.totalAmount, 0);
                      return (
                        <>
                           <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{pending.toLocaleString()}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{bills.filter(b => b.paymentStatus === 'PENDING').length} Unpaid Invoice{bills.filter(b => b.paymentStatus === 'PENDING').length !== 1 ? 's' : ''}</p>
                        </>
                      );
                   })()}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
               <div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg. Monthly</p>
                 <p className="text-sm font-black text-slate-900 mt-1">₹{Math.floor((data.totalRevenue || 0) / (bills.filter(b => b.paymentStatus === 'PAID').length || 1)).toLocaleString()}</p>
               </div>
               <div className="text-right">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Bills</p>
                 <p className="text-sm font-black text-slate-900 mt-1">{bills.length}</p>
               </div>
            </div>
         </div>
      </div>

      {/* Subscription Lifecycle Timeline */}
      <div className="glass-card p-10 rounded-[48px] border border-slate-100/50">
         <div className="flex items-center justify-between mb-10">
            <div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Subscription Lifecycle</h3>
               <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Evolution of {company.name}</p>
            </div>
            <div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest">
               {bills.length} Milestone{bills.length !== 1 ? 's' : ''}
            </div>
         </div>

         <div className="relative space-y-12 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            {bills.slice().reverse().map((bill, index) => (
               <div key={bill._id} className="relative pl-12 group cursor-pointer" onClick={() => setViewingBill(bill)}>
                  <div className={`absolute left-0 w-10 h-10 rounded-2xl flex items-center justify-center z-10 border-4 border-[#F8FAFC] transition-transform group-hover:scale-110 ${
                     bill.type === 'INITIAL' ? 'bg-indigo-600 text-white' :
                     bill.type === 'RENEWAL' ? 'bg-emerald-500 text-white' :
                     bill.type === 'UPGRADE' ? 'bg-purple-600 text-white' :
                     bill.type === 'FREE_TRIAL' ? 'bg-amber-500 text-white' : 'bg-slate-400 text-white'
                  }`}>
                     {bill.type === 'INITIAL' ? <ShieldIcon size={16} /> : 
                      bill.type === 'RENEWAL' ? <RefreshIcon size={16} /> :
                      bill.type === 'UPGRADE' ? <UpgradeIcon size={16} /> :
                      bill.type === 'FREE_TRIAL' ? <GiftIcon size={16} /> : <HistoryIcon size={16} />}
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-[32px] bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                     <div>
                        <div className="flex items-center gap-3">
                           <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                              {bill.type === 'INITIAL' ? 'Organization Onboarded' : 
                               bill.type === 'RENEWAL' ? 'Subscription Renewed' :
                               bill.type === 'UPGRADE' ? 'Plan Upgraded' :
                               bill.type === 'FREE_TRIAL' ? 'Free Trial Granted' : bill.type}
                           </h4>
                           <span className="text-[10px] font-bold text-slate-400">{new Date(bill.invoiceDate).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-500 mt-1">
                           Plan: <span className="text-slate-900 font-black">{bill.planSnapshot?.planName}</span> • 
                           Duration: <span className="text-slate-900 font-black">{bill.subscriptionPeriod?.months} Months</span>
                        </p>
                     </div>
                     <div className="flex items-center gap-6">
                        <div className="text-right">
                           <p className="text-lg font-black text-slate-900">₹{bill.totalAmount.toLocaleString()}</p>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{bill.invoiceNumber}</p>
                        </div>
                        <button 
                           onClick={(e) => { e.stopPropagation(); handleDownloadBill(bill._id); }}
                           className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        >
                           <DownloadIcon size={18} />
                        </button>
                     </div>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Subscription Management Actions */}
      <div className="glass-card p-6 rounded-[32px] flex flex-wrap items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 hidden sm:flex">
            <ShieldIcon size={24} />
         </div>
         <div className="flex-1 min-w-[200px]">
            <h3 className="text-sm font-black text-slate-900">Manage Lifecycle</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Perform billing & subscription actions</p>
         </div>
         <div className="flex flex-wrap items-center gap-3">
             <button 
               onClick={() => {
                 const daysLeft = Math.ceil((new Date(currentSub.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                 if (daysLeft > 3 && company.status === 'ACTIVE') {
                   showToast(`Renewal available only within 3 days of expiry. Current: ${daysLeft} days left.`, 'info');
                 } else {
                   setActiveModal("RENEW");
                 }
               }} 
               className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
             >
                <RefreshIcon size={14} /> Renew Plan
             </button>
             <button 
               onClick={() => {
                 const daysLeft = Math.ceil((new Date(currentSub.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                 if (daysLeft > 3 && company.status === 'ACTIVE') {
                   showToast(`Upgrade available only within 3 days of expiry or during renewal.`, 'info');
                 } else {
                   setActiveModal("UPGRADE");
                 }
               }} 
               className="px-5 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 hover:shadow-lg transition-all shadow-indigo-600/30"
             >
                <UpgradeIcon size={14} /> Upgrade Plan
             </button>
             <button onClick={() => setActiveModal("TRIAL")} className="px-5 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-2 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 transition-all shadow-sm">
                <GiftIcon size={14} /> Free Trial
             </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Billing History */}
         <div className="space-y-6">
           <div className="flex items-center gap-3 px-2">
             <div className="p-2 bg-slate-200 rounded-lg text-slate-600"><HistoryIcon size={16} /></div>
             <div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Billing History</h3>
               <p className="text-xs font-bold text-slate-500 mt-1">Invoice records for this organization</p>
             </div>
           </div>
           
           <div className="glass-card rounded-[32px] overflow-hidden border border-white/40 shadow-xl p-2">
             <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {bills.length === 0 ? (
                  <div className="p-8 text-center text-sm font-bold text-slate-400">No invoices found.</div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {bills.map((bill: any) => (
                      <div key={bill._id} className="p-4 rounded-2xl bg-white border border-slate-100 flex flex-wrap items-center justify-between gap-4 hover:border-indigo-200 transition-all group/bill">
                         <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest ${
                               bill.type === 'INITIAL' ? 'bg-blue-50 text-blue-600' :
                               bill.type === 'RENEWAL' ? 'bg-emerald-50 text-emerald-600' :
                               bill.type === 'UPGRADE' ? 'bg-purple-50 text-purple-600' :
                               bill.type === 'FREE_TRIAL' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'
                            }`}>
                               {bill.type === 'FREE_TRIAL' ? 'FREE' : bill.type.substring(0, 3)}
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-900">{bill.invoiceNumber}</p>
                               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{new Date(bill.invoiceDate).toLocaleDateString()} • {bill.planSnapshot?.planName}</p>
                            </div>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="text-right">
                               <p className="text-lg font-black text-slate-900">₹{bill.totalAmount.toLocaleString()}</p>
                               <p className={`text-[9px] font-black uppercase tracking-widest ${
                                  bill.paymentStatus === 'PAID' ? 'text-emerald-500' : 
                                  bill.paymentStatus === 'WAIVED' ? 'text-slate-400' : 'text-amber-500'
                               }`}>
                                  {bill.paymentStatus}
                               </p>
                            </div>
                            <div className="flex items-center gap-2">
                               {bill.paymentStatus === 'PENDING' && (
                                  <button 
                                     onClick={(e) => { e.stopPropagation(); handlePayBill(bill._id); }}
                                     className="px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                  >
                                     Settle
                                  </button>
                               )}
                               <button 
                                 onClick={() => setViewingBill(bill)}
                                 className="px-3 py-2 bg-slate-50 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                               >
                                  View
                               </button>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
           </div>
         </div>

         {/* Personnel Table */}
         <div className="space-y-6">
           <div className="flex items-center justify-between px-2">
             <div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Personnel</h3>
               <p className="text-xs font-bold text-slate-500 mt-1">Users registered under {company.name}</p>
             </div>
           </div>
           <div className="glass-card rounded-[32px] overflow-hidden border border-white/40 shadow-xl p-2">
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                <div className="flex flex-col gap-2">
                   {users.map((user: any) => (
                     <div key={user._id} className="p-4 rounded-2xl bg-white border border-slate-100 flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-200 transition-all" onClick={() => router.push(`/organizations/${company._id}/users/${user._id}`)}>
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 font-black text-xs">{user.name.charAt(0)}</div>
                           <div>
                              <p className="text-xs font-black text-slate-900">{user.name}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5">{user.email}</p>
                           </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                           <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase tracking-widest">{user.roleId?.name || 'USER'}</span>
                           <p className="text-[9px] font-bold text-slate-400">Last: {(user.lastActiveAt || user.lastLoginAt) ? new Date(user.lastActiveAt || user.lastLoginAt).toLocaleDateString() : 'Never'}</p>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
           </div>
         </div>
      </div>

      {/* Subscription Action Modals */}
      {activeModal && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !actionLoading && setActiveModal(null)} />
            <div className="relative w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-[40px] border border-white p-8 shadow-2xl animate-in zoom-in-95 duration-400 flex flex-col max-h-[90vh]">
               <div className="flex items-center justify-between mb-8">
                  <div>
                     <h2 className="text-2xl font-black text-slate-900">
                        {activeModal === 'RENEW' ? 'Renew Subscription' : activeModal === 'UPGRADE' ? 'Upgrade Plan' : 'Grant Free Trial'}
                     </h2>
                     <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{company.name}</p>
                  </div>
                  <button onClick={() => !actionLoading && setActiveModal(null)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
               </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4 space-y-6">
                   {/* RENEW FORM */}
                   {activeModal === 'RENEW' && (
                      <>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration (Months)</label>
                            <input type="number" value={renewForm.months} onChange={(e) => setRenewForm({...renewForm, months: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add. Charges (₹)</label>
                               <input type="number" value={renewForm.additionalCharges} onChange={(e) => setRenewForm({...renewForm, additionalCharges: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                            </div>
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount (%)</label>
                               <input type="number" value={renewForm.discountPercentage} onChange={(e) => setRenewForm({...renewForm, discountPercentage: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                            </div>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Rate (%)</label>
                            <input type="number" value={renewForm.taxRate} onChange={(e) => setRenewForm({...renewForm, taxRate: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                      </>
                   )}

                   {/* UPGRADE FORM */}
                   {activeModal === 'UPGRADE' && (
                      <>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select New Plan</label>
                            <select value={upgradeForm.planId} onChange={(e) => setUpgradeForm({...upgradeForm, planId: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all appearance-none">
                               <option value="" disabled>Select a plan...</option>
                               {plans.map((p: any) => (
                                  <option key={p._id} value={p._id}>{p.name} - ₹{p.price}/user</option>
                               ))}
                            </select>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total User Quota</label>
                            <input type="number" value={upgradeForm.userCount} onChange={(e) => setUpgradeForm({...upgradeForm, userCount: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upgrade Fees (₹)</label>
                               <input type="number" value={upgradeForm.additionalCharges} onChange={(e) => setUpgradeForm({...upgradeForm, additionalCharges: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                            </div>
                            <div className="space-y-3">
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Discount (%)</label>
                               <input type="number" value={upgradeForm.discountPercentage} onChange={(e) => setUpgradeForm({...upgradeForm, discountPercentage: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                            </div>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tax Rate (%)</label>
                            <input type="number" value={upgradeForm.taxRate} onChange={(e) => setUpgradeForm({...upgradeForm, taxRate: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                      </>
                   )}

                   {/* TRIAL FORM */}
                   {activeModal === 'TRIAL' && (
                      <>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Free Extension (Months)</label>
                            <input type="number" value={trialForm.months} onChange={(e) => setTrialForm({...trialForm, months: parseInt(e.target.value) || 1})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" />
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Notes</label>
                            <textarea rows={3} value={trialForm.notes} onChange={(e) => setTrialForm({...trialForm, notes: e.target.value})} placeholder="e.g. Compensation for downtime, special offer..." className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none" />
                         </div>
                      </>
                   )}

                   {/* LIVE SUMMARY CARD */}
                   {(activeModal === 'RENEW' || activeModal === 'UPGRADE' || activeModal === 'TRIAL') && (
                      <div className="p-6 bg-slate-900 rounded-[32px] space-y-4">
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Live Bill Summary</p>
                         <div className="space-y-2">
                            {(() => {
                               let base = 0;
                               let add = 0;
                               let discP = 0;
                               let taxR = 0;
                               let total = 0;

                               if (activeModal === 'RENEW') {
                                  const planPrice = company.plan?.price || 0;
                                  const disc = renewForm.months >= 12 ? 0.8 : 1;
                                  base = Math.floor(planPrice * disc) * (company.subscription?.userCount || company.maxUsers || 1) * renewForm.months;
                                  add = renewForm.additionalCharges;
                                  discP = renewForm.discountPercentage;
                                  taxR = renewForm.taxRate;
                               } else if (activeModal === 'UPGRADE') {
                                  const selectedPlan = plans.find(p => p._id === upgradeForm.planId);
                                  const price = selectedPlan?.price || 0;
                                  base = price * upgradeForm.userCount * 1; // 1 Month for upgrade
                                  add = upgradeForm.additionalCharges;
                                  discP = upgradeForm.discountPercentage;
                                  taxR = upgradeForm.taxRate;
                               } else if (activeModal === 'TRIAL') {
                                  return (
                                    <div className="text-center py-2">
                                       <p className="text-sm font-black text-amber-500">PAYMENT WAIVED</p>
                                       <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{trialForm.months} MONTHS FREE EXTENSION</p>
                                    </div>
                                  );
                               }

                               const subtotal = base + add;
                               const discountAmt = (subtotal * discP) / 100;
                               const taxable = subtotal - discountAmt;
                               const taxAmt = Math.floor(taxable * (taxR / 100));
                               total = taxable + taxAmt;

                               return (
                                  <>
                                     <div className="flex justify-between text-xs font-bold text-slate-400">
                                        <span>Subtotal</span>
                                        <span>₹{subtotal.toLocaleString()}</span>
                                     </div>
                                     <div className="flex justify-between text-xs font-bold text-rose-400">
                                        <span>Discount ({discP}%)</span>
                                        <span>- ₹{discountAmt.toLocaleString()}</span>
                                     </div>
                                     <div className="flex justify-between text-xs font-bold text-slate-400">
                                        <span>GST ({taxR}%)</span>
                                        <span>+ ₹{taxAmt.toLocaleString()}</span>
                                     </div>
                                     <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                                        <span className="text-[10px] font-black text-white uppercase tracking-widest">Final Total</span>
                                        <span className="text-xl font-black text-indigo-400">₹{total.toLocaleString()}</span>
                                     </div>
                                  </>
                               );
                            })()}
                         </div>
                      </div>
                   )}
                </div>

               <div className="pt-6 border-t border-slate-100 flex gap-4 mt-2">
                  <button onClick={() => setActiveModal(null)} disabled={actionLoading} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all">Cancel</button>
                  <button onClick={handleSubscriptionAction} disabled={actionLoading} className="flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-600/30 transition-all flex items-center justify-center gap-2">
                     {actionLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckIcon size={16} /> Confirm</>}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Bill Viewer Modal */}
      {viewingBill && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !actionLoading && setViewingBill(null)} />
           <div className="relative w-full max-w-2xl bg-white/95 backdrop-blur-2xl rounded-[48px] border border-white p-10 shadow-3xl animate-in zoom-in-95 duration-400 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between mb-8">
                 <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{viewingBill.invoiceNumber}</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{viewingBill.type} INVOICE</p>
                 </div>
                 <button onClick={() => !actionLoading && setViewingBill(null)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-200">
                    <XIcon size={24} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
                 {/* Bill Status Banner */}
                 <div className={`p-6 rounded-3xl border flex items-center justify-between ${
                    viewingBill.paymentStatus === 'PAID' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 
                    viewingBill.paymentStatus === 'WAIVED' ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-amber-50 border-amber-100 text-amber-700'
                 }`}>
                    <div className="flex items-center gap-3">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${viewingBill.paymentStatus === 'PAID' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white shadow-lg'}`}>
                          {viewingBill.paymentStatus === 'PAID' ? <CheckIcon size={20} /> : <HistoryIcon size={20} />}
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Current Status</p>
                          <p className="text-sm font-black uppercase">{viewingBill.paymentStatus}</p>
                       </div>
                    </div>
                    {viewingBill.paymentStatus === 'PENDING' && (
                       <button 
                         onClick={() => handlePayBill(viewingBill._id)}
                         disabled={actionLoading}
                         className="px-6 py-3 bg-white border border-amber-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 transition-all shadow-sm"
                       >
                          {actionLoading ? <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" /> : 'Mark as Paid'}
                       </button>
                    )}
                 </div>

                 {/* Bill Particulars */}
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Period</p>
                       <p className="text-sm font-bold text-slate-900">
                          {new Date(viewingBill.subscriptionPeriod?.start).toLocaleDateString()} - {new Date(viewingBill.subscriptionPeriod?.end).toLocaleDateString()}
                       </p>
                    </div>
                    <div className="space-y-1 text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Selection</p>
                       <p className="text-sm font-bold text-slate-900">{viewingBill.planSnapshot?.planName} ({viewingBill.userCount} Users)</p>
                    </div>
                 </div>

                 {/* Financial Table */}
                 <div className="space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Line Items</p>
                    <div className="space-y-2">
                       {viewingBill.lineItems?.map((item: any, i: number) => (
                          <div key={i} className="flex justify-between items-center text-sm font-bold text-slate-600">
                             <span>{item.description}</span>
                             <span>₹{item.amount.toLocaleString()}</span>
                          </div>
                       ))}
                       <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-lg font-black text-slate-900">
                          <div className="flex flex-col">
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Payable</span>
                             <span>₹{viewingBill.totalAmount.toLocaleString()}</span>
                          </div>
                          <button 
                            onClick={() => handleDownloadBill(viewingBill._id)}
                            className="px-6 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:shadow-xl hover:shadow-indigo-600/30 transition-all active:scale-95"
                          >
                             <DownloadIcon size={16} /> Download PDF
                          </button>
                       </div>
                    </div>
                 </div>

                 <p className="text-[10px] font-bold text-slate-400 leading-relaxed italic text-center border-t border-slate-50 pt-6">"This document serves as an official invoice. Payment settlement is subject to the terms and conditions outlined in the Master Service Agreement."</p>
              </div>
           </div>
        </div>
      )}

      {/* Status Toggle Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => !confirming && setShowConfirmModal(false)} />
           <div className="relative w-full max-w-md bg-white/70 backdrop-blur-2xl rounded-[48px] border border-white/60 p-10 shadow-3xl animate-in zoom-in-95 duration-500 ease-spring">
              <div className={`w-20 h-20 rounded-3xl ${company.status === 'ACTIVE' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'} flex items-center justify-center mb-8 mx-auto rotate-12`}><ShieldIcon size={32} /></div>
              <div className="text-center space-y-4">
                 <h2 className="text-2xl font-black text-slate-900 tracking-tight">Confirm Action</h2>
                 <p className="text-sm font-bold text-slate-500 leading-relaxed">
                   Are you sure you want to <span className={company.status === 'ACTIVE' ? 'text-rose-600' : 'text-emerald-600'}>{company.status === 'ACTIVE' ? 'SUSPEND' : 'ACTIVATE'}</span> <strong>{company.name}</strong>? 
                   This will immediately affect all associated accounts.
                 </p>
              </div>
              <div className="mt-10 flex flex-col gap-4">
                 <button onClick={handleToggleStatus} disabled={confirming} className={`w-full py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 ${company.status === 'ACTIVE' ? 'bg-rose-600 text-white shadow-rose-600/30' : 'bg-emerald-600 text-white shadow-emerald-600/30'} hover:-translate-y-1 active:scale-95 disabled:opacity-50`}>
                   {confirming ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Confirm {company.status === 'ACTIVE' ? 'Suspension' : 'Activation'}</>}
                 </button>
                 <button onClick={() => setShowConfirmModal(false)} disabled={confirming} className="w-full py-5 rounded-3xl font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all disabled:opacity-30">Cancel Action</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
