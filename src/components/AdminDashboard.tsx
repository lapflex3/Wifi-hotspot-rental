import { useState, useEffect } from 'react';
import React from 'react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Package as PackageIcon, 
  Key, 
  Activity, 
  Settings, 
  Plus, 
  Trash2, 
  RefreshCw, 
  LogOut,
  Send,
  AppWindow,
  Search,
  Bell,
  Wifi,
  ShieldCheck
} from 'lucide-react';
import { HotspotPackage, HotspotSession, AppControl, UsageLog } from '../types';
import { generateKey, formatData, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'packages' | 'codes' | 'logs' | 'settings'>('overview');
  const [packages, setPackages] = useState<HotspotPackage[]>([]);
  const [sessions, setSessions] = useState<HotspotSession[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [settings, setSettings] = useState<AppControl | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newPackage, setNewPackage] = useState({ name: '', dataLimitMB: 1000, speedLimitMbps: 5, durationHours: 1, price: 5 });
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');

  useEffect(() => {
    const unsubPackages = onSnapshot(collection(db, 'packages'), (snap) => {
      setPackages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HotspotPackage)));
    });

    const unsubSessions = onSnapshot(query(collection(db, 'sessions'), orderBy('startTime', 'desc')), (snap) => {
      setSessions(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as HotspotSession)));
    });

    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) setSettings(doc.data() as AppControl);
    });

    setLoading(false);
    return () => {
      unsubPackages();
      unsubSessions();
      unsubSettings();
    };
  }, []);

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    await addDoc(collection(db, 'packages'), newPackage);
    setNewPackage({ name: '', dataLimitMB: 1000, speedLimitMbps: 5, durationHours: 1, price: 5 });
  };

  const handleGenerateCode = async () => {
    if (!selectedPackageId) return;
    const pkg = packages.find(p => p.id === selectedPackageId);
    if (!pkg) return;

    const code = generateKey(12);
    const secretKey = generateKey(12);
    const now = new Date();
    const expiry = new Date(now.getTime() + pkg.durationHours * 60 * 60 * 1000);

    await addDoc(collection(db, 'sessions'), {
      code,
      secretKey,
      packageId: pkg.id,
      packageName: pkg.name,
      status: 'active',
      startTime: now.toISOString(),
      expiryTime: expiry.toISOString(),
      dataLimitMB: pkg.dataLimitMB,
      dataUsedMB: 0,
      speedLimitMbps: pkg.speedLimitMbps,
      lastAlertData: false,
      lastAlertTime: false
    });
  };

  const handleUpdateSettings = async () => {
    await setDoc(doc(db, 'settings', 'global'), {
      broadcastMessage: broadcastMsg,
      allowedApps: settings?.allowedApps || ['WhatsApp', 'Facebook', 'Browser'],
      updatedAt: new Date().toISOString()
    });
    setBroadcastMsg('');
    alert('Notifikasi dihantar!');
  };

  const resetSession = async (id: string) => {
    await updateDoc(doc(db, 'sessions', id), { dataUsedMB: 0, status: 'active' });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Sidebar Navigation */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white border-r border-slate-700 shadow-xl overflow-hidden shrink-0">
        <div className="p-6 border-b border-slate-700 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-[10px] font-black shadow-lg">WIFI</div>
          <h1 className="text-xl font-bold tracking-tight">HS-Manager</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem active={activeTab === 'overview'} icon={<LayoutDashboard size={20} />} label="Utama (Dashboard)" onClick={() => setActiveTab('overview')} />
          <NavItem active={activeTab === 'packages'} icon={<PackageIcon size={20} />} label="Pengurusan Kunci" onClick={() => setActiveTab('packages')} />
          <NavItem active={activeTab === 'codes'} icon={<Key size={20} />} label="Log & Analitik" onClick={() => setActiveTab('codes')} />
          <NavItem active={activeTab === 'logs'} icon={<Activity size={20} />} label="Tetapan Admin" onClick={() => setActiveTab('logs')} />
          <NavItem active={activeTab === 'settings'} icon={<Settings size={20} />} label="Konfigurasi Lanjut" onClick={() => setActiveTab('settings')} />
        </nav>

        <div className="p-6 border-t border-slate-700 flex items-center gap-3 bg-slate-950/20 backdrop-blur-sm">
          <div className="w-10 h-10 rounded-full bg-slate-600 border border-slate-500 flex items-center justify-center overflow-hidden">
            {auth.currentUser?.photoURL ? <img src={auth.currentUser.photoURL} alt="Admin" /> : <ShieldCheck className="text-blue-400" />}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate leading-tight">Super Admin</p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">System Active</p>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm relative z-10">
          <div className="flex items-center gap-4 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-2">Lokasi: <span className="font-bold text-slate-800">Zon A (Cafeteria)</span></span>
            <span className="text-green-500 flex items-center gap-1.5 font-bold text-[10px] uppercase border border-green-100 bg-green-50 px-2 py-0.5 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> Network Stable
            </span>
          </div>
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-2 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 p-2 rounded-lg"
          >
            <LogOut size={18} />
          </button>
        </header>

        <div className="p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="overview" className="space-y-8 h-full overflow-y-auto pb-20">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Sesi Aktif" value={sessions.filter(s => s.status === 'active').length.toString()} trend="+12% vs semalam" color="text-slate-900" />
                  <StatCard label="Jumlah Pakej" value={packages.length.toString()} trend="Status: Stabil" color="text-slate-900" />
                  <StatCard label="Data Terpakai" value={formatData(sessions.reduce((acc, s) => acc + s.dataUsedMB, 0))} trend="+2.4GB jam ini" color="text-blue-600" />
                  <StatCard label="Kod Tamat" value={sessions.filter(s => s.status === 'expired').length.toString()} trend="Perlu dibersihkan" color="text-slate-400" />
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Sesi Aktif Terkini</h3>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Updates</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="text-[10px] uppercase text-slate-400 font-bold tracking-widest bg-slate-50">
                        <tr>
                          <th className="px-6 py-4">ID Pelanggan / Kod</th>
                          <th className="px-6 py-4">Pakej</th>
                          <th className="px-6 py-4">Status & Kesihatan</th>
                          <th className="px-6 py-4 text-right">Baki Kapasiti</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sessions.slice(0, 8).map(session => (
                          <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-mono text-sm font-bold text-blue-600">{session.code}</div>
                                <div className="text-[10px] text-slate-400 font-medium">HS-ID: {session.id.slice(0,8)}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-sm font-semibold text-slate-700">{session.packageName}</div>
                                <div className="text-[10px] text-slate-400">{session.speedLimitMbps} Mbps Cap</div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    session.status === 'active' ? "bg-green-500" : "bg-slate-300"
                                )}></span>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest",
                                    session.status === 'active' ? "text-green-600" : "text-slate-400"
                                )}>
                                    {session.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-1">Tamat: {format(new Date(session.expiryTime), 'HH:mm dd/MM')}</div>
                            </td>
                            <td className="px-6 py-4 text-right">
                                <div className="text-sm font-mono font-bold text-slate-800">{formatData(session.dataLimitMB - session.dataUsedMB)}</div>
                                <div className="w-24 h-1 bg-slate-100 rounded-full mt-2 ml-auto overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500" 
                                        style={{ width: `${Math.max(0, 100 - (session.dataUsedMB / session.dataLimitMB * 100))}%` }}
                                    ></div>
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

            {activeTab === 'packages' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="packages" className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12"></div>
                    <h3 className="text-xl font-bold mb-6 text-slate-800 relative z-10">Konfigurasi <br/><span className="text-blue-600 underline">Kunci Baharu</span></h3>
                    <form onSubmit={handleAddPackage} className="space-y-6 relative z-10">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1">Nama Pakej (Label)</label>
                        <input 
                          type="text" 
                          required 
                          className="w-full px-5 py-4 border-2 border-slate-100 rounded-2xl bg-slate-50 text-slate-800 font-bold focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                          value={newPackage.name}
                          onChange={e => setNewPackage({...newPackage, name: e.target.value})}
                          placeholder="Standard 5GB"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Data (MB)</label>
                          <input 
                            type="number" 
                            required 
                            className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl bg-slate-50 text-sm font-bold"
                            value={newPackage.dataLimitMB}
                            onChange={e => setNewPackage({...newPackage, dataLimitMB: Number(e.target.value)})}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Speed (Mbps)</label>
                          <input 
                            type="number" 
                            required 
                            className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl bg-slate-50 text-sm font-bold"
                            value={newPackage.speedLimitMbps}
                            onChange={e => setNewPackage({...newPackage, speedLimitMbps: Number(e.target.value)})}
                          />
                        </div>
                      </div>
                      <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-black active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 tracking-widest text-xs">
                        SIMPAN PAKEJ
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] lg:pr-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pl-1 italic">Senarai Pakej Berdaftar</p>
                  {packages.map(pkg => (
                    <div key={pkg.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-500 transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                            <PackageIcon className="text-slate-400 group-hover:text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-lg leading-tight">{pkg.name}</h4>
                            <div className="flex gap-3 mt-1">
                                <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded italic">{formatData(pkg.dataLimitMB)}</span>
                                <span className="text-[10px] font-bold text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded italic">{pkg.speedLimitMbps} Mbps</span>
                            </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Pricing</p>
                          <p className="text-xl font-black text-slate-900 tracking-tighter">RM {pkg.price.toFixed(2)}</p>
                        </div>
                        <button onClick={async () => await deleteDoc(doc(db, 'packages', pkg.id))} className="p-3 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                          <Trash2 size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'codes' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="codes" className="space-y-8">
                <div className="bg-slate-900 p-10 rounded-[40px] shadow-2xl relative overflow-hidden text-white">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
                  <h3 className="text-3xl font-black mb-8 tracking-tighter">Penjanaan <br/><span className="text-blue-400 italic underline decoration-blue-500/30">Baucar Hotspot</span></h3>
                  <div className="flex flex-col sm:flex-row gap-6 items-end relative z-10">
                    <div className="flex-1 space-y-3 w-full">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Pilih Pelan Langganan</label>
                      <select 
                        className="w-full px-6 py-5 border-2 border-slate-700 rounded-3xl bg-slate-800 text-white font-bold focus:ring-4 focus:ring-blue-500/20 outline-none transition-all cursor-pointer appearance-none shadow-inner"
                        value={selectedPackageId}
                        onChange={e => setSelectedPackageId(e.target.value)}
                      >
                        <option value="">-- Senarai Pakej --</option>
                        {packages.map(pkg => (
                          <option key={pkg.id} value={pkg.id}>{pkg.name} | RM {pkg.price}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      onClick={handleGenerateCode}
                      disabled={!selectedPackageId}
                      className="w-full sm:w-auto bg-blue-500 hover:bg-blue-400 disabled:opacity-30 text-white font-black px-14 py-5 rounded-3xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 tracking-widest text-xs"
                    >
                      GENERATE NOW
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {sessions.filter(s => s.status === 'active').map(session => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={session.id} 
                      className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-xl hover:border-blue-200 transition-all"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                        <Wifi size={80} />
                      </div>
                      <div className="mb-6">
                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-2">{session.packageName}</p>
                        <div className="flex items-center gap-2">
                            <h4 className="text-2xl font-mono font-black text-slate-900 tracking-tighter select-all cursor-copy" onClick={() => {
                                navigator.clipboard.writeText(session.code);
                                alert('Kod disalin!');
                            }} group-hover:text-blue-600 transition-colors>{session.code}</h4>
                        </div>
                      </div>
                      
                      <div className="space-y-4 pt-6 border-t border-slate-50 italic">
                        <div className="flex justify-between items-center bg-slate-50 p-3 rounded-2xl">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Key:</span>
                          <span className="text-xs font-mono font-black text-slate-900">{session.secretKey}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Cap</p>
                                <p className="text-xs font-bold text-slate-700">{formatData(session.dataLimitMB)}</p>
                            </div>
                            <div className="text-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[9px] font-black text-slate-300 uppercase mb-1">Usage</p>
                                <p className="text-xs font-bold text-blue-600">{formatData(session.dataUsedMB)}</p>
                            </div>
                        </div>
                      </div>

                      <div className="mt-8 flex gap-3">
                        <button onClick={() => resetSession(session.id)} className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Reset</button>
                        <button onClick={async () => await updateDoc(doc(db, 'sessions', session.id), { status: 'expired' })} className="flex-1 bg-red-50 hover:bg-red-100 text-red-500 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">Remove</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} key="settings" className="max-w-4xl space-y-10 pb-20">
                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200 flex flex-col md:flex-row gap-12">
                  <div className="md:w-1/3">
                    <h3 className="text-xl font-black text-slate-800 tracking-tighter mb-2 italic">Dashboard Control</h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">Kawalan hebahan mesej dan sekatan aplikasi masa nyata untuk semua pengguna.</p>
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-3">Broadcast Announcement</label>
                        <textarea 
                          className="w-full px-6 py-5 border-2 border-slate-50 rounded-3xl bg-slate-50 text-slate-800 font-medium focus:ring-4 focus:ring-blue-100 outline-none transition-all h-32 text-sm italic"
                          placeholder="Mesej kepada semua..."
                          value={broadcastMsg}
                          onChange={e => setBroadcastMsg(e.target.value)}
                        />
                    </div>
                    <button 
                      onClick={handleUpdateSettings}
                      disabled={!broadcastMsg}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-black py-5 rounded-3xl shadow-xl shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-3 tracking-widest text-[10px] uppercase"
                    >
                      <Send size={18} />
                      PUSH TO DEVICES
                    </button>
                    {settings && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Status: <span className="text-green-600">Active Broadcast</span></span>
                            <span className="text-[10px] text-slate-300 italic">{format(new Date(settings.updatedAt), 'HH:mm')}</span>
                        </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-10">
                        <div>
                            <h3 className="text-xl font-black text-slate-800 tracking-tighter italic">Application Guard</h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Whitelisted Ecosystem</p>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-2xl">
                            <AppWindow className="text-blue-600" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {['WhatsApp', 'Facebook', 'Browser', 'YouTube', 'TikTok', 'Instagram', 'Netfix', 'Gaming'].map(app => (
                            <label key={app} className="relative group cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="peer hidden"
                                    checked={settings?.allowedApps?.includes(app)}
                                    onChange={async (e) => {
                                        const current = settings?.allowedApps || [];
                                        const updated = e.target.checked 
                                            ? [...current, app]
                                            : current.filter(a => a !== app);
                                        await setDoc(doc(db, 'settings', 'global'), { ...settings, allowedApps: updated, updatedAt: new Date().toISOString() });
                                    }}
                                />
                                <div className="flex items-center justify-center h-20 border-2 border-slate-50 rounded-[28px] bg-slate-50 text-slate-400 font-bold text-xs peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-500 peer-checked:shadow-xl transition-all peer-checked:scale-[1.02]">
                                    {app}
                                </div>
                            </label>
                        ))}
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

function NavItem({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 flex items-center gap-3 rounded-lg cursor-pointer transition-all duration-200 w-full group text-left",
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
          : "text-slate-400 hover:bg-slate-800 hover:text-white"
      )}
    >
      <span className={cn("transition-colors", active ? "text-white" : "text-slate-500 group-hover:text-slate-300")}>{icon}</span>
      <span className="text-sm font-medium tracking-tight">{label}</span>
    </button>
  );
}

function StatCard({ label, value, trend, color }: { label: string, value: string, trend: string, color: string }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md group">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-2xl font-bold tracking-tight", color)}>{value}</p>
      <div className={cn(
        "text-[10px] font-bold mt-2 flex items-center gap-1",
        trend.includes('+') ? "text-green-600" : trend.includes('baucar') ? "text-blue-600" : "text-slate-500 underline decoration-slate-200 underline-offset-4"
      )}>
        {trend}
      </div>
    </div>
  );
}
