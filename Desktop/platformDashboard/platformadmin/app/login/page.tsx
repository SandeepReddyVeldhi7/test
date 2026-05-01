'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '../../lib/api';

const ShieldIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
);
const EyeIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EyeOffIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Login, 2: OTP
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/platform/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: formData.email, password: formData.password })
      });
      if (res.success) {
        if (res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('admin', JSON.stringify(res.admin));
          router.push('/');
        } else {
          setStep(2);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/platform/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email: formData.email, otp: formData.otp })
      });
      if (res.success) {
        localStorage.setItem('token', res.token);
        localStorage.setItem('admin', JSON.stringify(res.admin));
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-200/30 rounded-full blur-[100px]" />

      <div className="w-full max-w-md p-8 relative z-10">
        <div className="glass-card p-10 rounded-[48px] shadow-3xl border border-white/60 space-y-10 animate-in fade-in zoom-in-95 duration-700">
          
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-[28px] flex items-center justify-center text-white mx-auto shadow-2xl shadow-indigo-600/30 rotate-3 animate-float">
              <ShieldIcon size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Finch Axis</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Platform Administration</p>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold text-center animate-shake">
              {error}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  type="email" required placeholder="admin@finchaxis.com"
                  className="w-full bg-white/60 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password</label>
                <div className="relative group">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    required placeholder="••••••••••••"
                    className="w-full bg-white/60 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-100 outline-none transition-all pr-14"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors focus:outline-none p-2"
                  >
                    {showPassword ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                  </button>
                </div>
              </div>
              <button 
                disabled={loading}
                className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? 'Authenticating...' : 'Sign In to Control Center'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-8">
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500">We've sent a verification code to</p>
                <p className="text-sm font-black text-slate-900 mt-1">{formData.email}</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-center block">6-Digit Verification Code</label>
                <input 
                  type="text" required maxLength={6} placeholder="0 0 0 0 0 0"
                  className="w-full bg-white/60 border border-slate-200 rounded-2xl px-6 py-5 text-2xl font-black tracking-[0.5em] text-center focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
                  value={formData.otp}
                  onChange={e => setFormData({...formData, otp: e.target.value})}
                />
              </div>
              <div className="space-y-4">
                <button 
                  disabled={loading}
                  className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Complete Verification'}
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}

        </div>
        
        <p className="text-center text-[10px] font-bold text-slate-400 mt-10 uppercase tracking-widest">
          Secure Enterprise Access &bull; v2.4.0
        </p>
      </div>
    </div>
  );
}
