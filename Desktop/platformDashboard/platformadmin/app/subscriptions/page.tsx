'use client';

import React, { useEffect, useState } from 'react';
import { useUi } from '../context/UiContext';
import { apiFetch } from '../../lib/api';
import Link from 'next/link';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const TrashIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
);
const EditIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
);
const CheckIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
   const { setActiveTab, showToast } = useUi();
 
   useEffect(() => {
     setActiveTab('Subscriptions');
     loadPlans();
   }, []);
 
   const loadPlans = async () => {
     try {
       const data = await apiFetch('/plans');
       setPlans(data);
     } catch (err) {
       console.error('Failed to load plans', err);
     } finally {
       setLoading(false);
     }
   };
 
   const deletePlan = async (id: string) => {
     if (!confirm('Are you sure you want to delete this plan?')) return;
     try {
       await apiFetch(`/plans?id=${id}`, { method: 'DELETE' });
       setPlans(plans.filter(p => p._id !== id));
       showToast('Plan deleted successfully', 'success');
     } catch (err) {
       showToast('Failed to delete plan', 'error');
     }
   };

  return (
    <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6 sm:p-12 space-y-10 sm:space-y-12 animate-in fade-in duration-700">
      <div className="max-w-[1600px] mx-auto w-full space-y-10 sm:space-y-12">
      
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tighter leading-tight">Subscription Plans</h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500 mt-2">Manage your organization's pricing tiers and feature sets</p>
        </div>
        <Link 
          href="/subscriptions/create"
          className="flex items-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all w-fit"
        >
          <PlusIcon size={18} /> Create New Plan
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-12 h-12 border-4 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan._id} className="glass-card p-8 rounded-[40px] flex flex-col gap-8 transition-all hover:shadow-2xl hover:-translate-y-2 group relative overflow-hidden">
               <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all" />
               
               <div className="flex justify-between items-start relative z-10">
                   <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{plan.name}</h3>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-1">Dynamic Seat-Based Plan</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-600 text-white rounded-2xl text-lg font-black shadow-lg shadow-indigo-600/20">
                    ₹{plan.price}<span className="text-[10px] ml-1">/user/mo</span>
                  </div>
               </div>

               <div className="space-y-4 relative z-10 flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-white/20 pb-2">Plan Features</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <CheckIcon size={14} />
                      </div>
                      <span className="text-xs font-bold text-slate-600">Unlimited Scalability</span>
                    </div>
                    {plan.features?.map((feature: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                          <CheckIcon size={14} />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{feature}</span>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="pt-6 border-t border-white/20 flex gap-4 relative z-10">
                  <Link 
                    href={`/subscriptions/edit/${plan._id}`}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-white/40 border border-white/40 backdrop-blur-md text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/60 transition-all"
                  >
                    <EditIcon size={16} /> Edit
                  </Link>
                  <button 
                    onClick={() => deletePlan(plan._id)}
                    className="flex-1 flex items-center justify-center gap-2 py-4 bg-rose-500/10 border border-rose-500/20 backdrop-blur-md text-rose-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500/20 transition-all"
                  >
                    <TrashIcon size={16} /> Delete
                  </button>
               </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-full glass-card p-12 text-center rounded-[40px]">
              <p className="text-slate-400 font-bold">No subscription plans found. Create one to get started.</p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
