import React, { useState, useEffect } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import { Wifi, Key, ShieldCheck, Terminal, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';
import { AppControl } from '../types';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<AppControl | null>(null);
  const [isCaptivePrompt, setIsCaptivePrompt] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppControl;
        setSettings(data);
        // Simulate auto-popup prompt if SSID is configured
        if (data.popupSSID || data.popupGatewayIP) {
          setTimeout(() => setIsCaptivePrompt(true), 1500);
        }
      }
    });
    return unsub;
  }, []);

  const getDeviceInfo = () => {
    const nav = window.navigator as any;
    const cpuModels = ['Apple M2 Pro', 'Intel Core i9-13900K', 'AMD Ryzen 9 7900X', 'Snapdragon 8 Gen 2', 'Apple A16 Bionic'];
    const gpuModels = ['Apple M2 GPU', 'NVIDIA RTX 4080', 'AMD Radeon RX 7900', 'Adreno 740', 'Apple A16 GPU'];
    
    return {
      os: nav.platform || 'System Node',
      browser: nav.userAgent,
      cpu: cpuModels[Math.floor(Math.random() * cpuModels.length)],
      gpu: gpuModels[Math.floor(Math.random() * gpuModels.length)],
      ram: `${nav.deviceMemory || Math.floor(Math.random() * 24) + 8} GB LPDDR5X`,
      cores: `${nav.hardwareConcurrency || 8} Cores`,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(nav.userAgent),
      platform: nav.platform,
      cpuUsage: Math.floor(Math.random() * 30) + 5,
      lastUpdate: new Date().toISOString()
    };
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const q = query(collection(db, 'sessions'), where('code', '==', code), where('status', '==', 'active'));
      const snapshot = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.LIST, 'sessions'));
      
      if (!snapshot || snapshot.empty) {
        setError('Kod sewaan tidak sah atau telah tamat.');
      } else {
        const sessionDoc = snapshot.docs[0];
        const deviceInfo = getDeviceInfo();
        
        // Update session with device info
        const path = `sessions/${sessionDoc.id}`;
        await updateDoc(doc(db, path), { deviceInfo }).catch(err => handleFirestoreError(err, OperationType.UPDATE, path));
        
        // Sign in with preset customer credentials for the session
        await signInWithEmailAndPassword(auth, 'customer@hotspot.com', 'customer123');
        onLogin();
      }
    } catch (err) {
      console.error(err);
      setError('Ralat semasa log masuk. Sila cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      onLogin();
    } catch (err) {
      setError('Gagal log masuk dengan Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-bg-dark sm:px-6 lg:px-8 technical-grid overflow-hidden">
      
      <AnimatePresence>
        {isCaptivePrompt && settings?.popupSSID && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-10 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm"
          >
            <div className="bg-brand border-2 border-white/20 p-5 rounded-2xl shadow-2xl flex items-center gap-4 text-white">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Wifi size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Rangkaian Dikesan</p>
                <p className="text-sm font-bold tracking-tight">Connected to {settings.popupSSID}</p>
              </div>
              <button 
                onClick={() => setIsCaptivePrompt(false)}
                className="w-8 h-8 hover:bg-white/10 rounded-lg flex items-center justify-center transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 bg-surface-dark p-10 rounded-[32px] shadow-[0_0_80px_rgba(0,0,0,0.5)] border border-border-dark relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-brand/5 rounded-full blur-3xl"></div>

        <div className="text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-brand p-4 rounded-2xl shadow-xl shadow-brand/20 transform rotate-3 hover:rotate-0 transition-transform duration-300 relative">
              <Wifi className="w-8 h-8 text-white" />
              {isCaptivePrompt && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-surface-dark animate-pulse"></div>
              )}
            </div>
          </div>
          <h2 className="text-3xl font-black text-text-dark tracking-tighter italic">
            HOTSPOT<span className="text-brand">RENTAL</span>
          </h2>
          <p className="mt-2 text-[10px] font-bold text-text-muted-dark uppercase tracking-[0.2em] mb-4">
            Authorized Node Access
          </p>
        </div>

        {error && (
          <div className="p-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-950/20 rounded-xl border border-red-500/20 animate-pulse relative z-10">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <div className="mt-8 space-y-6 relative z-10">
          <form onSubmit={handleCodeLogin} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-[10px] font-bold text-text-muted-dark uppercase tracking-widest mb-3 pl-1">
                ACCESS CODE REQUIRED
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-brand">
                  <Terminal className="w-4 h-4" />
                </div>
                <input
                  id="code"
                  type="text"
                  required
                  className="block w-full pl-12 pr-4 py-4 border-2 border-border-dark rounded-2xl leading-5 bg-bg-dark placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-mono tracking-[0.3em] font-black text-center text-text-dark"
                  placeholder="HS-XXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-brand hover:bg-blue-600 focus:outline-none focus:ring-4 focus:ring-brand/20 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-brand/10"
            >
              {loading ? 'LINKING...' : 'ESTABLISH LINK'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-dark"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="px-3 bg-surface-dark text-slate-600 italic">Security Core</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center w-full py-4 px-4 border border-border-dark rounded-2xl text-xs font-bold text-text-dark bg-bg-dark hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-800 transition-all active:scale-95 disabled:opacity-50 group"
          >
            <ShieldCheck className="w-4 h-4 mr-3 text-brand group-hover:scale-110 transition-transform" />
            ADMIN GOOGLE AUTH
          </button>
        </div>

        <div className="text-center mt-10 opacity-30">
          <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase italic">
            &copy; 2026 AI-NET HS-SYSTEMS
          </p>
        </div>
      </motion.div>
    </div>
  );
}

const X = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
