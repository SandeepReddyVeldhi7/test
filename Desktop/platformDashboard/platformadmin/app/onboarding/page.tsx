'use client';

import React, { useState, useEffect } from 'react';
import { useUi } from '../context/UiContext';
import { apiFetch } from '../../lib/api';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const BuildingIcon = ({ size = 20 }) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M8 10h.01" /><path d="M16 10h.01" /><path d="M8 14h.01" /><path d="M16 14h.01" /></svg>
);
const UserIcon = ({ size = 20 }) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const CreditCardIcon = ({ size = 20 }) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
);
const ShieldIcon = ({ size = 20 }) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
);
const CheckIcon = ({ size = 20 }) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
);
const RocketIcon = ({ size = 20 }) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2 c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-5c1.62-2.2 5-3 5-3"/><path d="M12 15v5s3.03-.55 5-2c2.2-1.62 3-5 3-5"/></svg>
);

const ArrowRightIcon = ({ size = 18 }) => (
   <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function OnboardingPage() {
   const { setActiveTab, showToast } = useUi();
   const [step, setStep] = useState(1);
   const [loading, setLoading] = useState(false);
   const [plans, setPlans] = useState<any[]>([]);

   const [formData, setFormData] = useState({
      // Step 1: Organisation
      orgName: '',
      code: '',
      industry: 'Technology & Software',
      contactEmail: '',
      phoneNumber: '',
      orgType: 'Enterprise',
      address: '',

      // Step 2: Admin
      adminName: '',
      adminEmail: '',
      adminEmpId: '',
      adminMobile: '',

      // Step 3: Subscription
      billingCycle: 'Yearly',
      selectedPlan: 'FINCH_PRO',
      userCount: 10,
      months: 12,
      startDate: new Date().toISOString().split('T')[0],

      // Step 4: Billing & Invoice
      gstId: '',
      additionalCharges: 0,
      discountPercentage: 0,
      taxRate: 18,
      selectedEntityId: '',
   });

   const [billingEntities, setBillingEntities] = useState<any[]>([]);

   // Auto-generate code when orgName changes
   useEffect(() => {
      if (formData.orgName && !formData.code) {
         const autoCode = formData.orgName.substring(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
         setFormData(prev => ({ ...prev, code: autoCode }));
      }
   }, [formData.orgName]);

   // Load initial state from localStorage if available
   useEffect(() => {
      loadBillingEntities();
      const savedData = localStorage.getItem('onboarding_form_data');
      if (savedData) {
         try {
            const parsed = JSON.parse(savedData);
            setFormData(prev => ({ ...prev, ...parsed }));
         } catch (e) {
            console.error('Failed to parse saved onboarding data');
         }
      }
      const savedStep = localStorage.getItem('onboarding_step');
      if (savedStep) {
         setStep(parseInt(savedStep));
      }
      loadPlans();
   }, []);

   // Auto-save progress to localStorage
   useEffect(() => {
      localStorage.setItem('onboarding_form_data', JSON.stringify(formData));
      localStorage.setItem('onboarding_step', step.toString());
   }, [formData, step]);

   const loadPlans = async () => {
      try {
         const res = await apiFetch('/plans');
         setPlans(res || []);
         if (res && res.length > 0 && !formData.selectedPlan) {
            setFormData(prev => ({ ...prev, selectedPlan: res[0].name }));
         }
      } catch (err) {
         console.error('Failed to load plans', err);
      }
   };

   const loadBillingEntities = async () => {
      try {
         const res = await apiFetch('/platform/billing');
         const entities = res.data || [];
         setBillingEntities(entities);
         if (entities.length > 0 && !formData.selectedEntityId) {
            setFormData(prev => ({ ...prev, selectedEntityId: entities[0]._id, gstId: entities[0].gstin || '' }));
         }
      } catch (err) {
         console.error('Failed to load billing entities', err);
      }
   };

   // Save to localStorage on change
   useEffect(() => {
      localStorage.setItem('onboarding_form_data', JSON.stringify(formData));
   }, [formData]);

   useEffect(() => {
      localStorage.setItem('onboarding_step', step.toString());
   }, [step]);

   useEffect(() => {
      setActiveTab('Onboarding');
   }, []);

   const selectedEntity = billingEntities.find(e => e._id === formData.selectedEntityId);

   const selectedPlanData = plans.find(p => 
      p.name === formData.selectedPlan || 
      p.name.replace(/_/g, ' ').toLowerCase() === formData.selectedPlan.toLowerCase()
   );
   
   const getBasePrice = () => {
      if (selectedPlanData) return selectedPlanData.price;
      // Fallback for initial load matching seeded defaults
      if (formData.selectedPlan === 'FINCH_PRO') return 5000;
      if (formData.selectedPlan === 'FINCH_MAX') return 15000;
      if (formData.selectedPlan === 'FINCH_BASIC') return 0;
      return 0;
   };

   const basePrice = getBasePrice();
   const discount = formData.billingCycle === 'Yearly' ? 0.8 : 1;
   const monthlyPricePerUser = Math.floor(basePrice * discount);
   const subtotal = monthlyPricePerUser * (formData.userCount || 0) * (formData.months || 0);
   const totalWithAdditional = subtotal + Number(formData.additionalCharges);
   const finalDiscountAmount = (totalWithAdditional * Number(formData.discountPercentage)) / 100;
   const taxableAmount = totalWithAdditional - finalDiscountAmount;
   const taxAmount = Math.floor(taxableAmount * (Number(formData.taxRate) / 100));
   const totalFinal = taxableAmount + taxAmount;

   const calculateEndDate = () => {
      const start = new Date(formData.startDate);
      if (isNaN(start.getTime())) return 'Invalid Date';
      const end = new Date(start);
      end.setMonth(end.getMonth() + (formData.months || 0));
      return end.toLocaleDateString();
   };

   const nextStep = () => setStep(s => Math.min(s + 1, 5));
   const prevStep = () => setStep(s => Math.max(s - 1, 1));

   const clearOnboardingData = () => {
      localStorage.removeItem('onboarding_form_data');
      localStorage.removeItem('onboarding_step');
   };

   const handleCreateOrg = async () => {
      setLoading(true);
      try {
         const selectedPlanObj = plans.find(p => p.name === formData.selectedPlan);
         const payload = {
            name: formData.orgName,
            code: formData.code || formData.orgName.substring(0, 4).toUpperCase() + Math.floor(1000 + Math.random() * 9000),
            planId: selectedPlanObj?._id,
            industry: formData.industry,
            contactEmail: formData.contactEmail,
            phoneNumber: formData.phoneNumber,
            orgType: formData.orgType,
            address: formData.address,
            adminName: formData.adminName,
            adminEmail: formData.adminEmail,
            adminEmpId: formData.adminEmpId,
            adminMobile: formData.adminMobile,
            userCount: formData.userCount,
            months: formData.months,
            billingCycle: formData.billingCycle,
            gstId: formData.gstId,
            additionalCharges: formData.additionalCharges,
            discountPercentage: formData.discountPercentage,
            taxRate: formData.taxRate,
            billingEntityId: formData.selectedEntityId,
            startDate: formData.startDate
         };
         await apiFetch('/platform/companies/onboard', {
            method: 'POST',
            body: JSON.stringify(payload)
         });

         showToast('Organisation Created Successfully!', 'success');
         clearOnboardingData();
         setTimeout(() => {
            window.location.href = '/organizations';
         }, 1500);
      } catch (err: any) {
         showToast(err.message || 'Failed to create organisation', 'error');
      } finally {
         setLoading(false);
      }
   };

   const steps = [
      { id: 1, label: 'Organisation', icon: BuildingIcon },
      { id: 2, label: 'Admin Setup', icon: UserIcon },
      { id: 3, label: 'Subscription', icon: CreditCardIcon },
      { id: 4, label: 'Billing', icon: CreditCardIcon },
      { id: 5, label: 'Review', icon: ShieldIcon },
   ];

   return (
      <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">

         {/* ── Header ── */}
         <header className="bg-white border-b border-slate-100 px-6 sm:px-10 py-1 flex items-center justify-between z-20">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <ShieldIcon size={20} />
               </div>
               <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Organisation Onboarding</h2>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Step {step} of 5</p>
               </div>
            </div>

            {/* Desktop Stepper */}
            <div className="hidden lg:flex items-center gap-8 overflow-x-auto custom-scrollbar px-4 max-w-2xl no-scrollbar">
               {steps.map((s, i) => (
                  <React.Fragment key={s.id}>
                     <div className={`flex items-center gap-3 transition-all shrink-0 ${step >= s.id ? 'opacity-100' : 'opacity-40'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${step > s.id ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                           {step > s.id ? <CheckIcon size={14} /> : s.id}
                        </div>
                        <span className={`text-[11px] font-black uppercase tracking-widest shrink-0 ${step === s.id ? 'text-indigo-600' : 'text-slate-500'}`}>{s.label}</span>
                     </div>
                     {i < steps.length - 1 && <div className="w-8 h-px bg-slate-100 shrink-0" />}
                  </React.Fragment>
               ))}
            </div>

            <div className="flex items-center gap-4">
               <button className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
               </button>
               <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-white shadow-sm">
                  <img src="https://ui-avatars.com/api/?name=Admin&background=6366f1&color=fff" alt="Profile" className="w-full h-full object-cover" />
               </div>
            </div>
         </header>

         {/* ── Main Content ── */}
         <main className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 bg-slate-50/30">
            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

               {/* Form Side */}
               <div className="lg:col-span-8 space-y-1 animate-in slide-in-from-bottom-8 duration-700">

                  {step === 1 && (
                     <div className="space-y-2">
                        <div>
                           <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">Organisation Details</h1>
                           <p className="text-slate-500 font-bold mt-2">Tell us about your company to get started with your environment.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">

                           <div className="sm:col-span-2 space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Organisation Name</label>
                              <input
                                 placeholder="Enter company name"
                                 className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                 value={formData.orgName}
                                 onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                              />
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Industry Type</label>
                              <select
                                 className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all appearance-none"
                                 value={formData.industry}
                                 onChange={e => setFormData({ ...formData, industry: e.target.value })}
                              >
                                 <option>Technology & Software</option>
                                 <option>Healthcare & Pharma</option>
                                 <option>Finance & Banking</option>
                                 <option>Manufacturing</option>
                                 <option>Education</option>
                                 <option>Food & Beverage</option>
                                 <option>Agriculture</option>
                                 <option>Retail</option>
                                 <option>Hospitality</option>
                                 <option>Textile</option>
                                 <option>Other</option>
                              </select>
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Email</label>
                              <input
                                 placeholder="admin@company.com"
                                 className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                 value={formData.contactEmail}
                                 onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                              />
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                              <input
                                 placeholder="+1 (555) 000-0000"
                                 className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                 value={formData.phoneNumber}
                                 onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                              />
                           </div>
                           <div className="space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Organisation Type</label>
                              <div className="flex gap-4">
                                 {['Enterprise', 'Startup'].map(t => (
                                    <button
                                       key={t}
                                       type="button"
                                       onClick={() => setFormData({ ...formData, orgType: t })}
                                       className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.orgType === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-200'}`}
                                    >
                                       {t}
                                    </button>
                                 ))}
                              </div>
                           </div>
                           <div className="sm:col-span-2 space-y-3">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Headquarters Address</label>
                              <textarea
                                 placeholder="Street, City, State, Country"
                                 rows={3}
                                 className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                                 value={formData.address}
                                 onChange={e => setFormData({ ...formData, address: e.target.value })}
                              />
                           </div>
                        </div>
                     </div>
                  )}

                  {step === 2 && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                           <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">Configure Administrative Tiers</h1>
                           <p className="text-slate-500 font-bold mt-2">Define core personnel responsible for system governance and financial oversight.</p>
                        </div>

                        <div className="space-y-2  ">
                           {/* Super Admin Section */}
                           <div className="glass-card p-2 rounded-[40px] border border-indigo-100/50 shadow-xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
                              <div className="flex items-center gap-4 mb-10 relative z-10">
                                 <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100">
                                    <ShieldIcon size={24} />
                                 </div>
                                 <div>
                                    <h3 className="text-xl font-black text-slate-900">Super Admin <span className="text-rose-500 text-xs font-bold ml-2">(Required)</span></h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Primary System Authority</p>
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-10">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                       placeholder="e.g. Marcus Aurelius"
                                       className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                                       value={formData.adminName}
                                       onChange={e => setFormData({ ...formData, adminName: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                       placeholder="m.aurelius@finch.com"
                                       className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                                       value={formData.adminEmail}
                                       onChange={e => setFormData({ ...formData, adminEmail: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee ID</label>
                                    <input
                                       className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                                       value={formData.adminEmpId} onChange={e => setFormData({ ...formData, adminEmpId: e.target.value })} />
                                 </div>
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                                    <input
                                       placeholder="+1 (555) 000-0000"
                                       className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all shadow-sm"
                                       value={formData.adminMobile}
                                       onChange={e => setFormData({ ...formData, adminMobile: e.target.value })}
                                    />
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {step === 3 && (
                     <div className="space-y-2 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="text-center ">
                           <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">Choose your elevation</h1>
                           <p className="text-slate-500 font-bold max-w-lg mx-auto">Select the tier that best aligns with your team's velocity and scale. Switch any time as you grow.</p>

                           {/* Cycle Toggle & Controls */}
                           <div className="flex flex-col items-center gap-6 pt-6">
                              <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-2 relative">
                                 <div className={`absolute top-1.5 bottom-1.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 transition-all ${formData.billingCycle === 'Monthly' ? 'left-1.5 w-[30%]' :
                                    formData.billingCycle === 'Yearly' ? 'left-[35%] w-[30%]' :
                                       'left-[68%] w-[30%]'
                                    }`} />
                                 <button onClick={() => setFormData({ ...formData, billingCycle: 'Monthly', months: 1 })} className={`relative z-10 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${formData.billingCycle === 'Monthly' ? 'text-white' : 'text-slate-400'}`}>Monthly</button>
                                 <button onClick={() => setFormData({ ...formData, billingCycle: 'Yearly', months: 12 })} className={`relative z-10 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${formData.billingCycle === 'Yearly' ? 'text-white' : 'text-slate-400'}`}>Yearly</button>
                                 <button onClick={() => setFormData({ ...formData, billingCycle: 'Custom' })} className={`relative z-10 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${formData.billingCycle === 'Custom' ? 'text-white' : 'text-slate-400'}`}>Custom</button>
                              </div>

                              <div className="flex items-center gap-6">
                                 <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Number of Users</label>
                                    <div className="flex items-center gap-3">
                                       <button onClick={() => setFormData({ ...formData, userCount: Math.max(1, (formData.userCount || 0) - 1) })} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">-</button>
                                       <input type="number" value={formData.userCount || 0} onChange={e => setFormData({ ...formData, userCount: parseInt(e.target.value) || 0 })} className="w-20 text-center bg-white border border-slate-100 rounded-xl py-2 text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none" />
                                       <button onClick={() => setFormData({ ...formData, userCount: (formData.userCount || 0) + 1 })} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">+</button>
                                    </div>
                                 </div>

                                 {formData.billingCycle === 'Custom' && (
                                    <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Custom Months</label>
                                       <div className="flex items-center gap-3">
                                          <button onClick={() => setFormData({ ...formData, months: Math.max(1, (formData.months || 0) - 1) })} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">-</button>
                                          <input type="number" value={formData.months || 0} onChange={e => setFormData({ ...formData, months: parseInt(e.target.value) || 0 })} className="w-20 text-center bg-white border border-slate-100 rounded-xl py-2 text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-100 outline-none" />
                                          <button onClick={() => setFormData({ ...formData, months: (formData.months || 0) + 1 })} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">+</button>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Live Total Summary */}
                           <div className="pt-8 pb-4 animate-in fade-in slide-in-from-top-4 duration-500">
                              <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-3xl p-6 w-full max-w-xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden group hover:border-indigo-200 transition-all">
                                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-all" />
                                 <div className="text-center sm:text-left relative z-10">
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-1">Live Pricing Engine</p>
                                    <h4 className="text-lg font-black text-slate-900 leading-tight">Investment Summary</h4>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1">Based on <span className="text-indigo-600">{formData.userCount} seats</span> for <span className="text-indigo-600">{formData.months} months</span></p>
                                 </div>
                                 
                                 <div className="text-center sm:text-right relative z-10 bg-white/60 backdrop-blur-sm px-8 py-4 rounded-2xl border border-white shadow-sm">
                                    <div className="flex items-baseline justify-center sm:justify-end gap-1.5">
                                       <span className="text-3xl font-black text-slate-900 leading-none">₹{subtotal.toLocaleString()}</span>
                                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                                    </div>
                                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1.5 flex items-center justify-center sm:justify-end gap-1.5">
                                       <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                       ₹{monthlyPricePerUser}/user/mo
                                    </p>
                                 </div>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8">
                           {plans.map((p, i) => {
                              const isSelected = formData.selectedPlan === p.name;
                              const monthlyPrice = p.price;
                              const displayPrice = formData.billingCycle === 'Yearly' ? Math.floor(monthlyPrice * 0.8) : monthlyPrice;

                              return (
                                 <div key={p._id || p.name} className={`glass-card p-10 rounded-[48px] border transition-all cursor-pointer relative flex flex-col ${isSelected ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-2xl scale-105 z-10 bg-white' : 'border-white/40 hover:border-indigo-200'}`} onClick={() => setFormData({ ...formData, selectedPlan: p.name })}>
                                    {i === 1 && <span className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[8px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-200">Most Popular</span>}

                                    <div className="flex flex-col items-center text-center space-y-6 flex-1">
                                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-400'}`}>
                                          {p.name.toLowerCase().includes('finch') && !p.name.toLowerCase().includes('pro') ? <BuildingIcon /> : p.name.toLowerCase().includes('pro') && !p.name.toLowerCase().includes('max') ? <ShieldIcon /> : <RocketIcon />}
                                       </div>
                                       <div>
                                          <h3 className="text-xl font-black text-slate-900">{p.name}</h3>
                                          <div className="mt-2 flex flex-col items-center">
                                             <div className="flex items-baseline gap-1">
                                                <span className="text-3xl font-black text-slate-900">₹{displayPrice}</span>
                                                <span className="text-[10px] font-bold text-slate-400">/user/mo</span>
                                             </div>
                                             <p className="text-[11px] font-black text-indigo-600 mt-1">Total: ₹{displayPrice * (formData.userCount || 0) * (formData.months || 0)}</p>
                                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2"><ArrowRightIcon size={10} /> Dynamic Scaling</span>
                                          </div>
                                       </div>

                                       <div className="w-full h-px bg-slate-100" />

                                       <ul className="w-full space-y-4">
                                          {(p.features || []).map((f: any) => (
                                             <li key={f} className="flex items-start gap-3 text-[10px] font-bold text-slate-500 text-left">
                                                <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300'}`}><CheckIcon size={10} /></div>
                                                <span>{f}</span>
                                             </li>
                                          ))}
                                       </ul>
                                    </div>

                                    <button className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest mt-10 transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}>
                                       {isSelected ? 'Selected' : 'Select Plan'}
                                    </button>
                                 </div>
                              );
                           })}
                        </div>
                     </div>
                  )}

                  {step === 4 && (
                     <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div>
                           <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">Invoice Generation</h1>
                           <p className="text-slate-500 font-bold mt-2">Configure and finalize billing details for Finch Axis partners.</p>
                        </div>

                        <div className="space-y-8">
                           {/* Sender Profile Selection */}
                           <div className="glass-card p-10 rounded-[40px] border border-indigo-100 shadow-xl space-y-6">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                                       <BuildingIcon size={20} />
                                    </div>
                                    <div>
                                       <h3 className="text-lg font-black text-slate-900">Select Sender Profile</h3>
                                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Which entity is issuing this invoice?</p>
                                    </div>
                                 </div>
                                 <button 
                                    onClick={() => window.location.href = '/billing-config'}
                                    className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                 >
                                    Manage Profiles
                                 </button>
                              </div>

                              <div className="grid grid-cols-1 gap-6">
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Choose Billing Entity</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                       {billingEntities.map(entity => (
                                          <button
                                             key={entity._id}
                                             onClick={() => setFormData({ ...formData, selectedEntityId: entity._id, gstId: entity.gstin || '' })}
                                             className={`p-6 rounded-[32px] border-2 text-left transition-all relative overflow-hidden group ${formData.selectedEntityId === entity._id ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100 bg-white hover:border-indigo-200'}`}
                                          >
                                             <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                                                   {entity.logo ? <img src={entity.logo} alt="" className="w-full h-full object-contain p-1" /> : <BuildingIcon size={20} className="text-slate-300" />}
                                                </div>
                                                <div className="min-w-0">
                                                   <p className="text-sm font-black text-slate-900 truncate">{entity.name}</p>
                                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{entity.gstin || 'NO GSTIN'}</p>
                                                </div>
                                             </div>
                                             {formData.selectedEntityId === entity._id && (
                                                <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
                                                   <CheckIcon size={14} />
                                                </div>
                                             )}
                                          </button>
                                       ))}
                                       <button 
                                          onClick={() => window.location.href = '/billing-config'}
                                          className="p-6 rounded-[32px] border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all text-slate-400 hover:text-indigo-600"
                                       >
                                          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-indigo-100 transition-all">
                                             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                                          </div>
                                          <span className="text-[10px] font-black uppercase tracking-widest">Add New Entity</span>
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           </div>
                           {/* Organisation Details */}
                           <div className="glass-card p-10 rounded-[40px] border border-slate-100 shadow-xl space-y-8">
                              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <BuildingIcon size={20} />
                                 </div>
                                 <h3 className="text-lg font-black text-slate-900">Organisation Details</h3>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Organisation Name</label>
                                    <input
                                       className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                       value={formData.orgName}
                                       onChange={e => setFormData({ ...formData, orgName: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GST/TAX ID</label>
                                    <input
                                       placeholder="e.g. 27AAACF1234A1Z5"
                                       className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                       value={formData.gstId}
                                       onChange={e => setFormData({ ...formData, gstId: e.target.value })}
                                    />
                                 </div>
                                 <div className="sm:col-span-2 space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Address</label>
                                    <textarea
                                       rows={2}
                                       className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                                       value={formData.address}
                                       onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                                    <input
                                       className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                       value={formData.contactEmail}
                                       onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                                    <input
                                       className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                       value={formData.phoneNumber}
                                       onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    />
                                 </div>
                              </div>
                           </div>

                            {/* Subscription & Charges */}
                            <div className="glass-card p-10 rounded-[40px] border border-indigo-100 shadow-xl space-y-8">
                               <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                     <CreditCardIcon size={20} />
                                  </div>
                                  <h3 className="text-lg font-black text-slate-900">Subscription & Charges</h3>
                               </div>

                               <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                  <div className="space-y-3">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Plan Price (Subtotal)</label>
                                     <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-400">
                                        ₹{subtotal.toLocaleString()}
                                     </div>
                                  </div>
                                  <div className="space-y-3">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Additional Charges (₹)</label>
                                     <input
                                        type="number"
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                        value={formData.additionalCharges}
                                        onChange={e => setFormData({ ...formData, additionalCharges: parseFloat(e.target.value) || 0 })}
                                     />
                                  </div>
                                  <div className="space-y-3">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount (%)</label>
                                     <input
                                        type="number"
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                        value={formData.discountPercentage}
                                        onChange={e => setFormData({ ...formData, discountPercentage: parseFloat(e.target.value) || 0 })}
                                     />
                                  </div>
                                  <div className="space-y-3">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax Rate / GST (%)</label>
                                     <input
                                        type="number"
                                        step="0.1"
                                        className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                        value={formData.taxRate}
                                        onChange={e => setFormData({ ...formData, taxRate: parseFloat(e.target.value) || 0 })}
                                     />
                                  </div>
                               </div>
                            </div>

                           {/* Invoice Details */}
                           <div className="glass-card p-10 rounded-[40px] border border-slate-100 shadow-xl space-y-8">
                              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                                 <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                    <BuildingIcon size={20} />
                                 </div>
                                 <h3 className="text-lg font-black text-slate-900">Invoice Details</h3>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Number</label>
                                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-slate-400 italic">
                                       [ System Generated ]
                                    </div>
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Date</label>
                                    <input
                                       className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold"
                                       value={new Date().toLocaleDateString()}
                                       readOnly
                                    />
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service Start Date</label>
                                    <input
                                       type="date"
                                       className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                                       value={formData.startDate}
                                       onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                    />
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Service End Date</label>
                                    <input
                                       className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-400"
                                       value={calculateEndDate()}
                                       readOnly
                                    />
                                 </div>
                                 <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Cycle</label>
                                    <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-black text-indigo-600 uppercase">
                                       {formData.billingCycle} ({formData.months} Months)
                                    </div>
                                 </div>
                              </div>
                           </div>

                        </div>
                     </div>
                  )}

                  {step === 5 && (
                     <div className="space-y-12 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="flex items-center justify-between">
                           <div>
                              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Step 5 of 5</p>
                              <h1 className="text-4xl font-black text-slate-900 tracking-tighter mt-1">Review & Create</h1>
                           </div>
                           <div className="text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Overall Completion</p>
                              <p className="text-3xl font-black text-indigo-600">100%</p>
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           <div className="glass-card p-8 rounded-[40px] border border-white shadow-sm space-y-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><BuildingIcon size={20} /></div>
                                 <h3 className="font-black text-slate-900 tracking-tight">Organisation Details</h3>
                              </div>
                              <div className="space-y-4">
                                 <div className="flex justify-between border-b border-slate-50 pb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</span>
                                    <span className="text-xs font-black text-slate-900">{formData.orgName || 'Finch Axis Ltd.'}</span>
                                 </div>
                                 <div className="flex justify-between border-b border-slate-50 pb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type</span>
                                    <span className="text-xs font-black text-slate-900">{formData.orgType}</span>
                                 </div>
                                 <div className="flex justify-between border-b border-slate-50 pb-3">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Industry</span>
                                    <span className="text-xs font-black text-slate-900">{formData.industry}</span>
                                 </div>
                                 <div className="flex justify-between">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Subdomain</span>
                                    <span className="text-xs font-black text-indigo-600">{formData.orgName ? `${formData.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.finchforce.com` : 'company.finchforce.com'}</span>
                                 </div>
                              </div>
                           </div>

                           <div className="glass-card p-8 rounded-[40px] border border-white shadow-sm space-y-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><UserIcon size={20} /></div>
                                 <h3 className="font-black text-slate-900 tracking-tight">Super Admin</h3>
                              </div>
                              <div className="space-y-3">
                                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="flex items-center gap-3">
                                       <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-[10px] font-black uppercase tracking-tighter text-indigo-600">SA</div>
                                       <div>
                                          <p className="text-[12px] font-black text-slate-900 leading-none">{formData.adminName || 'Admin User'}</p>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{formData.adminEmail}</p>
                                       </div>
                                    </div>
                                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-lg text-[8px] font-black uppercase tracking-widest">Master Access</span>
                                 </div>
                              </div>
                           </div>

                           <div className="glass-card p-8 rounded-[40px] border border-indigo-600/20 shadow-xl shadow-indigo-100 space-y-6 relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16" />
                              <div className="flex items-center gap-3 relative z-10">
                                 <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100"><CreditCardIcon size={20} /></div>
                                 <h3 className="font-black text-slate-900 tracking-tight">Subscription Summary</h3>
                              </div>
                              <div className="space-y-6 relative z-10">
                                 <div>
                                    <h4 className="text-2xl font-black text-indigo-600">{formData.selectedPlan} <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mt-1">{formData.billingCycle} billing ({formData.months} months)</span></h4>
                                 </div>
                                 <div className="flex flex-col">
                                    <p className="text-3xl font-black text-slate-900">₹{totalFinal.toLocaleString()}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total (Inc. GST & Charges)</p>
                                 </div>
                                 <ul className="space-y-2">
                                    <li className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><CheckIcon size={12} className="text-emerald-500" /> ₹{monthlyPricePerUser}/user per month</li>
                                    <li className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><CheckIcon size={12} className="text-emerald-500" /> Itemized Billing Finalized</li>
                                 </ul>
                              </div>
                           </div>

                           <div className="glass-card p-8 rounded-[40px] border border-white shadow-sm space-y-6 bg-slate-900 text-white overflow-hidden relative">
                              <div className="absolute top-0 right-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent" />
                              <div className="relative z-10 space-y-8">
                                 <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black tracking-tight">Readiness Snapshot</h3>
                                    <span className="px-3 py-1 bg-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/10">Final Review</span>
                                 </div>

                                 <div className="flex items-center justify-center py-4">
                                    <div className="w-24 h-24 rounded-full border-8 border-emerald-500/20 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.3)] animate-pulse">
                                       <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-lg"><CheckIcon size={32} /></div>
                                    </div>
                                 </div>

                                 <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3">
                                       <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center"><BuildingIcon size={16} /></div>
                                       <div>
                                          <p className="text-[9px] font-black text-white/40 uppercase tracking-widest leading-none mb-1">Server Cluster Location</p>
                                          <p className="text-[10px] font-black text-white flex items-center gap-2">AWS US-East-1 (N. Virginia)</p>
                                       </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-white/50 leading-relaxed italic text-center px-4">"Ready to deploy the Finch Axis ecosystem. All system integrity checks passed. Deployment will take approximately 45 seconds."</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Navigation Buttons - Sticky Footer */}
                  <div className="sticky bottom-0 bg-white/90 backdrop-blur-xl py-6 z-30 border-t border-slate-100 mt-10 -mx-6 px-6 sm:-mx-10 sm:px-10 lg:-mx-16 lg:px-16 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <button
                        onClick={prevStep}
                        disabled={step === 1 || loading}
                        className={`px-10 py-5 rounded-[24px] text-xs font-black uppercase tracking-[0.2em] transition-all ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'}`}
                     >
                        Back
                     </button>
                     <div className="flex items-center gap-4">
                        <button onClick={() => { clearOnboardingData(); window.location.href = '/'; }} className="hidden sm:block px-8 py-5 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-rose-600 transition-all">Cancel Onboarding</button>
                        {step === 5 ? (
                           <button
                              onClick={handleCreateOrg}
                              disabled={loading}
                              className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                           >
                              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Create Organisation'}
                           </button>
                        ) : (
                           <button
                              onClick={nextStep}
                              className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3"
                           >
                              Next Step <ArrowRightIcon size={18} />
                           </button>
                        )}
                     </div>
                  </div>

               </div>

               {/* Sidebar / Summary Area */}
               <div className="hidden lg:block lg:col-span-4 sticky top-10 animate-in slide-in-from-right-8 duration-700">
                  <div className="space-y-8">

                     {/* Progress Card */}
                     <div className="glass-card p-10 rounded-[48px] border border-white/60 shadow-2xl bg-white overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20" />
                        <div className="relative z-10 space-y-8">
                           <div className="flex flex-col gap-1.5">
                              <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">Onboarding</h3>
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-px bg-indigo-100" />
                                 <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">Setup Progress</span>
                              </div>
                           </div>

                           <div className="space-y-6">
                              {steps.map((s) => (
                                 <div key={s.id} className="flex items-center gap-4 group">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${step > s.id ? 'bg-emerald-500 text-white shadow-emerald-100 shadow-lg' : step === s.id ? 'bg-indigo-600 text-white shadow-indigo-100 shadow-lg' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                                       {step > s.id ? <CheckIcon size={18} /> : <s.icon size={18} />}
                                    </div>
                                    <span className={`text-[11px] font-black uppercase tracking-widest ${step === s.id ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     {/* Dynamic Preview Card */}
                     {step === 4 ? (
                        /* Invoice Live Preview */
                        <div className="glass-card rounded-[48px] border border-white/60 shadow-2xl bg-white overflow-hidden relative animate-in zoom-in-95 duration-500">
                           <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
                           <div className="p-10 space-y-8">
                               {/* Header */}
                               <div className="flex justify-between items-start">
                                  <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center overflow-hidden">
                                     {selectedEntity?.logo ? (
                                        <img src={selectedEntity.logo} alt="" className="w-full h-full object-contain p-1" />
                                     ) : (
                                        <div className="w-full h-full bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">F</div>
                                     )}
                                  </div>
                                  <div className="text-right">
                                     <h4 className="text-4xl font-black text-slate-200 tracking-tighter leading-none">INVOICE</h4>
                                     <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest">#INV-{new Date().getFullYear()}-001</p>
                                     <p className="text-[8px] font-bold text-slate-400">Date: {new Date().toLocaleDateString()}</p>
                                  </div>
                                </div>

                                <div className="space-y-1">
                                   <h5 className="text-xl font-black text-slate-900 tracking-tight">{selectedEntity?.name || 'FINCH AXIS'}</h5>
                                   <p className="text-[7px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-[200px] leading-relaxed">
                                      {selectedEntity?.address || 'Enterprise Billing System'}
                                   </p>
                                   {selectedEntity?.gstin && <p className="text-[7px] font-black text-indigo-600 uppercase tracking-widest mt-1">GSTIN: {selectedEntity.gstin}</p>}
                                </div>

                              {/* Details Grid */}
                              <div className="grid grid-cols-2 gap-8 text-[9px]">
                                 <div className="space-y-2">
                                    <p className="font-black text-indigo-500 uppercase tracking-widest">Bill To:</p>
                                    <div className="space-y-1">
                                       <p className="font-black text-slate-900 leading-tight">{formData.orgName || 'Global Dynamics Corp'}</p>
                                       <p className="font-bold text-slate-400 leading-relaxed uppercase">{formData.address || '456 Innovation Park, Ste 100'}</p>
                                       {formData.gstId && <p className="font-bold text-slate-400 mt-1">GST: {formData.gstId}</p>}
                                    </div>
                                 </div>
                                 <div className="space-y-2">
                                    <p className="font-black text-indigo-500 uppercase tracking-widest">Service Period:</p>
                                    <div className="space-y-1">
                                       <p className="font-bold text-slate-900 leading-tight">{new Date(formData.startDate).toLocaleDateString()} - {calculateEndDate()}</p>
                                       <p className="font-bold text-slate-400 uppercase tracking-[0.1em] text-[7px]">{formData.billingCycle} Subscription Ready</p>
                                    </div>
                                 </div>
                              </div>

                              {/* Table Mockup */}
                              <div className="space-y-4 pt-4 border-t border-slate-50">
                                 <div className="flex justify-between items-center text-[8px] font-black text-slate-300 uppercase tracking-widest">
                                    <span>Description</span>
                                    <div className="flex gap-8">
                                       <span>Qty</span>
                                       <span>Amount</span>
                                    </div>
                                 </div>
                                 
                                 <div className="flex justify-between items-start">
                                    <div>
                                       <p className="text-[11px] font-black text-slate-900 leading-none">01 {selectedPlanData?.name?.replace(/_/g, ' ') || formData.selectedPlan} Subscription</p>
                                       <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Monthly license per seat</p>
                                    </div>
                                    <div className="flex gap-10 items-center">
                                       <span className="text-[10px] font-black text-slate-900">{formData.userCount}</span>
                                       <span className="text-[10px] font-black text-slate-900">₹{subtotal.toLocaleString()}</span>
                                    </div>
                                 </div>

                                 {formData.additionalCharges > 0 && (
                                    <div className="flex justify-between items-start">
                                       <div>
                                          <p className="text-[11px] font-black text-slate-900 leading-none">02 Setup & Migration</p>
                                          <p className="text-[8px] font-bold text-slate-400 mt-1 uppercase">One-time provision charges</p>
                                       </div>
                                       <span className="text-[10px] font-black text-slate-900">₹{Number(formData.additionalCharges).toLocaleString()}</span>
                                    </div>
                                 )}

                                 {formData.discountPercentage > 0 && (
                                    <div className="flex justify-between items-start">
                                       <div>
                                          <p className="text-[11px] font-black text-emerald-600 leading-none">03 Discount Applied</p>
                                          <p className="text-[8px] font-bold text-emerald-500 mt-1 uppercase">Promotional Offer ({formData.discountPercentage}%)</p>
                                       </div>
                                       <span className="text-[10px] font-black text-emerald-600">-₹{finalDiscountAmount.toLocaleString()}</span>
                                    </div>
                                 )}
                              </div>

                              {/* Footer Summary */}
                              <div className="pt-6 border-t border-slate-100 flex flex-col gap-3">
                                 <div className="flex justify-between items-center text-[10px] font-black">
                                    <span className="text-slate-400 uppercase tracking-widest">Tax ({formData.taxRate}%)</span>
                                    <span className="text-slate-900">₹{taxAmount.toLocaleString()}</span>
                                 </div>
                                 <div className="flex justify-between items-center py-2 border-y border-slate-50">
                                    <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Total Amount</span>
                                    <span className="text-2xl font-black text-indigo-600 tracking-tighter leading-none">₹{totalFinal.toLocaleString()}</span>
                                 </div>
                                 <p className="text-[7px] font-bold text-slate-400 text-center uppercase tracking-widest mt-2">Thank you for your business</p>
                              </div>
                           </div>
                        </div>
                     ) : (
                        /* Default Live Preview */
                        <div className="glass-card rounded-[48px] border border-white/60 shadow-2xl bg-white overflow-hidden group">
                           <div className="h-40 bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center p-10 relative">
                              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 flex items-center justify-center text-white shadow-2xl group-hover:rotate-12 transition-transform">
                                 {formData.selectedPlan.toLowerCase().includes('pro') ? <ShieldIcon size={32} /> : <RocketIcon size={32} />}
                              </div>
                           </div>
                           <div className="p-10 space-y-8 relative">
                              <div>
                                 <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2 leading-none flex items-center gap-2">Live Preview <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-lg">{formData.selectedPlan.toUpperCase()}</span></p>
                                 <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none truncate">{formData.orgName || 'Company Name'}</h3>
                              </div>

                              <div className="space-y-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0"><BuildingIcon size={18} /></div>
                                    <div>
                                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Subdomain</p>
                                       <p className="text-[10px] font-black text-slate-900 leading-none truncate max-w-[150px]">{formData.orgName ? `${formData.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '')}.finchforce.com` : 'company.finchforce.com'}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0"><CreditCardIcon size={18} /></div>
                                    <div>
                                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Subscription Total</p>
                                       <p className="text-[10px] font-black text-slate-900 leading-none truncate">₹{totalFinal.toLocaleString()}</p>
                                    </div>
                                 </div>
                              </div>

                              <div className="w-full h-px bg-slate-50" />

                              <div className="flex items-center justify-between">
                                 <div className="flex -space-x-3">
                                    {[1, 2, 3].map(i => (
                                       <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-black text-slate-400 uppercase">A{i}</div>
                                    ))}
                                 </div>
                                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">+ {formData.userCount} Seats Ready</span>
                              </div>
                           </div>
                        </div>
                     )}


                  </div>
               </div>

            </div>
         </main>

      </div>
   );
}

