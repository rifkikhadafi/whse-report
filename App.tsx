import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { 
  LayoutDashboard, 
  Calendar, 
  Package, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowLeftRight,
  Users, 
  Truck, 
  Fuel, 
  Activity as ActivityIcon, 
  TrendingUp,
  PenLine,
  Download,
  Loader2,
  AlertCircle,
  Plus,
  Save,
  Trash2,
  CheckCircle2,
  Database,
  MoveRight
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { supabase } from './supabase';
import { SiteData, FuelData, Activity, RigMove } from './types';
import { sites as initialSites, fuelData as initialFuelData } from './mockData';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('id-ID').format(value);
};

// --- Shared Components ---

const SectionHeader: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode }> = ({ title, subtitle, icon }) => (
  <div className="flex items-center gap-3 mb-4 pdf-flex-row">
    <div className="p-2 bg-slate-900 text-white rounded-lg flex-shrink-0 pdf-shift-down">
      {icon}
    </div>
    <div className="flex flex-col justify-center">
      <h2 className="text-base font-semibold text-slate-900 leading-tight m-0 p-0 pdf-no-clip">{title}</h2>
      {subtitle && <p className="text-[10px] text-slate-500 mt-0.5 font-medium m-0 p-0 pdf-no-clip">{subtitle}</p>}
    </div>
  </div>
);

const ChartCard: React.FC<{ children: React.ReactNode; title?: string; subtitle?: string; icon?: React.ReactNode; className?: string }> = ({ children, title, subtitle, icon, className = "" }) => (
  <div className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col ${className} pdf-container`}>
    {title && icon && <SectionHeader title={title} subtitle={subtitle} icon={icon} />}
    <div className="w-full flex-1 flex flex-col pdf-overflow-visible">
      {children}
    </div>
  </div>
);

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend?: string; trendClassName?: string; subtitle?: string }> = ({ title, value, icon, trend, trendClassName, subtitle }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col transition-all hover:shadow-md h-full pdf-container">
    <div className="flex items-center justify-between mb-8 pdf-flex-row">
      <div className="p-3 bg-slate-50 rounded-xl pdf-shift-down">{icon}</div>
      {trend && (
        <div className={`flex items-center justify-center text-[11px] font-bold px-3 py-1 rounded-full h-7 shadow-sm pdf-shift-down ${trendClassName || 'text-slate-600 bg-slate-50'}`}>
          <span className="pdf-no-clip">{trend}</span>
        </div>
      )}
    </div>
    <div className="flex flex-col space-y-1">
      <p className="text-sm font-medium text-slate-500 m-0 p-0 pdf-no-clip">{title}</p>
      {subtitle && <p className="text-[10px] text-slate-400 font-medium m-0 p-0 pdf-no-clip">{subtitle}</p>}
      <h3 className="text-xl font-bold text-slate-900 tabular-nums m-0 p-0 truncate pdf-no-clip pdf-val-fix" title={value}>{value}</h3>
    </div>
  </div>
);

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'input'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const [sites, setSites] = useState<SiteData[]>([]);
  const [fuelData, setFuelData] = useState<FuelData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rigMoves, setRigMoves] = useState<RigMove[]>([]);

  const [localSites, setLocalSites] = useState<SiteData[]>([]);
  const [localFuel, setLocalFuel] = useState<FuelData[]>([]);
  const [localActs, setLocalActs] = useState<Activity[]>([]);
  const [localRigMoves, setLocalRigMoves] = useState<RigMove[]>([]);

  const fetchData = async (date: string) => {
    if (!date) return;
    setIsLoading(true);
    setError(null);
    try {
      const [sRes, fRes, aRes, rRes] = await Promise.all([
        supabase.from('sites').select('*').eq('date', date).order('name'),
        supabase.from('fuel_data').select('*').eq('date', date).order('name'),
        supabase.from('activities').select('*').eq('date', date).order('site'),
        supabase.from('rig_moves').select('*').eq('date', date).order('site')
      ]);

      if (sRes.error || fRes.error || aRes.error || rRes.error) {
        throw new Error("Gagal mengambil data dari database.");
      }

      const siteNames = ['PHSS', 'SANGASANGA', 'SANGATTA', 'TANJUNG', 'ZONA 9'];

      if (sRes.data && sRes.data.length > 0) {
        setSites(sRes.data);
        setLocalSites(JSON.parse(JSON.stringify(sRes.data)));
      } else {
        setSites([]);
        setLocalSites(initialSites.map(s => ({ ...s, issued: 0, received: 0, stock: 0, pob: 0 })));
      }
      
      if (fRes.data && fRes.data.length > 0) {
        setFuelData(fRes.data);
        setLocalFuel(JSON.parse(JSON.stringify(fRes.data)));
      } else {
        setFuelData([]);
        setLocalFuel(initialFuelData.map(f => ({ ...f, biosolar: 0, pertalite: 0, pertadex: 0 })));
      }

      if (aRes.data && aRes.data.length > 0) {
        setActivities(aRes.data);
        setLocalActs(JSON.parse(JSON.stringify(aRes.data)));
      } else {
        setActivities([]);
        setLocalActs(siteNames.map(name => ({ site: name, items: [] })));
      }

      if (rRes.data && rRes.data.length > 0) {
        setRigMoves(rRes.data);
        setLocalRigMoves(JSON.parse(JSON.stringify(rRes.data)));
      } else {
        setRigMoves([]);
        setLocalRigMoves([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg);
    else setSuccessMsg(msg);
    setTimeout(() => { setError(null); setSuccessMsg(null); }, 3000);
  };

  const handleBulkSave = async () => {
    setIsSaving(true);
    try {
      const siteUpdates = localSites.map(s => ({
        name: s.name, issued: s.issued, received: s.received, stock: s.stock, pob: s.pob, color: s.color, date: selectedDate
      }));
      const { error: sErr } = await supabase.from('sites').upsert(siteUpdates, { onConflict: 'name,date' });

      const fuelUpdates = localFuel.map(f => ({
        name: f.name, biosolar: f.biosolar, pertalite: f.pertalite, pertadex: f.pertadex, date: selectedDate
      }));
      const { error: fErr } = await supabase.from('fuel_data').upsert(fuelUpdates, { onConflict: 'name,date' });

      const actUpdates = localActs.map(a => ({
        site: a.site, items: a.items, date: selectedDate
      }));
      const { error: aErr } = await supabase.from('activities').upsert(actUpdates, { onConflict: 'site,date' });

      await supabase.from('rig_moves').delete().eq('date', selectedDate);
      if (localRigMoves.length > 0) {
        const rigUpdates = localRigMoves.map(rm => ({
          site: rm.site, rig_name: rm.rig_name, from_loc: rm.from_loc, to_loc: rm.to_loc, date: selectedDate
        }));
        await supabase.from('rig_moves').insert(rigUpdates);
      }

      if (sErr || fErr || aErr) throw new Error("Gagal menyimpan ke database.");

      showToast('Data berhasil disimpan!');
      await fetchData(selectedDate);
    } catch (err: any) {
      showToast('Error: ' + err.message, true);
    } finally {
      setIsSaving(false);
    }
  };

  const isSiteSaved = (siteName: string) => {
    const dbSite = sites.find(s => s.name === siteName);
    const uiSite = localSites.find(s => s.name === siteName);
    const dbFuel = fuelData.find(f => f.name === siteName);
    const uiFuel = localFuel.find(f => f.name === siteName);
    const dbAct = activities.find(a => a.site === siteName);
    const uiAct = localActs.find(a => a.site === siteName);
    const dbRigs = rigMoves.filter(r => r.site === siteName);
    const uiRigs = localRigMoves.filter(r => r.site === siteName);

    if (!dbSite || !uiSite || !dbFuel || !uiFuel) return false;

    const siteMatches = dbSite.issued === uiSite.issued && dbSite.received === uiSite.received && 
                        dbSite.stock === uiSite.stock && dbSite.pob === uiSite.pob;
    const fuelMatches = dbFuel.biosolar === uiFuel.biosolar && dbFuel.pertalite === uiFuel.pertalite && 
                        dbFuel.pertadex === uiFuel.pertadex;
    const actMatches = JSON.stringify(dbAct?.items || []) === JSON.stringify(uiAct?.items || []);
    const rigMatches = JSON.stringify(dbRigs) === JSON.stringify(uiRigs);

    return siteMatches && fuelMatches && actMatches && rigMatches;
  };

  const updateLocalSite = (name: string, field: keyof SiteData, value: any) => {
    setLocalSites(prev => prev.map(s => s.name === name ? { ...s, [field]: value } : s));
  };

  const updateLocalFuel = (name: string, field: keyof FuelData, value: any) => {
    setLocalFuel(prev => prev.map(f => f.name === name ? { ...f, [field]: value } : f));
  };

  const addLocalActivity = (siteName: string) => {
    setLocalActs(prev => prev.map(a => a.site === siteName ? { ...a, items: [...a.items, { category: 'Warehouse', description: '' }] } : a));
  };

  const updateLocalActivity = (siteName: string, itemIdx: number, field: 'category' | 'description', value: string) => {
    setLocalActs(prev => prev.map(a => {
      if (a.site === siteName) {
        const newItems = [...a.items];
        newItems[itemIdx] = { ...newItems[itemIdx], [field]: value };
        return { ...a, items: newItems };
      }
      return a;
    }));
  };

  const deleteLocalActivity = (siteName: string, itemIdx: number) => {
    setLocalActs(prev => prev.map(a => a.site === siteName ? { ...a, items: a.items.filter((_, i) => i !== itemIdx) } : a));
  };

  const addLocalRigMove = (siteName: string) => {
    setLocalRigMoves(prev => [...prev, { site: siteName, rig_name: '', from_loc: '', to_loc: '' }]);
  };

  const updateLocalRigMove = (siteName: string, rigIdx: number, field: keyof RigMove, value: string) => {
    const siteRigs = localRigMoves.filter(r => r.site === siteName);
    const targetRig = siteRigs[rigIdx];
    setLocalRigMoves(prev => {
      const globalIdx = prev.indexOf(targetRig);
      const newMoves = [...prev];
      newMoves[globalIdx] = { ...newMoves[globalIdx], [field]: value };
      return newMoves;
    });
  };

  const deleteLocalRigMove = (siteName: string, rigIdx: number) => {
    const siteRigs = localRigMoves.filter(r => r.site === siteName);
    const targetRig = siteRigs[rigIdx];
    setLocalRigMoves(prev => prev.filter(r => r !== targetRig));
  };

  const dashboardStats = useMemo(() => {
    if (sites.length === 0) return null;
    return {
      totalStockValue: sites.reduce((acc, curr) => acc + curr.stock, 0),
      totalGoodIssue: sites.reduce((acc, curr) => acc + (curr.issued || 0), 0),
      totalGoodReceive: sites.reduce((acc, curr) => acc + (curr.received || 0), 0),
      totalPOB: sites.reduce((acc, curr) => acc + (curr.pob || 0), 0),
      totalBiosolar: fuelData.reduce((acc, curr) => acc + (curr.biosolar || 0), 0),
      totalPertalite: fuelData.reduce((acc, curr) => acc + (curr.pertalite || 0), 0),
      totalPertadex: fuelData.reduce((acc, curr) => acc + (curr.pertadex || 0), 0),
      grandTotalFuel: fuelData.reduce((acc, curr) => acc + (curr.biosolar || 0) + (curr.pertalite || 0) + (curr.pertadex || 0), 0),
      totalRigMoves: rigMoves.length
    };
  }, [sites, fuelData, rigMoves]);

  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return;
    setIsDownloading(true);
    setProgress('Mengekspor Laporan...');
    try {
      await new Promise(r => setTimeout(r, 1000));
      const canvas = await html2canvas(dashboardRef.current, { scale: 2, useCORS: true, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Zona9_Report_${selectedDate}.pdf`);
    } catch (e) { showToast('Gagal download PDF', true); }
    finally { setIsDownloading(false); setProgress(''); }
  };

  const formattedSelectedDate = new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleNumericFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="min-h-screen flex bg-slate-50/50 overflow-hidden font-inter">
      {(error || successMsg) && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right duration-300 ${error ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
          {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-bold text-sm">{error || successMsg}</span>
        </div>
      )}

      {isDownloading && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white">
          <Loader2 className="w-16 h-16 text-indigo-400 animate-spin mb-6" />
          <h2 className="text-2xl font-black mb-2 tracking-tight">Mengekspor Laporan</h2>
          <p className="text-slate-300 font-medium">{progress}</p>
        </div>
      )}

      <aside className="hidden lg:flex flex-col w-24 bg-slate-900 text-slate-400 h-screen sticky top-0 no-print">
        <div className="py-8 flex flex-col items-center">
          <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-indigo-500/20">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <nav className="flex-1 w-full flex flex-col items-center space-y-4 px-2">
            <button onClick={() => setActiveView('dashboard')} className={`group w-full aspect-square flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all ${activeView === 'dashboard' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              <LayoutDashboard size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Daily</span>
            </button>
            <button onClick={() => setActiveView('input')} className={`group w-full aspect-square flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all ${activeView === 'input' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}>
              <PenLine size={20} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Input</span>
            </button>
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto h-screen p-4 lg:p-10 scroll-smooth" ref={dashboardRef}>
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-50">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight pdf-no-clip">Warehouse Operation Zona 9</h1>
            <div className="flex items-center gap-4 mt-1.5">
              <div className="flex items-center gap-2 text-slate-500 font-semibold pdf-overflow-visible">
                <Calendar size={16} className="text-indigo-500 pdf-shift-down" />
                <span className="text-sm pdf-no-clip">Laporan Harian • {formattedSelectedDate}</span>
              </div>
              <div className="flex items-center gap-2 no-print relative">
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
                />
              </div>
              {isLoading && <Loader2 size={14} className="animate-spin text-indigo-400 ml-2" />}
            </div>
          </div>
          <div className="flex items-center gap-3 no-print">
            {activeView === 'dashboard' ? (
              <button onClick={handleDownloadPDF} disabled={isDownloading || !dashboardStats} className={`flex items-center justify-center gap-2 px-6 h-11 text-white rounded-xl shadow-xl transition-all active:scale-95 font-bold text-sm ${!dashboardStats ? 'bg-slate-300' : 'bg-slate-900 hover:bg-slate-800'}`}>
                <Download size={18} />
                <span>Download PDF</span>
              </button>
            ) : (
              <button onClick={handleBulkSave} disabled={isSaving} className="flex items-center justify-center gap-2 px-8 h-11 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all font-black text-sm uppercase tracking-widest">
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                <span>Simpan Database</span>
              </button>
            )}
          </div>
        </header>

        {activeView === 'dashboard' ? (
          dashboardStats ? (
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 animate-in fade-in duration-700">
              <div className="xl:col-span-3 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard title="Total Good Issue" value={formatCurrency(dashboardStats.totalGoodIssue)} icon={<ArrowUpRight size={24} className="text-emerald-500" />} trend="-1.8%" trendClassName="bg-emerald-50 text-emerald-600" />
                  <StatCard title="Total Good Receive" value={formatCurrency(dashboardStats.totalGoodReceive)} icon={<ArrowDownLeft size={24} className="text-rose-500" />} trend="+0.5%" trendClassName="bg-rose-50 text-rose-600" />
                  <StatCard title="Total Stock Value" value={formatCurrency(dashboardStats.totalStockValue)} icon={<Package size={24} className="text-slate-600" />} trend="+2.4%" trendClassName="bg-rose-50 text-rose-600" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <ChartCard title="Good Issue & Receive" subtitle="Distribusi per Lokasi" icon={<ArrowLeftRight size={18} />}>
                    <div className="flex flex-col h-[280px]">
                      <div className="flex items-center px-2 py-2 mb-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        <span className="w-[40%] text-left">Location</span>
                        <span className="w-[30%] text-center">Good Issue</span>
                        <span className="w-[30%] text-center">Good Receive</span>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
                        {sites.map((site, index) => (
                          <div key={index} className="flex items-center px-2 py-3 hover:bg-slate-50 rounded-xl border-b border-slate-50 last:border-0 transition-colors">
                            <div className="w-[40%] flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: site.color || '#cbd5e1' }}></span>
                              <span className="text-xs font-bold text-slate-700 truncate">{site.name}</span>
                            </div>
                            <div className="w-[30%] text-center font-semibold text-emerald-600 text-xs tabular-nums">{site.issued > 0 ? formatCurrency(site.issued) : '-'}</div>
                            <div className="w-[30%] text-center font-semibold text-rose-600 text-xs tabular-nums">{site.received > 0 ? formatCurrency(site.received) : '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>
                  <ChartCard title="Komposisi Stok" subtitle="Nilai Warehouse per Area" icon={<TrendingUp size={18} />}>
                    <div className="flex flex-col h-full gap-4">
                      <div className="w-full h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={sites.filter(s => s.stock > 0)} innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="stock" nameKey="name" isAnimationActive={false}>
                              {sites.filter(s => s.stock > 0).map((entry, index) => <Cell key={index} fill={entry.color || '#94a3b8'} stroke="none" />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full space-y-3 pt-2">
                        {sites.filter(s => s.stock > 0).map((site, index) => (
                          <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: site.color || '#cbd5e1' }}></div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{site.name}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-900 tabular-nums">{formatCurrency(site.stock)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ChartCard>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <ChartCard title="Person on Board" icon={<Users size={18} />} className="md:col-span-1">
                    <div className="h-[210px] space-y-3 pr-1 overflow-y-auto custom-scrollbar">
                      {sites.map((site) => (
                        <div key={site.name} className="flex flex-col">
                          <div className="flex items-center gap-2 mb-0.5">
                            <div className="w-1.5 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: site.color || '#cbd5e1' }}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate">{site.name}</span>
                          </div>
                          <span className="text-[12px] font-bold text-slate-900 ml-3.5 tabular-nums">{site.pob}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col items-center pt-8 border-t border-slate-100 mt-4">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total POB</h3>
                      <div className="relative w-28 h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={sites} innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="pob" isAnimationActive={false} stroke="none">
                              {sites.map((entry, index) => <Cell key={index} fill={entry.color || '#cbd5e1'} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-lg font-black text-slate-900">{dashboardStats.totalPOB}</span>
                        </div>
                      </div>
                    </div>
                  </ChartCard>
                  <ChartCard title="Support Rig Move" icon={<Truck size={18} />} className="md:col-span-1">
                    <div className="h-[210px] space-y-3 pr-1 overflow-y-auto custom-scrollbar">
                      {rigMoves.length > 0 ? (
                        rigMoves.map((rm, idx) => (
                          <div key={idx} className="flex flex-col border-b border-slate-50 pb-2 last:border-0 mb-2">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-1.5 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sites.find(s => s.name === rm.site)?.color || '#cbd5e1' }}></div>
                              <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate">{rm.rig_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium ml-3.5">
                              <span className="truncate">{rm.from_loc}</span>
                              <MoveRight size={10} className="text-indigo-400 shrink-0" />
                              <span className="truncate">{rm.to_loc}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full opacity-20">
                          <Truck size={32} />
                          <span className="text-[10px] font-bold uppercase mt-2">No Movement</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-center pt-8 border-t border-slate-100 mt-4">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TOTAL MOVE</h3>
                      <div className="relative w-28 h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[{ value: rigMoves.length || 1 }]} innerRadius={30} outerRadius={45} dataKey="value" isAnimationActive={false} stroke="none">
                              <Cell fill={rigMoves.length > 0 ? "#6366f1" : "#f1f5f9"} />
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-lg font-black text-slate-900">{dashboardStats.totalRigMoves}</span>
                        </div>
                      </div>
                    </div>
                  </ChartCard>
                  <ChartCard title="BBM Consumption" icon={<Fuel size={18} />} className="md:col-span-2">
                    <div className="min-h-[210px] flex flex-col justify-between">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-5 px-1 w-full">
                        {fuelData.map((data) => (
                          <div key={data.name} className="flex flex-col">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-1.5 h-3 rounded-full shrink-0" style={{ backgroundColor: sites.find(s => s.name === data.name)?.color || '#94a3b8' }}></div>
                              <span className="text-[10px] font-bold text-slate-500 uppercase truncate">{data.name}</span>
                            </div>
                            <div className="flex gap-4 ml-3.5 tabular-nums">
                              <div className="flex flex-col">
                                <span className="text-slate-400 font-bold uppercase text-[8px]">Bio</span>
                                <span className="text-[12px] font-bold text-slate-900 leading-none">{formatNumber(data.biosolar)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-slate-400 font-bold uppercase text-[8px]">Pert</span>
                                <span className="text-[12px] font-bold text-slate-900 leading-none">{formatNumber(data.pertalite)}</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-slate-400 font-bold uppercase text-[8px]">Dex</span>
                                <span className="text-[12px] font-bold text-slate-900 leading-none">{formatNumber(data.pertadex)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col items-center py-4 border-t border-slate-50 bg-slate-50/30 rounded-xl mt-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5">Total Konsumsi</span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xl font-black text-indigo-600 leading-none tabular-nums">{formatNumber(dashboardStats.grandTotalFuel)}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">LITER</span>
                        </div>
                      </div>
                    </div>
                  </ChartCard>
                </div>
              </div>
              <div className="xl:col-span-2">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 h-full p-8 flex flex-col">
                  <SectionHeader title="Daily Activity Log" subtitle="Update operasional detail" icon={<ActivityIcon size={18} />} />
                  <div className="flex-1 space-y-6 overflow-y-auto max-h-[1100px] custom-scrollbar pr-2 mt-4">
                    {activities.length > 0 ? (
                      activities.map((act, i) => (
                        <div key={i} className="space-y-3">
                          <div className="flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur-sm py-1.5 z-10 border-b border-slate-50">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: sites.find(s => s.name === act.site)?.color || '#94a3b8' }}></div>
                            <h4 className="text-sm font-bold text-slate-900 tracking-tight">{act.site}</h4>
                            <span className="ml-auto text-[9px] font-bold text-slate-300 uppercase tracking-widest">{act.items.length} KEGIATAN</span>
                          </div>
                          <div className="space-y-3 px-1">
                            {act.items.map((item, j) => (
                              <div key={j} className="relative pl-5 py-1">
                                <div className="absolute left-0 top-[12px] w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5">{item.category}</span>
                                  <p className="text-sm text-slate-600 leading-relaxed font-medium">{item.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 opacity-40">
                         <ActivityIcon size={40} className="text-slate-300 mb-2" />
                         <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Belum ada aktivitas</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
               <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-6 border border-slate-200 shadow-inner">
                  <Database size={56} className="text-slate-300" />
               </div>
               <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Data Belum Tersedia</h2>
               <p className="text-slate-500 font-medium text-center max-w-md mb-8">
                  Belum ada laporan untuk tanggal <span className="text-indigo-600 font-bold">{formattedSelectedDate}</span>. 
               </p>
               <button onClick={() => setActiveView('input')} className="flex items-center gap-2 px-8 h-12 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 transition-all font-black text-sm uppercase tracking-widest active:scale-95">
                  <PenLine size={18} />
                  <span>Update Data Sekarang</span>
               </button>
            </div>
          )
        ) : (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden mb-10">
              <div className="bg-slate-900 p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
                    <PenLine size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">Input Laporan Operasional</h2>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Update data tanggal {formattedSelectedDate}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48">Site Details</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100 w-64">Warehouse (IDR)</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100 w-56">BBM (L)</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100 w-24">POB</th>
                      <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100">Rig Movement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['PHSS', 'SANGASANGA', 'SANGATTA', 'TANJUNG', 'ZONA 9'].map((siteName) => {
                      const s = localSites.find(ls => ls.name === siteName) || { name: siteName, stock: 0, issued: 0, received: 0, pob: 0, color: '#ccc' };
                      const f = localFuel.find(lf => lf.name === siteName) || { name: siteName, biosolar: 0, pertalite: 0, pertadex: 0 };
                      const a = localActs.find(la => la.site === siteName) || { site: siteName, items: [] };
                      const siteRigs = localRigMoves.filter(rm => rm.site === siteName);
                      const saved = isSiteSaved(siteName);
                      return (
                        <React.Fragment key={siteName}>
                          <tr className="group hover:bg-slate-50/50 transition-colors">
                            <td className="p-6 align-top">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-6 rounded-full" style={{ backgroundColor: s.color }}></div>
                                <h3 className="text-lg font-black text-slate-800 tracking-tight flex items-center gap-2">
                                  {siteName}
                                  {saved && <CheckCircle2 size={14} className="text-emerald-500" />}
                                </h3>
                              </div>
                              <input type="text" value={s.color} onChange={e => updateLocalSite(siteName, 'color', e.target.value)} className="px-2 py-1 bg-slate-100 border-none rounded text-[9px] font-bold text-slate-500 outline-none w-20 uppercase" />
                            </td>
                            <td className="p-6 border-l border-slate-100 align-top">
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Stock</label>
                                  <input type="text" value={s.stock === 0 ? '0' : formatNumber(s.stock)} onChange={e => {
                                      const raw = e.target.value.replace(/\D/g, '');
                                      updateLocalSite(siteName, 'stock', raw === '' ? 0 : Number(raw));
                                    }} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Issue</label>
                                    <input type="text" value={s.issued === 0 ? '0' : formatNumber(s.issued)} onChange={e => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        updateLocalSite(siteName, 'issued', raw === '' ? 0 : Number(raw));
                                      }} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-emerald-600 outline-none text-sm" />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Receive</label>
                                    <input type="text" value={s.received === 0 ? '0' : formatNumber(s.received)} onChange={e => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        updateLocalSite(siteName, 'received', raw === '' ? 0 : Number(raw));
                                      }} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-rose-600 outline-none text-sm" />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-6 border-l border-slate-100 align-top">
                              <div className="grid grid-cols-1 gap-4">
                                <input type="number" value={f.biosolar} onChange={e => updateLocalFuel(siteName, 'biosolar', Number(e.target.value))} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm" placeholder="Biosolar" />
                                <div className="grid grid-cols-2 gap-3">
                                  <input type="number" value={f.pertalite} onChange={e => updateLocalFuel(siteName, 'pertalite', Number(e.target.value))} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm" placeholder="Pertalite" />
                                  <input type="number" value={f.pertadex} onChange={e => updateLocalFuel(siteName, 'pertadex', Number(e.target.value))} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm" placeholder="Pertadex" />
                                </div>
                              </div>
                            </td>
                            <td className="p-6 border-l border-slate-100 align-top">
                              <input type="number" value={s.pob} onChange={e => updateLocalSite(siteName, 'pob', Number(e.target.value))} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-slate-900 outline-none text-sm text-center" />
                            </td>
                            <td className="p-6 border-l border-slate-100 align-top">
                              <div className="space-y-3">
                                {siteRigs.map((rm, idx) => (
                                  <div key={idx} className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-white">
                                    <div className="grid grid-cols-3 gap-2 flex-1">
                                      <input type="text" value={rm.rig_name} onChange={e => updateLocalRigMove(siteName, idx, 'rig_name', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none" placeholder="Rig" />
                                      <input type="text" value={rm.from_loc} onChange={e => updateLocalRigMove(siteName, idx, 'from_loc', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none" placeholder="Dari" />
                                      <input type="text" value={rm.to_loc} onChange={e => updateLocalRigMove(siteName, idx, 'to_loc', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none" placeholder="Ke" />
                                    </div>
                                    <button onClick={() => deleteLocalRigMove(siteName, idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                ))}
                                <button onClick={() => addLocalRigMove(siteName)} className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all">
                                  <Plus size={14} /> Tambah Rig Move
                                </button>
                              </div>
                            </td>
                          </tr>
                          <tr className="border-b border-slate-100">
                            <td colSpan={5} className="p-0">
                                <div className="bg-slate-50/50 p-6 flex flex-col gap-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <ActivityIcon size={14} className="text-slate-400" />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Daftar Aktivitas - {siteName}</span>
                                    </div>
                                    <button onClick={() => addLocalActivity(siteName)} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
                                      <Plus size={12} /> Tambah Aktivitas
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {a.items.map((item, idx) => (
                                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3 relative group/log">
                                        <button onClick={() => deleteLocalActivity(siteName, idx)} className="absolute top-2 right-2 p-1.5 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover/log:opacity-100"><Trash2 size={12} /></button>
                                        <input type="text" value={item.category} onChange={e => updateLocalActivity(siteName, idx, 'category', e.target.value)} className="px-2 py-1 bg-slate-50 border-none rounded text-[9px] font-black text-indigo-600 outline-none w-fit uppercase" placeholder="KATEGORI" />
                                        <textarea value={item.description} onChange={e => updateLocalActivity(siteName, idx, 'description', e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium text-slate-600 outline-none resize-none focus:bg-white transition-all" placeholder="Tulis rincian aktivitas di sini..." />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print { .no-print { display: none !important; } }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        
        /* Penting: Membatasi area picker agar tidak overlay tombol lain */
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
          padding: 2px;
        }
      `}</style>
    </div>
  );
};

export default App;