import { useState, useEffect, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query, 
  where, 
  limit, 
  getDocs,
  addDoc
} from 'firebase/firestore';
import { 
  Wifi, 
  Clock, 
  Database, 
  Gauge, 
  Info, 
  LogOut, 
  Bell, 
  AlertTriangle,
  Zap,
  AppWindow,
  ShieldAlert
} from 'lucide-react';
import { HotspotSession, AppControl } from '../types';
import { formatData, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format, differenceInSeconds, intervalToDuration } from 'date-fns';

export default function CustomerDashboard({ user }: { user: any }) {
  const [session, setSession] = useState<HotspotSession | null>(null);
  const [settings, setSettings] = useState<AppControl | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [alert, setAlert] = useState<{ msg: string; type: 'info' | 'warn' | 'danger' } | null>(null);
  const usageIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Fetch the user's active session
    // We'll search for a session that has this userId, or just the first active one for this demo
    const q = query(collection(db, 'sessions'), where('status', '==', 'active'), limit(1));
    const unsubSession = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as HotspotSession;
        setSession(data);
        
        // Link user if not linked
        if (!data.userId) {
            updateDoc(doc(db, 'sessions', data.id), { userId: user.uid });
        }
      }
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppControl);
    });

    return () => {
      unsubSession();
      unsubSettings();
      if (usageIntervalRef.current) clearInterval(usageIntervalRef.current);
    };
  }, [user.uid]);

  // Expiry Countdown & Alerts
  useEffect(() => {
    if (!session || session.status === 'expired') return;

    const timer = setInterval(() => {
      const now = new Date();
      const expiry = new Date(session.expiryTime);
      const diffSecs = differenceInSeconds(expiry, now);

      if (diffSecs <= 0) {
        updateDoc(doc(db, 'sessions', session.id), { status: 'expired' });
        setTimeLeft('TELAH TAMAT');
        clearInterval(timer);
      } else {
        const duration = intervalToDuration({ start: now, end: expiry });
        const h = String(duration.hours || 0).padStart(2, '0');
        const m = String(duration.minutes || 0).padStart(2, '0');
        const s = String(duration.seconds || 0).padStart(2, '0');
        setTimeLeft(`${h}:${m}:${s}`);

        // ALERTS: 15 minutes left
        if (diffSecs <= 900 && !session.lastAlertTime) {
          setAlert({ msg: 'Sesi tamat dalam 15 minit!', type: 'warn' });
          updateDoc(doc(db, 'sessions', session.id), { lastAlertTime: true });
        }
      }

      // ALERTS: 10% data left
      const remainingMB = session.dataLimitMB - session.dataUsedMB;
      if (remainingMB <= (session.dataLimitMB * 0.1) && !session.lastAlertData) {
        setAlert({ msg: 'Baki data tinggal 10% sahaja!', type: 'danger' });
        updateDoc(doc(db, 'sessions', session.id), { lastAlertData: true });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  // SIMULATE USAGE (Demo only)
  useEffect(() => {
    if (session && session.status === 'active') {
        usageIntervalRef.current = setInterval(() => {
            const increment = Math.random() * 0.5; // Simulate 0-0.5MB every 5 seconds
            const nextUsage = session.dataUsedMB + increment;
            
            if (nextUsage >= session.dataLimitMB) {
                updateDoc(doc(db, 'sessions', session.id), { dataUsedMB: session.dataLimitMB, status: 'expired' });
            } else {
                updateDoc(doc(db, 'sessions', session.id), { dataUsedMB: nextUsage });
                // Log usage
                addDoc(collection(db, 'logs'), {
                    sessionId: session.id,
                    timestamp: new Date().toISOString(),
                    dataTransferredMB: increment
                });
            }
        }, 5000);
    }
    return () => {
        if (usageIntervalRef.current) clearInterval(usageIntervalRef.current);
    };
  }, [session?.id, session?.status]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6 text-center">
        <div className="space-y-4">
           <ShieldAlert className="w-16 h-16 text-neutral-300 mx-auto" />
           <p className="text-neutral-500 font-medium">Tiada sesi aktif ditemui. Sila hubungi admin atau masukkan kod sewaan.</p>
           <button onClick={() => auth.signOut()} className="text-blue-600 font-bold border-b-2 border-blue-600">Log Keluar</button>
        </div>
      </div>
    );
  }

  const dataPercentage = (session.dataUsedMB / session.dataLimitMB) * 100;

  return (
    <div className="min-h-screen bg-slate-100 font-sans pb-20 flex flex-col items-center justify-center px-4">
      {/* Mobile Frame Simulation */}
      <div className="bg-slate-200 p-3 rounded-[40px] shadow-2xl border-4 border-slate-300 w-full max-w-[320px] h-[640px] relative overflow-hidden flex flex-col group">
        <div className="bg-white h-full rounded-[30px] overflow-hidden flex flex-col shadow-inner relative z-10">
          
          {/* Hero Header */}
          <div className="bg-blue-600 p-8 text-white relative overflow-hidden shrink-0">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
            <p className="text-[10px] opacity-70 uppercase font-black tracking-[0.3em] mb-1">Status Sesi</p>
            <h3 className="text-2xl font-black font-mono tracking-tighter select-all">{session.code}</h3>
            
            <div className="mt-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-[10px] font-black uppercase tracking-widest">Active Connection</span>
            </div>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-8">
            <AnimatePresence>
                {(alert || settings?.broadcastMessage) && (
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        className={cn(
                            "p-3 rounded-xl text-[10px] font-bold leading-tight border flex gap-2 items-start",
                            alert?.type === 'danger' ? "bg-red-50 text-red-600 border-red-100" :
                            alert?.type === 'warn' ? "bg-orange-50 text-orange-600 border-orange-100" :
                            "bg-blue-50 text-blue-600 border-blue-100"
                        )}
                    >
                        <Bell size={14} className="shrink-0 mt-0.5" />
                        <span>{alert?.msg || settings?.broadcastMessage}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <div>
                <div className="flex justify-between items-end mb-2 px-1">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Baki Data</p>
                  <p className={cn(
                    "text-xs font-black",
                    dataPercentage > 90 ? "text-red-500" : "text-blue-600"
                  )}>
                    {formatData(session.dataLimitMB - session.dataUsedMB)} Tinggal
                  </p>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${dataPercentage}%` }}
                    className={cn(
                        "h-full rounded-full transition-colors",
                        dataPercentage > 90 ? "bg-red-500" : "bg-blue-600"
                    )}
                  ></motion.div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Speed</p>
                  <p className="text-base font-black text-slate-800">{session.speedLimitMbps} Mbps</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Masa</p>
                  <p className="text-base font-black text-slate-800">{timeLeft}</p>
                </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Wifi size={32} />
                </div>
                <p className="text-[9px] text-white/50 font-black uppercase tracking-[0.2em] mb-1">Kunci Rahsia</p>
                <p className="text-sm font-mono font-bold tracking-widest">{session.secretKey}</p>
            </div>

            <div className="space-y-3">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest px-1">Apps Whitelisted</p>
                 <div className="flex flex-wrap gap-1.5">
                    {settings?.allowedApps?.slice(0, 4).map(app => (
                        <span key={app} className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-lg border border-slate-200">
                            {app}
                        </span>
                    ))}
                 </div>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 shrink-0">
             <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 active:scale-95 transition-all">
                RENEW DATA
             </button>
             <button onClick={() => auth.signOut()} className="w-full mt-2 py-2 text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest">
                Log Out Session
             </button>
          </div>
        </div>
        {/* Phone UI Decorations */}
        <div className="absolute -left-1 top-24 w-1 h-12 bg-slate-400 rounded-r"></div>
        <div className="absolute -right-1 top-32 w-1 h-20 bg-slate-400 rounded-l"></div>
      </div>
    </div>
  );
}
