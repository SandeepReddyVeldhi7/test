'use client';

import React, { useState, useEffect } from 'react';
import { useUi } from '../context/UiContext';
import { apiFetch } from '../../lib/api';

// ─── Local SVG Icons ──────────────────────────────────────────────────────────

const PlusIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);
const XIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);
const TrashIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);
const EditIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
);
const BuildingIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
);
const UploadIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);

// ─── Component ──────────────────────────────────────────────────────────────

export default function BillingConfigPage() {
  const { setActiveTab, showToast } = useUi();
  const [entities, setEntities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    address: '',
    contact: '',
    email: '',
    gstin: '',
    pan: '',
    logo: '',
    bankName: '',
    accountNumber: '',
    ifsc: '',
    bankAddress: ''
  });

  useEffect(() => {
    setActiveTab('Billing');
    loadEntities();
  }, []);

  const loadEntities = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/platform/billing');
      setEntities(res.data || []);
    } catch (err) {
      console.error('Failed to load billing entities', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/platform/billing/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form)
        });
      } else {
        await apiFetch('/platform/billing', {
          method: 'POST',
          body: JSON.stringify(form)
        });
      }
      setShowModal(false);
      setEditingId(null);
      setForm({ name: '', address: '', contact: '', email: '', gstin: '', pan: '', logo: '' });
      showToast(editingId ? 'Profile Updated Successfully!' : 'Profile Created Successfully!', 'success');
      loadEntities();
    } catch (err: any) {
      showToast(err.message || 'Failed to save billing entity', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entity: any) => {
    setEditingId(entity._id);
    setForm({
      name: entity.name,
      address: entity.address,
      contact: entity.contact || '',
      email: entity.email || '',
      gstin: entity.gstin || '',
      pan: entity.pan || '',
      logo: entity.logo || '',
      bankName: entity.bankName || '',
      accountNumber: entity.accountNumber || '',
      ifsc: entity.ifsc || '',
      bankAddress: entity.bankAddress || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this billing entity?')) return;
    try {
      await apiFetch(`/platform/billing/${id}`, { method: 'DELETE' });
      showToast('Billing Profile Deleted', 'success');
      loadEntities();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete entity', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-10 space-y-8 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter leading-tight">Billing Configuration</h1>
          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Manage Sender Profiles for Invoices</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setForm({ 
              name: '', address: '', contact: '', email: '', gstin: '', pan: '', logo: '',
              bankName: '', accountNumber: '', ifsc: '', bankAddress: '' 
            });
            setShowModal(true);
          }}
          className="px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3"
        >
          <PlusIcon size={18} /> Add New Profile
        </button>
      </div>

      {/* Grid of Entities */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full py-24 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : entities.length === 0 ? (
          <div className="col-span-full py-24 text-center glass-card rounded-[48px] border border-white/40">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-6">
              <BuildingIcon size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900">No Billing Profiles Found</h3>
            <p className="text-sm font-bold text-slate-500 mt-2">Add your company details to start generating invoices.</p>
          </div>
        ) : entities.map((entity) => (
          <div key={entity._id} className="glass-card rounded-[48px] border border-white/40 shadow-xl overflow-hidden group hover:-translate-y-2 transition-all duration-500">
            <div className="p-10 space-y-8">
              <div className="flex items-start justify-between">
                <div className="w-20 h-20 rounded-[28px] bg-white shadow-lg border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                  {entity.logo ? (
                    <img src={entity.logo} alt={entity.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <BuildingIcon size={32} className="text-indigo-600" />
                  )}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(entity)} className="p-3 bg-white text-slate-400 hover:text-indigo-600 rounded-2xl shadow-sm border border-slate-100 transition-all">
                    <EditIcon size={18} />
                  </button>
                  <button onClick={() => handleDelete(entity._id)} className="p-3 bg-white text-slate-400 hover:text-rose-600 rounded-2xl shadow-sm border border-slate-100 transition-all">
                    <TrashIcon size={18} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight">{entity.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest leading-relaxed line-clamp-2">{entity.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">GSTIN</p>
                   <p className="text-[11px] font-black text-slate-900">{entity.gstin || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">PAN</p>
                   <p className="text-[11px] font-black text-slate-900">{entity.pan || 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setShowModal(false)} />
          <div className="relative w-full max-w-3xl bg-white/90 backdrop-blur-2xl rounded-[48px] border border-white p-10 shadow-2xl animate-in zoom-in-95 duration-400 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between mb-8 shrink-0">
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{editingId ? 'Edit Profile' : 'Add Billing Profile'}</h2>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Details for Medway Pharmaceutics-style header</p>
              </div>
              <button onClick={() => !saving && setShowModal(false)} className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
                <XIcon size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-8">
              {/* Logo Upload Section */}
              <div className="flex items-center gap-8 p-8 bg-slate-50 rounded-[32px] border border-slate-100">
                <div className="w-24 h-24 rounded-3xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm relative group">
                  {form.logo ? (
                    <img src={form.logo} alt="Preview" className="w-full h-full object-contain p-2" />
                  ) : (
                    <BuildingIcon size={32} className="text-slate-300" />
                  )}
                  <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-slate-900">Company Logo</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended: Transparent PNG (200x200)</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-3 cursor-pointer hover:bg-indigo-50 transition-all">
                    <UploadIcon size={14} /> Upload Image
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              {/* General Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity / Company Name</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="Medway Pharmaceuticals" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email ID</label>
                  <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="admin@medway.com" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address (Full Line)</label>
                  <textarea required rows={2} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none" placeholder="Plot No. 57, Road no. 2, Hyderabad..." />
                </div>
              </div>

              {/* Identity Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="90000 00000" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">GSTIN</label>
                  <input value={form.gstin} onChange={e => setForm({ ...form, gstin: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all uppercase" placeholder="36AZGPV2826G1Z4" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">PAN Number</label>
                  <input value={form.pan} onChange={e => setForm({ ...form, pan: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all uppercase" placeholder="AZGPV2826G" />
                </div>
              </div>

              {/* Banking Details */}
              <div className="space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Banking Details</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Name</label>
                    <input value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="Indian Bank" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Number</label>
                    <input value={form.accountNumber} onChange={e => setForm({ ...form, accountNumber: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="779371898" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">IFSC Code</label>
                    <input value={form.ifsc} onChange={e => setForm({ ...form, ifsc: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all uppercase" placeholder="IDIB000W005" />
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bank Branch Address</label>
                    <input value={form.bankAddress} onChange={e => setForm({ ...form, bankAddress: e.target.value })} className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all" placeholder="West Mambalam Branch, Chennai-600033" />
                  </div>
                </div>
              </div>

              <button disabled={saving} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-3">
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>{editingId ? 'Update Profile' : 'Create Billing Profile'}</>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
