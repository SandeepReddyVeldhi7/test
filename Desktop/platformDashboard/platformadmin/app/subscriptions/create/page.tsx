'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUi } from '../../context/UiContext';
import { apiFetch } from '../../../lib/api';
import { PERMISSION_GROUPS, PERMISSION_AUTO_MAP, resolvePermissions, getInitialPermissions } from '../../../constants/permissions';
import Link from 'next/link';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const ChevronLeft = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const CheckIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function CreateOrEditPlan() {
  const router = useRouter();
  const params = useParams();
  const isEdit = !!params.id;
   const { setActiveTab, showToast } = useUi();
 
   const [formData, setFormData] = useState({
     name: '',
     price: '',
     features: '',
     permissions: getInitialPermissions(),
   });
   const [loading, setLoading] = useState(false);
   const [fetching, setFetching] = useState(isEdit);
 
   useEffect(() => {
     setActiveTab('Subscriptions');
     if (isEdit) {
       loadPlan();
     }
   }, [isEdit]);
 
   const loadPlan = async () => {
     try {
       const allPlans = await apiFetch('/plans');
       const planToEdit = allPlans.find((p: any) => p._id === params.id);
       
       if (planToEdit) {
         setFormData({
           name: planToEdit.name,
           price: planToEdit.price.toString(),
           features: planToEdit.features?.join(', ') || '',
           permissions: planToEdit.permissions || getInitialPermissions(),
         });
       }
     } catch (err) {
       console.error('Failed to load plan', err);
     } finally {
       setFetching(false);
     }
   };
 
   const togglePermission = (key: string) => {
     const mapped = PERMISSION_AUTO_MAP[key] || [];
     const currentSet = new Set<string>(formData.permissions);
 
     if (currentSet.has(key)) {
       currentSet.delete(key);
       mapped.forEach(m => currentSet.delete(m));
     } else {
       currentSet.add(key);
       mapped.forEach(m => currentSet.add(m));
     }
 
     setFormData({ ...formData, permissions: Array.from(currentSet) });
   };
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     setLoading(true);
 
     const payload = {
       name: formData.name.trim(),
       price: Number(formData.price),
       features: formData.features.split(',').map(f => f.trim()).filter(f => f),
       permissions: resolvePermissions(formData.permissions),
     };
 
     try {
       if (isEdit) {
         await apiFetch(`/plans?id=${params.id}`, {
           method: 'PUT',
           body: JSON.stringify(payload),
         });
         showToast('Plan updated successfully', 'success');
       } else {
         await apiFetch('/plans', {
           method: 'POST',
           body: JSON.stringify(payload),
         });
         showToast('Plan created successfully', 'success');
       }
       router.push('/subscriptions');
     } catch (err: any) {
       showToast(err.message || 'Failed to save plan', 'error');
     } finally {
       setLoading(false);
     }
   };

  if (fetching) return <div className="flex items-center justify-center h-screen"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-6 sm:p-12 space-y-10 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="max-w-[1200px] mx-auto w-full space-y-10 sm:space-y-12">
      
      <div className="flex items-center gap-6">
        <Link 
          href="/subscriptions"
          className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center text-slate-600 hover:bg-white/60 transition-all"
        >
          <ChevronLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter leading-tight">{isEdit ? 'Edit Subscription' : 'Create New Plan'}</h1>
          <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1">Configure pricing and feature access permissions</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
        {/* Basic Details */}
        <div className="glass-card p-8 sm:p-10 rounded-[40px] space-y-8">
           <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-white/20 pb-4">Basic Configuration</h3>
           
           <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Enterprise Pro"
                  className="w-full bg-white/40 border border-slate-200 backdrop-blur-md rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹ per user/month)</label>
                <input 
                  type="number"
                  required
                  placeholder="2500"
                  className="w-full bg-white/40 border border-slate-200 backdrop-blur-md rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                  value={formData.price}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Key Features (comma separated)</label>
                <textarea 
                  rows={4}
                  placeholder="Real-time Tracking, Unlimited Reports, SSO Support"
                  className="w-full bg-white/40 border border-slate-200 backdrop-blur-md rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                  value={formData.features}
                  onChange={e => setFormData({...formData, features: e.target.value})}
                />
              </div>
           </div>
        </div>

        {/* Permissions */}
        <div className="glass-card p-8 sm:p-10 rounded-[40px] space-y-8">
           <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest border-b border-white/20 pb-4">Feature Permissions</h3>
           
           <div className="space-y-10 max-h-[600px] overflow-y-auto custom-scrollbar pr-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.title} className="space-y-4">
                   <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.2em]">{group.title}</h4>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {group.permissions.map((perm) => (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => togglePermission(perm.key)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                            formData.permissions.includes(perm.key)
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200'
                            : 'bg-white/40 text-slate-500 border-white/30 hover:border-indigo-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center ${formData.permissions.includes(perm.key) ? 'bg-white/20' : 'bg-slate-100'}`}>
                            {formData.permissions.includes(perm.key) && <CheckIcon size={12} />}
                          </div>
                          <span className="text-[11px] font-bold tracking-tight">{perm.label}</span>
                        </button>
                      ))}
                   </div>
                </div>
              ))}
           </div>

           <button 
             disabled={loading}
             className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
           >
             {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
             ) : (
                <>{isEdit ? 'Update Subscription Plan' : 'Deploy Subscription Plan'}</>
             )}
           </button>
        </div>
      </form>
      </div>
    </div>
  );
}
