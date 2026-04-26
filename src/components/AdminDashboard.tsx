import React, { useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  PackageIcon, 
  Key, 
  Settings, 
  LogOut, 
  Trash2, 
  Wifi, 
  Activity, 
  RefreshCw,
  Send,
  AppWindow,
  Cpu,
  Database,
  Smartphone,
  Bot,
  MessageSquare,
  ChevronRight,
  Terminal,
  ShieldCheck
} from 'lucide-react';
import { HotspotPackage, HotspotSession, AppControl } from '../types';
import { formatData, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { getAdminConfigAI } from '../services/aiService';
import ChatBot from './ChatBot';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrorHandler';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'codes' | 'monitoring' | 'messages' | 'settings' | 'requests'>('overview');
  const [packages, setPackages] = useState<HotspotPackage[]>([]);
  const [sessions, setSessions] = useState<HotspotSession[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [settings, setSettings] = useState<AppControl | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const [newPackage, setNewPackage] = useState({
    name: '',
    dataLimitMB: 1024,
    speedLimitMbps: 5,
    durationHours: 24,
    price: 10
  });

  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    const unsubPackages = onSnapshot(collection(db, 'packages'), (snap) => {
      setPackages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HotspotPackage)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'packages'));

    const unsubSessions = onSnapshot(collection(db, 'sessions'), (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setSessions(data);
      if (data.length > 0 && !selectedSessionId) setSelectedSessionId(data[0].id);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'sessions'));

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (docSnap) => {
      if (docSnap.exists()) setSettings(docSnap.data() as AppControl);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/global'));

    const unsubRequests = onSnapshot(collection(db, 'requests'), (snap) => {
      setRequests(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'requests'));

    return () => {
      unsubPackages();
      unsubSessions();
      unsubSettings();
      unsubRequests();
    };
  }, []);

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'packages'), newPackage).catch(err => handleFirestoreError(err, OperationType.CREATE, 'packages'));
    setNewPackage({ name: '', dataLimitMB: 1024, speedLimitMbps: 5, durationHours: 24, price: 10 });
  };

  const handleGenerateCode = async () => {
    const pkg = packages.find(p => p.id === selectedPackageId);
    if (!pkg) return;

    const code = `HS-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const secretKey = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    await addDoc(collection(db, 'sessions'), {
      code,
      secretKey,
      packageId: pkg.id,
      packageName: pkg.name,
      dataLimitMB: pkg.dataLimitMB,
      dataUsedMB: 0,
      speedLimitMbps: pkg.speedLimitMbps,
      startTime: new Date().toISOString(),
      expiryTime: new Date(Date.now() + pkg.durationHours * 3600000).toISOString(),
      status: 'active'
    }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'sessions'));
    setSelectedPackageId('');
  };

  const handleAIConfig = async () => {
    if (!aiInstruction.trim()) return;
    setAiLoading(true);
    const updates = await getAdminConfigAI(aiInstruction, settings);
    if (updates) {
      const path = 'settings/global';
      await updateDoc(doc(db, path), { 
        ...settings, 
        ...updates, 
        updatedAt: new Date().toISOString() 
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, path));
      setAiInstruction('');
    }
    setAiLoading(false);
  };

  const activeSessionsCount = sessions.filter(s => s.status === 'active').length;
  const totalDataUsed = sessions.reduce((acc, s) => acc + s.dataUsedMB, 0);

  return (
    <div className="flex h-screen bg-bg-dark text-text-dark technical-grid overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-surface-dark border-r border-border-dark flex flex-col p-6 shrink-0 relative z-20">
        <div className="flex items-center gap-4 mb-12">
          <div className="bg-brand p-2.5 rounded-xl shadow-lg shadow-brand/20">
            <Wifi className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter">HS-MANAGER</h1>
            <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] uppercase italic">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          <NavItem active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={<LayoutDashboard size={20}/>} label="COMMAND CENTER" />
          <NavItem active={activeTab === 'monitoring'} onClick={() => setActiveTab('monitoring')} icon={<Activity size={20}/>} label="DEVICE MONITOR" sub="Live" />
          <NavItem active={activeTab === 'packages'} onClick={() => setActiveTab('packages')} icon={<PackageIcon size={20}/>} label="NETWORK PLANS" />
          <NavItem active={activeTab === 'codes'} onClick={() => setActiveTab('codes')} icon={<Key size={20}/>} label="ACCESS CODES" />
          <NavItem active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} icon={<ShieldCheck size={20}/>} label="REQUESTS" sub={requests.filter(r => r.status === 'pending').length > 0 ? requests.filter(r => r.status === 'pending').length.toString() : undefined} />
          <NavItem active={activeTab === 'messages'} onClick={() => setActiveTab('messages')} icon={<MessageSquare size={20}/>} label="COMMUNICATIONS" />
          <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} label="SYSTEM CONFIG" />
        </nav>

        <div className="pt-6 border-t border-border-dark mt-auto">
          <button onClick={() => auth.signOut()} className="flex items-center gap-3 w-full p-4 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/10 transition-all font-bold text-xs uppercase tracking-widest">
            <LogOut size={20} />
            TERMINATE SESSION
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full bg-bg-dark/50 overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 border-b border-border-dark flex items-center justify-between px-10 bg-surface-dark/30 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">System Status: Optimal</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Runtime Status</p>
                <p className="text-xs font-mono font-black text-brand tracking-widest">OK-200_STABLE</p>
            </div>
            <div className="w-10 h-10 bg-slate-800 rounded-full border border-slate-700 flex items-center justify-center">
                <Bot size={20} className="text-slate-400" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="overview" className="space-y-10 pb-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <StatCard label="Live Nodes" value={activeSessionsCount.toString()} trend="+2" />
                  <StatCard label="Throughput" value={formatData(totalDataUsed)} trend="Accumulated" />
                  <StatCard label="Plan Inventory" value={packages.length.toString()} trend="Configured" />
                  <StatCard label="Security Logs" value="Stable" trend="No Threats" color="text-green-400" />
                </div>

                <div className="dark-card overflow-hidden">
                    <div className="p-8 border-b border-border-dark flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Terminal size={20} className="text-brand" />
                            <h3 className="text-xs font-black uppercase tracking-[0.3em]">Traffic Control Monitor</h3>
                        </div>
                        <RefreshCw size={14} className="text-slate-700 animate-spin-slow" />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-900/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                <tr>
                                    <th className="px-8 py-6">Identity / Code</th>
                                    <th className="px-8 py-6">Network Node</th>
                                    <th className="px-8 py-6 text-right">Data Sink</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dark">
                                {sessions.slice(0, 5).map(s => (
                                    <tr key={s.id} className="hover:bg-slate-900/40 transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="font-mono text-sm font-bold text-brand group-hover:translate-x-1 transition-transform">{s.code}</div>
                                            <div className="text-[10px] text-slate-600 mt-1 uppercase font-bold tracking-widest">{s.id.slice(0,12)}</div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-xs font-bold text-text-dark">{s.packageName}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn(
                                                    "w-1.5 h-1.5 rounded-full",
                                                    s.status === 'active' ? "bg-green-500" : "bg-red-500"
                                                )}></span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{s.status}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="text-sm font-mono font-black text-slate-300">{formatData(s.dataUsedMB)}</div>
                                            <div className="w-24 h-1 bg-slate-900 rounded-full ml-auto mt-2 overflow-hidden border border-slate-800">
                                                <div className="h-full bg-brand" style={{ width: `${(s.dataUsedMB/s.dataLimitMB)*100}%` }}></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'monitoring' && (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} key="monitoring" className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-1 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-4">Active Endpoints</p>
                    {sessions.map(s => (
                        <button 
                            key={s.id} 
                            onClick={() => setSelectedSessionId(s.id)}
                            className={cn(
                                "w-full text-left dark-card p-6 border-l-4 transition-all active:scale-[0.98] group",
                                selectedSessionId === s.id ? "border-brand bg-slate-900" : "border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                            )}
                        >
                            <div className="flex justify-between items-start">
                                <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 group-hover:text-brand transition-colors mb-4">
                                    <Smartphone size={20} />
                                </div>
                                {s.status === 'active' && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mt-2"></div>}
                            </div>
                            <h4 className="text-sm font-mono font-black text-text-dark">{s.code}</h4>
                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">{s.packageName}</p>
                        </button>
                    ))}
                </div>

                <div className="lg:col-span-2">
                    {selectedSessionId ? (
                        <div className="space-y-8">
                            {sessions.find(s => s.id === selectedSessionId) && (
                                <div className="space-y-8">
                                    <div className="bg-gradient-to-br from-surface-dark to-bg-dark rounded-[40px] p-10 border border-border-dark shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-10 opacity-[0.03]">
                                            <Cpu size={200} />
                                        </div>
                                        <div className="flex justify-between items-start relative z-10">
                                            <div>
                                                <h2 className="text-3xl font-black tracking-tighter mb-2 italic">Endpoint Intelligence</h2>
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 font-mono text-[10px] text-brand uppercase font-bold tracking-widest">ID: {selectedSessionId.slice(0,16)}</span>
                                                    <span className="text-[10px] font-bold text-slate-600 uppercase">Real-time Telemetry Enabled</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Last Update</p>
                                                <p className="text-xs font-mono font-bold text-slate-400">1.2ms Offset</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12 relative z-10">
                                            <div className="dark-card p-8 bg-slate-900/50">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-brand">
                                                        <Cpu size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Processor Unit</p>
                                                        <h4 className="text-sm font-bold text-text-dark">ARM-64 Optimized Core</h4>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-[11px] font-bold text-slate-400">CPU Usage Intensity</p>
                                                        <p className="text-xl font-black text-brand italic">{(sessions.find(s => s.id === selectedSessionId) as any)?.deviceInfo?.cpuUsage || '0'}%</p>
                                                    </div>
                                                    <div className="h-2 bg-bg-dark rounded-full overflow-hidden p-0.5 border border-border-dark">
                                                        <motion.div 
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${(sessions.find(s => s.id === selectedSessionId) as any)?.deviceInfo?.cpuUsage || 0}%` }}
                                                            className="h-full bg-brand rounded-full"
                                                        ></motion.div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="dark-card p-8 bg-slate-900/50">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-orange-400">
                                                        <Database size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Memory Matrix</p>
                                                        <h4 className="text-sm font-bold text-text-dark">Volatile RAM Cache</h4>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center bg-bg-dark rounded-2xl p-5 border border-border-dark">
                                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Capacity</p>
                                                    <p className="text-xl font-black text-orange-400 italic">{(sessions.find(s => s.id === selectedSessionId) as any)?.deviceInfo?.ram || 'U/N'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
                                            <MonitoringSmallCard label="Platform OS" value={(sessions.find(s => s.id === selectedSessionId) as any)?.deviceInfo?.os?.split(' ')[0] || 'Unknown'} />
                                            <MonitoringSmallCard label="Client Browser" value={(sessions.find(s => s.id === selectedSessionId) as any)?.deviceInfo?.browser?.split('/')[0] || 'Generic'} />
                                            <MonitoringSmallCard label="Topology" value={(sessions.find(s => s.id === selectedSessionId) as any)?.deviceInfo?.isMobile ? 'Mobile Node' : 'Workstation'} />
                                        </div>
                                    </div>

                                    <div className="dark-card p-10 bg-surface-dark border-t-4 border-t-brand">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400">
                                                <Terminal size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black tracking-tighter italic">Raw Metadata Stream</h3>
                                                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Full Header Analysis</p>
                                            </div>
                                        </div>
                                        <pre className="bg-bg-dark border border-border-dark p-6 rounded-2xl text-[10px] font-mono text-slate-400 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                                            {JSON.stringify((sessions.find(s => s.id === selectedSessionId) as any)?.deviceInfo, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center dark-card italic text-slate-700 bg-slate-900/20">
                            Select an endpoint for management...
                        </div>
                    )}
                </div>
              </motion.div>
            )}

            {activeTab === 'packages' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    <div className="lg:col-span-1">
                        <div className="dark-card p-10 bg-slate-900/30">
                            <h3 className="text-2xl font-black italic mb-8 tracking-tighter">Forge New <br/><span className="text-brand underline">Network Layer</span></h3>
                            <form onSubmit={handleAddPackage} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 pl-1">Plan Identifier</label>
                                    <input 
                                        type="text" 
                                        required 
                                        value={newPackage.name}
                                        onChange={e => setNewPackage({...newPackage, name: e.target.value})}
                                        className="input-technical w-full"
                                        placeholder="EX-NODE-5G"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Data (MB)</label>
                                        <input type="number" value={newPackage.dataLimitMB} onChange={e => setNewPackage({...newPackage, dataLimitMB: Number(e.target.value)})} className="input-technical w-full text-center" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Speed (Mbps)</label>
                                        <input type="number" value={newPackage.speedLimitMbps} onChange={e => setNewPackage({...newPackage, speedLimitMbps: Number(e.target.value)})} className="input-technical w-full text-center" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Uptime (Hrs)</label>
                                        <input type="number" value={newPackage.durationHours} onChange={e => setNewPackage({...newPackage, durationHours: Number(e.target.value)})} className="input-technical w-full text-center" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 italic">Tariff (RM)</label>
                                        <input type="number" value={newPackage.price} onChange={e => setNewPackage({...newPackage, price: Number(e.target.value)})} className="input-technical w-full text-center" />
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary w-full text-[10px] uppercase tracking-widest mt-4">
                                    Commit Plan to Matrix
                                </button>
                            </form>
                        </div>
                    </div>
                    <div className="lg:col-span-2 space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                        {packages.map(pkg => (
                            <div key={pkg.id} className="dark-card p-10 flex items-center justify-between group hover:border-brand transition-all">
                                <div className="flex items-center gap-8">
                                    <div className="w-16 h-16 bg-bg-dark rounded-2xl flex items-center justify-center text-slate-700 group-hover:text-brand transition-colors border border-border-dark">
                                        <PackageIcon size={32} />
                                    </div>
                                    <div>
                                        <h4 className="text-2xl font-black italic tracking-tighter text-text-dark">{pkg.name}</h4>
                                        <div className="flex gap-4 mt-2">
                                            <span className="text-[10px] font-black bg-bg-dark border border-border-dark px-3 py-1 rounded-lg text-slate-500 italic uppercase">{formatData(pkg.dataLimitMB)}</span>
                                            <span className="text-[10px] font-black bg-brand/10 border border-brand/20 px-3 py-1 rounded-lg text-brand italic uppercase">{pkg.speedLimitMbps} MBPS</span>
                                            <span className="text-[10px] font-black bg-bg-dark border border-border-dark px-3 py-1 rounded-lg text-slate-500 italic uppercase">{pkg.durationHours} HRS</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-10">
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-2">Market Tariff</p>
                                        <p className="text-3xl font-black text-text-dark italic tracking-tighter">RM{pkg.price.toFixed(2)}</p>
                                    </div>
                                    <button onClick={async () => await deleteDoc(doc(db, 'packages', pkg.id))} className="p-4 text-slate-700 hover:text-red-500 hover:bg-red-950/20 rounded-2xl transition-all border border-transparent hover:border-red-900">
                                        <Trash2 size={24} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {activeTab === 'codes' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-10">
                    <div className="bg-slate-900 border border-border-dark p-12 rounded-[40px] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-brand/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
                        <h3 className="text-4xl font-black tracking-tighter italic mb-10 relative z-10 text-text-dark">Generate <br/><span className="text-brand">Secure Access Code</span></h3>
                        <div className="flex flex-col md:flex-row gap-8 items-end relative z-10">
                            <div className="flex-1 space-y-3 w-full">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] pl-1">Network Profile Selector</label>
                                <select 
                                    value={selectedPackageId} 
                                    onChange={e => setSelectedPackageId(e.target.value)}
                                    className="input-technical w-full text-base bg-bg-dark py-5"
                                >
                                    <option value="">-- Manual Selection Needed --</option>
                                    {packages.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()} HUB [RM{p.price}]</option>)}
                                </select>
                            </div>
                            <button 
                                onClick={handleGenerateCode} 
                                disabled={!selectedPackageId}
                                className="btn-primary w-full md:w-auto px-16 py-6 text-[11px] uppercase tracking-[0.4em]"
                            >
                                TRANSMIT TO VOID
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {sessions.filter(s => s.status === 'active').map(s => (
                            <div key={s.id} className="dark-card p-10 group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                                    <Key size={80} className="rotate-12" />
                                </div>
                                <div className="mb-8">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest leading-none mb-3 italic">{s.packageName}</p>
                                    <h4 className="text-4xl font-mono font-black text-text-dark tracking-tighter group-hover:text-brand transition-colors cursor-copy select-all" onClick={() => {
                                        navigator.clipboard.writeText(s.code);
                                        alert('CODE_CLONED_SUCCESS');
                                    }}>{s.code}</h4>
                                </div>
                                <div className="space-y-4 pt-8 border-t border-slate-900">
                                    <div className="flex justify-between items-center bg-bg-dark border border-border-dark p-4 rounded-2xl">
                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Secret Hash</p>
                                        <p className="text-xs font-mono font-black text-slate-400">{s.secretKey}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="px-6 py-4 bg-bg-dark rounded-2xl border border-border-dark text-center">
                                            <p className="text-[9px] font-black text-slate-700 uppercase mb-1">Cap</p>
                                            <p className="text-xs font-bold text-slate-400">{formatData(s.dataLimitMB)}</p>
                                        </div>
                                        <div className="px-6 py-4 bg-bg-dark rounded-2xl border border-border-dark text-center">
                                            <p className="text-[9px] font-black text-slate-700 uppercase mb-1">Used</p>
                                            <p className="text-xs font-bold text-brand">{formatData(s.dataUsedMB)}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-10 flex gap-4">
                                    <button onClick={() => updateDoc(doc(db, 'sessions', s.id), { status: 'expired' })} className="flex-1 btn-outline border-red-900/30 text-red-500/60 hover:text-red-400 hover:bg-red-950/20 py-4 text-[10px] uppercase tracking-widest">Terminate</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {activeTab === 'requests' && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                        <Terminal size={32} className="text-brand" />
                        <div>
                            <h2 className="text-2xl font-black italic tracking-tighter">Inbound Requests</h2>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Extension & Technical Handshakes</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                        {requests.length === 0 ? (
                            <div className="dark-card p-20 text-center italic text-slate-700 bg-slate-900/10">
                                No pending requests in queue...
                            </div>
                        ) : (
                            requests.map(req => (
                                <div key={req.id} className={cn(
                                    "dark-card p-10 flex items-center justify-between",
                                    req.status === 'pending' ? "border-l-4 border-l-yellow-500 bg-yellow-500/5" : "opacity-50"
                                )}>
                                    <div className="flex items-center gap-8">
                                        <div className="w-16 h-16 bg-bg-dark rounded-2xl flex items-center justify-center text-slate-600 border border-border-dark">
                                            {req.type === 'extension' ? <RefreshCw size={24} /> : <Settings size={24} />}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-text-dark tracking-tighter uppercase">{req.type} REQUEST</h4>
                                            <div className="flex gap-4 mt-2">
                                                <span className="text-[10px] font-black text-brand uppercase tracking-widest">Node: {req.code}</span>
                                                <span className="text-[10px] font-bold text-slate-600 uppercase">{format(new Date(req.timestamp), 'HH:mm:ss')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4">
                                        {req.status === 'pending' && (
                                            <>
                                                <button 
                                                    onClick={async () => {
                                                        const session = sessions.find(s => s.id === req.sessionId);
                                                        if (session) {
                                                            // Extend by 2 hours for now as a real function
                                                            const newExpiry = new Date(new Date(session.expiryTime).getTime() + 2 * 3600000).toISOString();
                                                            await updateDoc(doc(db, 'sessions', session.id), { expiryTime: newExpiry });
                                                            await updateDoc(doc(db, 'requests', req.id), { status: 'approved' });
                                                        }
                                                    }}
                                                    className="btn-primary py-3 px-8 text-[10px] uppercase tracking-widest bg-green-600 hover:bg-green-700 shadow-green-500/10"
                                                >
                                                    Approve (+2h)
                                                </button>
                                                <button 
                                                    onClick={async () => await updateDoc(doc(db, 'requests', req.id), { status: 'denied' })}
                                                    className="btn-outline py-3 px-8 text-[10px] uppercase tracking-widest border-red-900/30 text-red-500/60 hover:text-red-500"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        )}
                                        {req.status !== 'pending' && (
                                            <span className={cn(
                                                "text-[11px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-lg border",
                                                req.status === 'approved' ? "text-green-500 border-green-500/30" : "text-red-500 border-red-500/30"
                                            )}>
                                                {req.status}
                                            </span>
                                        )}
                                        <button onClick={async () => await deleteDoc(doc(db, 'requests', req.id))} className="p-3 text-slate-700 hover:text-red-500 transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}

            {activeTab === 'messages' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-200px)] flex gap-10">
                    <div className="w-80 dark-card flex flex-col shrink-0 overflow-hidden">
                        <div className="p-8 border-b border-border-dark bg-slate-900/50">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] italic">Comms Stream</h3>
                            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1">Inbound Intercepts</p>
                        </div>
                        <div className="flex-1 overflow-y-auto technical-grid">
                            {sessions.map(s => (
                                <button 
                                    key={s.id} 
                                    onClick={() => setSelectedSessionId(s.id)}
                                    className={cn(
                                        "w-full text-left p-6 border-b border-border-dark hover:bg-slate-900 transition-colors relative group",
                                        selectedSessionId === s.id && "bg-slate-900 border-l-4 border-l-brand"
                                    )}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-bg-dark border border-border-dark rounded-xl flex items-center justify-center text-slate-600 group-hover:text-brand transition-colors">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-mono font-bold text-text-dark">{s.code}</p>
                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1 italic">{s.packageName}</p>
                                        </div>
                                    </div>
                                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-800" size={16} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 dark-card overflow-hidden bg-slate-900/10">
                        {selectedSessionId ? (
                             <div className="h-full flex flex-col p-8 pb-32 relative">
                                <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[150px] font-black text-slate-900 opacity-5 -rotate-12 select-none pointer-events-none">SECURE_CHAT</p>
                                <ChatBot sessionId={selectedSessionId} isAdmin={true} />
                             </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center space-y-6 italic text-slate-700 opacity-50">
                                <MessageSquare size={100} />
                                <p className="uppercase tracking-[0.4em] font-black text-sm">Select Node to Intercept</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {activeTab === 'settings' && (
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl space-y-12">
                    <div className="bg-gradient-to-br from-indigo-950/20 to-brand/10 border border-brand/20 p-12 rounded-[40px] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-10">
                            <Bot size={150} className="rotate-12" />
                        </div>
                        <div className="max-w-2xl relative z-10">
                            <h3 className="text-3xl font-black italic tracking-tighter mb-4 text-text-dark">AI Configuration <span className="text-brand">Assistant</span></h3>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-10 italic">
                                Perintahkan AI untuk mengemaskini tetapan, menukar sekatan aplikasi, atau menjana mesej hebahan global secara automatik.
                            </p>
                            <div className="space-y-6">
                                <textarea 
                                    value={aiInstruction}
                                    onChange={e => setAiInstruction(e.target.value)}
                                    placeholder="Contoh: 'Tukar hebahan kepada promosi hari raya dan benarkan Netflix hujung minggu ini'"
                                    className="input-technical w-full h-32 text-sm leading-relaxed"
                                />
                                <button 
                                    onClick={handleAIConfig}
                                    disabled={aiLoading || !aiInstruction.trim()}
                                    className="btn-primary flex items-center gap-4 px-12 group"
                                >
                                    {aiLoading ? <RefreshCw className="animate-spin" size={18} /> : <Bot size={18} className="group-hover:rotate-12 transition-transform" />}
                                    <span className="uppercase tracking-widest text-[11px] font-black">AI_PROCESS_INSTRUCTION</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="dark-card p-10 bg-slate-900/30">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-brand border border-border-dark">
                                    <Send size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tighter italic">Manual Broadcast</h3>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Global Node Dispatch</p>
                                </div>
                            </div>
                            <textarea 
                                value={broadcastMsg}
                                onChange={e => setBroadcastMsg(e.target.value)}
                                className="input-technical w-full h-40 text-sm mb-6"
                                placeholder="..."
                            />
                            <button 
                                onClick={async () => {
                                    await updateDoc(doc(db, 'settings', 'global'), { ...settings, broadcastMessage: broadcastMsg, updatedAt: new Date().toISOString() });
                                    setBroadcastMsg('');
                                }}
                                className="btn-outline w-full py-5 text-[10px] uppercase tracking-widest border-slate-800 hover:bg-slate-900"
                            >
                                DISPATCH HEBAHAN
                            </button>
                        </div>

                        <div className="dark-card p-10 bg-slate-900/30">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-brand border border-border-dark">
                                    <AppWindow size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black tracking-tighter italic">Environment Guard</h3>
                                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Whitelisted Protocols</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                {['WhatsApp', 'Facebook', 'Netfix', 'YouTube', 'TikTok', 'Instagram', 'Gaming', 'Browser'].map(app => (
                                    <label key={app} className="relative group cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            className="peer hidden"
                                            checked={settings?.allowedApps?.includes(app)}
                                            onChange={async (e) => {
                                                const current = settings?.allowedApps || [];
                                                const updated = e.target.checked ? [...current, app] : current.filter(a => a !== app);
                                                await updateDoc(doc(db, 'settings', 'global'), { ...settings, allowedApps: updated, updatedAt: new Date().toISOString() });
                                            }}
                                        />
                                        <div className="flex items-center justify-center h-16 border-2 border-slate-900/50 rounded-2xl bg-slate-900/50 text-[10px] font-black uppercase tracking-widest text-slate-700 peer-checked:bg-brand peer-checked:text-white peer-checked:border-brand transition-all peer-checked:scale-[1.05] peer-checked:shadow-2xl peer-checked:shadow-brand/20 italic">
                                            {app}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon, label, sub }: { active: boolean; onClick: () => void; icon: any; label: string; sub?: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full p-4 rounded-2xl transition-all group relative overflow-hidden",
        active ? "bg-brand text-white shadow-xl shadow-brand/20 translate-x-2" : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
      )}
    >
      <div className="flex items-center gap-4 relative z-10">
        {icon}
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
      </div>
      {sub && <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-md border italic", active ? "border-white/30 bg-white/10" : "border-slate-800 bg-slate-900")}>{sub}</span>}
      {active && <motion.div layoutId="nav-active" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-full" />}
    </button>
  );
}

function StatCard({ label, value, trend, color = 'text-brand' }: { label: string; value: string; trend: string; color?: string }) {
  return (
    <div className="dark-card p-8 bg-surface-dark border p-6 relative overflow-hidden group">
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 pl-1">{label}</p>
      <div className="flex items-end gap-3">
        <h4 className={cn("text-4xl font-black italic tracking-tighter", color)}>{value}</h4>
        <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest mb-1">{trend}</p>
      </div>
    </div>
  );
}

function MonitoringSmallCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="bg-bg-dark border border-border-dark p-6 rounded-2xl flex flex-col items-center justify-center text-center group hover:bg-slate-900/50 transition-colors">
            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mb-2 italic">{label}</p>
            <p className="text-base font-bold text-slate-300 group-hover:text-brand transition-colors">{value}</p>
        </div>
    );
}

const User = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
