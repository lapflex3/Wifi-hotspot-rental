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
  addDoc
} from 'firebase/firestore';
import { 
  Wifi, 
  Database, 
  Info, 
  Bell, 
  ShieldAlert,
  Cpu,
  Minimize2,
  Maximize2,
  SignalHigh
} from 'lucide-react';
import { HotspotSession, AppControl } from '../types';
import { formatData, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { differenceInSeconds, intervalToDuration } from 'date-fns';
import ChatBot from './ChatBot';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export default function CustomerDashboard({ user }: { user: any }) {
  const [session, setSession] = useState<HotspotSession | any>(null);
  const [settings, setSettings] = useState<AppControl | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpiringSoon, setIsExpiringSoon] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Auto-minimize after 2 seconds on success
    if (session && session.status === 'active' && !isMinimized) {
      const timer = setTimeout(() => setIsMinimized(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [session?.id]);

  const usageIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'sessions'), where('status', '==', 'active'), limit(20));
    const unsubSession = onSnapshot(q, (snap) => {
      // Find session for this user or first active one for demo
      const mySession = snap.docs.find(d => d.data().userId === user.uid) || snap.docs[0];
      if (mySession) {
        const data = { id: mySession.id, ...mySession.data() } as any;
        setSession(data);
        
        if (!data.userId) {
            updateDoc(doc(db, 'sessions', data.id), { userId: user.uid }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `sessions/${data.id}`));
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'sessions');
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data() as AppControl);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global');
    });

    return () => {
      unsubSession();
      unsubSettings();
      if (usageIntervalRef.current) clearInterval(usageIntervalRef.current);
      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [user.uid]);

  // Real-time device stats simulation for management
  useEffect(() => {
    if (session && session.status === 'active') {
        statsIntervalRef.current = setInterval(() => {
            const cpuUsage = Math.floor(Math.random() * 40) + 10;
            const path = `sessions/${session.id}`;
            updateDoc(doc(db, path), { 
                "deviceInfo.cpuUsage": cpuUsage,
                "deviceInfo.lastUpdate": new Date().toISOString()
            }).catch(err => {
                console.warn("Failed to update dummy stats", err);
            });
        }, 8000);
    }
    return () => {
        if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
    };
  }, [session?.id, session?.status]);

  useEffect(() => {
    if (!session || session.status === 'expired') return;

    const timer = setInterval(() => {
      const now = new Date();
      const expiry = new Date(session.expiryTime);
      const diffSecs = differenceInSeconds(expiry, now);

      if (diffSecs <= 900 && diffSecs > 0) {
        setIsExpiringSoon(true);
      } else {
        setIsExpiringSoon(false);
      }

      if (diffSecs <= 0) {
        const path = `sessions/${session.id}`;
        updateDoc(doc(db, path), { status: 'expired' }).catch(err => handleFirestoreError(err, OperationType.UPDATE, path));
        setTimeLeft('EXPIRED');
        clearInterval(timer);
      } else {
        const duration = intervalToDuration({ start: now, end: expiry });
        const h = String(duration.hours || 0).padStart(2, '0');
        const m = String(duration.minutes || 0).padStart(2, '0');
        const s = String(duration.seconds || 0).padStart(2, '0');
        setTimeLeft(`${h}:${m}:${s}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session]);

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-dark p-6 text-center technical-grid">
        <div className="space-y-6 max-w-sm">
           <div className="w-20 h-20 bg-slate-900 border-2 border-slate-800 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
              <ShieldAlert className="w-10 h-10 text-slate-700" />
           </div>
           <div className="space-y-2">
             <h2 className="text-xl font-black uppercase tracking-tighter">No Active Session</h2>
             <p className="text-text-muted-dark text-xs font-medium tracking-wide leading-relaxed">
               Authentication link severed. Please verify your access code or contact systems administrator.
             </p>
           </div>
           <button onClick={() => auth.signOut()} className="btn-outline w-full text-[10px] uppercase tracking-[0.3em] py-4">
              Return to Login
           </button>
        </div>
      </div>
    );
  }

  const dataPercentage = (session.dataUsedMB / session.dataLimitMB) * 100;

  return (
    <div className="min-h-screen bg-bg-dark font-sans flex flex-col items-center justify-center px-4 technical-grid">
      
      <AnimatePresence mode="wait">
        {!isMinimized ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-[360px] h-[680px] bg-bg-dark rounded-[48px] shadow-[0_0_100px_rgba(0,0,0,0.8)] border-8 border-slate-900 relative overflow-hidden flex flex-col p-2 group"
          >
            <div className="bg-surface-dark h-full rounded-[40px] overflow-hidden flex flex-col relative z-10 border border-border-dark">
              
              {/* Header */}
              <div className="p-8 pb-12 bg-gradient-to-br from-brand to-brand-muted text-white relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Wifi size={120} className="rotate-12" />
                </div>
                <div className="flex justify-between items-center mb-6 relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-80">Connected</p>
                    <button 
                        onClick={() => setIsMinimized(true)}
                        className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
                    >
                        <Minimize2 size={16} />
                    </button>
                </div>
                <h3 className="text-3xl font-mono font-black tracking-tighter select-all relative z-10 mb-2">{session.code}</h3>
                <div className="flex items-center gap-2 relative z-10">
                    <SignalHigh size={12} className="text-green-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">5G Low Latency</span>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 -mt-8 flex-1 overflow-y-auto space-y-6 relative z-20 pb-10">
                <AnimatePresence>
                    {isExpiringSoon && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-600/90 border border-red-500 p-4 rounded-2xl shadow-xl shadow-red-900/40 relative z-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">
                            ALERT: LINK TERMINATION IN &lt;15M
                          </p>
                        </div>
                      </motion.div>
                    )}
                    {settings?.broadcastMessage && (
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-brand/10 border-l-4 border-brand p-4 rounded-xl rounded-l-none"
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Bell size={12} className="text-brand" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-brand">System Message</span>
                            </div>
                            <p className="text-[11px] text-text-dark font-medium leading-relaxed italic">
                                "{settings.broadcastMessage}"
                            </p>
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="dark-card p-5 space-y-4">
                    <div className="flex justify-between items-end mb-1">
                        <div className="flex items-center gap-2">
                            <Database size={14} className="text-text-muted-dark" />
                            <p className="text-[10px] text-text-muted-dark font-black uppercase tracking-widest">Kapasiti Data</p>
                        </div>
                        <p className={cn(
                            "text-xs font-mono font-bold",
                            dataPercentage > 90 ? "text-red-400" : "text-brand"
                        )}>
                            {formatData(session.dataLimitMB - session.dataUsedMB)} Left
                        </p>
                    </div>
                    <div className="h-2 bg-bg-dark rounded-full overflow-hidden p-0.5 border border-border-dark shadow-inner">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(5, 100 - dataPercentage)}%` }}
                            className={cn(
                                "h-full rounded-full transition-all duration-1000",
                                dataPercentage > 90 ? "bg-red-500" : "bg-brand group-hover:bg-blue-400"
                            )}
                        ></motion.div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="dark-card p-5 text-center">
                        <div className="flex justify-center mb-2">
                             <Cpu size={16} className="text-slate-600" />
                        </div>
                        <p className="text-[9px] text-text-muted-dark font-black uppercase tracking-widest mb-1">Speed</p>
                        <p className="text-lg font-black text-text-dark tracking-tighter">{session.speedLimitMbps} <span className="text-[10px] text-slate-500 uppercase">Mbps</span></p>
                    </div>
                    <div className="dark-card p-5 text-center">
                        <div className="flex justify-center mb-2">
                             <SignalHigh size={16} className="text-slate-600" />
                        </div>
                        <p className="text-[9px] text-text-muted-dark font-black uppercase tracking-widest mb-1">Time Remaining</p>
                        <p className="text-lg font-black text-text-dark tracking-tighter">{timeLeft}</p>
                    </div>
                </div>

                <div className="dark-card p-4 flex items-center justify-between group cursor-help">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-slate-600 group-hover:text-blue-400 transition-colors">
                            <Cpu size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] text-text-muted-dark font-black uppercase tracking-widest">Hardware Opt.</p>
                            <p className="text-[11px] font-bold text-text-dark">{session.deviceInfo?.cpuUsage || '??'}% Current Load</p>
                        </div>
                    </div>
                    <Info size={14} className="text-slate-700" />
                </div>

                <div className="space-y-3">
                    <p className="text-[10px] text-text-muted-dark font-black uppercase tracking-widest px-1">Network Permissions</p>
                    <div className="flex flex-wrap gap-2">
                        {settings?.allowedApps?.map(app => (
                            <span key={app} className="px-3 py-1 bg-slate-800 text-[9px] font-black text-slate-400 rounded-full border border-slate-700/50 uppercase tracking-widest italic">
                                {app}
                            </span>
                        )) || <span className="text-[9px] italic text-slate-600">Syncing node permissions...</span>}
                    </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-slate-900/50 border-t border-border-dark shrink-0">
                <button 
                  onClick={async () => {
                    try {
                        await addDoc(collection(db, 'requests'), {
                            sessionId: session.id,
                            code: session.code,
                            type: 'extension',
                            status: 'pending',
                            timestamp: new Date().toISOString()
                        });
                        alert('Permintaan pelanjutan telah dihantar kepada admin.');
                    } catch (err) {
                        console.error(err);
                    }
                  }}
                  className="btn-primary w-full text-xs uppercase tracking-[0.2em] shadow-brand/30"
                >
                    Extension Request
                </button>
                <div className="mt-4 flex justify-between items-center px-2">
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic">Encrypted Session</p>
                    <button onClick={() => auth.signOut()} className="text-[9px] font-black text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors">Terminate</button>
                </div>
              </div>
            </div>
            
            {/* Simulation UI */}
            <div className="absolute top-1/2 -left-3 w-1.5 h-16 bg-slate-800 rounded-r z-0"></div>
            <div className="absolute top-1/2 -right-3 w-1.5 h-24 bg-slate-800 rounded-l z-0"></div>
          </motion.div>
        ) : (
          <motion.div 
            key="minimized"
            layoutId="dashboard"
            onClick={() => setIsMinimized(false)}
            initial={{ opacity: 0, scale: 0.5, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="fixed bottom-24 left-6 w-16 h-16 bg-brand text-white rounded-full shadow-2xl flex items-center justify-center cursor-pointer border-4 border-slate-900 z-40 overflow-hidden group"
          >
             <Maximize2 size={24} className="group-hover:scale-110 transition-transform" />
             <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatBot sessionId={session.id} />
    </div>
  );
}
