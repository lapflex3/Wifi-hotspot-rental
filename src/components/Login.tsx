import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { Wifi, Key, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getDeviceInfo = () => {
    const nav = window.navigator as any;
    return {
      os: nav.platform || 'Unknown OS',
      browser: nav.userAgent,
      cpu: `${nav.hardwareConcurrency || '??'} Cores`,
      ram: `${nav.deviceMemory || '??'} GB`,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(nav.userAgent),
      platform: nav.platform,
      cpuUsage: Math.floor(Math.random() * 30) + 5 // Simulated initial usage
    };
  };

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const q = query(collection(db, 'sessions'), where('code', '==', code), where('status', '==', 'active'));
      const snapshot = await getDocs(q).catch(err => handleFirestoreError(err, OperationType.LIST, 'sessions'));
      
      if (snapshot.empty) {
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
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-bg-dark sm:px-6 lg:px-8 technical-grid">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 bg-surface-dark p-10 rounded-[32px] shadow-2xl border border-border-dark relative overflow-hidden"
      >
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-brand/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-brand/5 rounded-full blur-3xl"></div>

        <div className="text-center relative z-10">
          <div className="flex justify-center mb-6">
            <div className="bg-brand p-4 rounded-2xl shadow-xl shadow-brand/20 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <Wifi className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-text-dark tracking-tighter">
            HS-MANAGER
          </h2>
          <p className="mt-2 text-[10px] font-bold text-text-muted-dark uppercase tracking-[0.2em] mb-4">
            Security. Stability. Speed.
          </p>
        </div>

        {error && (
          <div className="p-4 text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-950/20 rounded-xl border border-red-500/20 animate-pulse relative z-10">
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
                <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                  <Key className="w-4 h-4 text-text-muted-dark" />
                </div>
                <input
                  id="code"
                  type="text"
                  required
                  className="block w-full pl-12 pr-4 py-4 border-2 border-border-dark rounded-2xl leading-5 bg-bg-dark placeholder-slate-700 focus:outline-none focus:ring-4 focus:ring-brand/10 focus:border-brand transition-all font-mono tracking-[0.3em] font-black text-center text-text-dark"
                  placeholder="CODE-XXXX"
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
              {loading ? 'AUTHENTICATING...' : 'ESTABLISH LINK'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-dark"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="px-3 bg-surface-dark text-slate-600 italic">Admin Override</span>
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

        <div className="text-center mt-10">
          <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase italic">
            &copy; 2026 HS-MANAGER ENTERPRISE
          </p>
        </div>
      </motion.div>
    </div>
  );
}
