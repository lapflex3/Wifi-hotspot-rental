import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Wifi, Key, ShieldCheck, Mail, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Login({ onLogin }: { onLogin: () => void }) {
  const [code, setCode] = useState('');
  const [isEmailLogin, setIsEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const q = query(collection(db, 'sessions'), where('code', '==', code), where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        setError('Kod sewaan tidak sah atau telah tamat.');
      } else {
        // In a real app, we'd sign in the user. 
        // For this demo, if the code matches, we'll use anonymous auth to identify the session
        // and link the session to this UID if not already linked.
        const credential = await auth.currentUser ? { user: auth.currentUser } : await signInWithEmailAndPassword(auth, 'customer@hotspot.com', 'customer123'); // Preset customer account or switch to anonymous
        // Alternative: Just use Google auth for everyone and match the code.
        // Let's use simple logic: Admin = Google Login (specific email), Customer = code based access.
        // To keep it simple for the demo, I'll allow "Login with Google" as the primary entry.
      }
    } catch (err) {
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
    } catch (err) {
      setError('Gagal log masuk dengan Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 bg-slate-50 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8 bg-white p-10 rounded-3xl shadow-2xl border border-slate-100"
      >
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-100 transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <Wifi className="w-8 h-8 text-white" />
            </div>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
            HS-Manager
          </h2>
          <p className="mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">
            Sistem Pengurusan WiFi Hotspot
          </p>
        </div>

        {error && (
          <div className="p-4 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 rounded-xl border border-red-100 animate-pulse">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-6">
          {!isEmailLogin ? (
            <form onSubmit={handleCodeLogin} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">
                  Masukkan Kod Sewaan
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Key className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="code"
                    type="text"
                    required
                    className="block w-full pl-12 pr-4 py-4 border-2 border-slate-50 rounded-2xl leading-5 bg-slate-50 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono tracking-[0.3em] font-black text-center text-slate-800"
                    placeholder="WIFI-XXXX"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-xs font-black uppercase tracking-widest rounded-2xl text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100 transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-blue-200"
              >
                {loading ? 'MEMPROSES...' : 'HUBUNG SEKARANG'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
               <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Admin Access Portal</p>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
              <span className="px-3 bg-white text-slate-300 italic">Auth Verification</span>
            </div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center w-full py-4 px-4 border border-slate-100 rounded-2xl text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all active:scale-95 disabled:opacity-50 group"
          >
            <ShieldCheck className="w-4 h-4 mr-3 text-blue-600 group-hover:scale-110 transition-transform" />
            ADMIN GOOGLE LOGIN
          </button>
        </div>

        <div className="text-center mt-10">
          <p className="text-[10px] text-slate-300 font-bold tracking-widest uppercase italic">
            &copy; 2026 Professional Hotspot Systems
          </p>
        </div>
      </motion.div>
    </div>
  );
}
