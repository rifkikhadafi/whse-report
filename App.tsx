import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, Pie, Cell, Tooltip
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
  <div className="flex items-center gap-3 mb-4">
    <div className="p-2 bg-slate-900 text-white rounded-lg flex-shrink-0">
      {icon}
    </div>
    <div className="flex flex-col justify-center">
      <h2 className="text-base font-bold text-slate-900 leading-tight m-0 p-0">{title}</h2>
      {subtitle && <p className="text-[10px] text-slate-500 mt-0.5 font-medium m-0 p-0">{subtitle}</p>}
    </div>
  </div>
);

const ChartCard: React.FC<{ children: React.ReactNode; title?: string; subtitle?: string; icon?: React.ReactNode; className?: string }> = ({ children, title, subtitle, icon, className = "" }) => (
  <div className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col ${className}`}>
    {title && icon && <SectionHeader title={title} subtitle={subtitle} icon={icon} />}
    <div className="w-full flex-1 flex flex-col">
      {children}
    </div>
  </div>
);

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend?: string; trendClassName?: string; subtitle?: string }> = ({ title, value, icon, trend, trendClassName, subtitle }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col transition-all hover:shadow-md h-full">
    <div className="flex items-center justify-between mb-8">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      {trend && (
        <div className={`flex items-center justify-center text-[11px] font-bold px-3 py-1 rounded-full h-7 shadow-sm ${trendClassName || 'text-slate-600 bg-slate-50'}`}>
          <span>{trend}</span>
        </div>
      )}
    </div>
    <div className="flex flex-col space-y-1">
      <p className="text-sm font-medium text-slate-500 m-0 p-0">{title}</p>
      {subtitle && <p className="text-[10px] text-slate-400 font-medium m-0 p-0">{subtitle}</p>}
      <h3 className="text-xl font-bold text-slate-900 tabular-nums m-0 p-0 truncate" title={value}>{value}</h3>
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
    setProgress('Mempersiapkan Layout Laporan (Mohon Tunggu)...');
    
    try {
      const mainElement = dashboardRef.current.parentElement;
      if (mainElement) mainElement.scrollTop = 0;
      
      await new Promise(r => setTimeout(r, 1500));

      const element = dashboardRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#f8fafc',
        height: element.scrollHeight,
        width: element.offsetWidth,
        windowWidth: 1440, 
        windowHeight: element.scrollHeight,
        logging: false,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.body.querySelector('[ref="dashboardRef"]') || 
                                clonedDoc.body.querySelector('.p-4.lg\\:p-10');
          
          if (clonedElement) {
            const el = clonedElement as HTMLElement;
            el.style.width = '1440px'; 
            el.style.height = 'auto';
            el.style.overflow = 'visible';
            el.style.padding = '30px'; 
            
            const allText = clonedDoc.querySelectorAll('p, span, h1, h2, h3, h4, div');
            allText.forEach((node: any) => {
              node.style.lineHeight = '1.4';
              node.style.transition = 'none';
              node.style.animation = 'none';
            });

            const scrollables = clonedDoc.querySelectorAll('.overflow-y-auto, .custom-scrollbar');
            scrollables.forEach((s: any) => {
              s.style.overflow = 'visible';
              s.style.height = 'auto';
              s.style.maxHeight = 'none';
            });

            const stickies = clonedDoc.querySelectorAll('.sticky');
            stickies.forEach((s: any) => {
              s.style.position = 'relative';
              s.style.top = '0';
              s.style.zIndex = '1';
            });
          }
        }
      });

      setProgress('Membangun Berkas PDF...');
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [imgWidth, imgHeight],
        hotfixes: ['px_pt']
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      pdf.save(`Zona9_Laporan_Harian_${selectedDate}.pdf`);
      
      showToast('PDF Berhasil Diunduh!');
    } catch (e) {
      console.error('Export Error:', e);
      showToast('Gagal mengunduh PDF', true);
    } finally {
      setIsDownloading(false);
      setProgress('');
    }
  };

  const formattedSelectedDate = new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  const handleNumericFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const rigMovesBySite = useMemo(() => {
    const counts: Record<string, { count: number; color: string }> = {};
    rigMoves.forEach(rm => {
      if (!counts[rm.site]) {
        const siteColor = sites.find(s => s.name === rm.site)?.color || '#cbd5e1';
        counts[rm.site] = { count: 0, color: siteColor };
      }
      counts[rm.site].count += 1;
    });
    return Object.entries(counts).map(([name, data]) => ({
      name,
      value: data.count,
      color: data.color
    }));
  }, [rigMoves, sites]);

  const biosolarSegments = useMemo(() => sites.map(s => ({
    name: s.name,
    value: fuelData.find(f => f.name === s.name)?.biosolar || 0,
    color: s.color
  })).filter(d => d.value > 0), [sites, fuelData]);

  const pertaliteSegments = useMemo(() => sites.map(s => ({
    name: s.name,
    value: fuelData.find(f => f.name === s.name)?.pertalite || 0,
    color: s.color
  })).filter(d => d.value > 0), [sites, fuelData]);

  const pertadexSegments = useMemo(() => sites.map(s => ({
    name: s.name,
    value: fuelData.find(f => f.name === s.name)?.pertadex || 0,
    color: s.color
  })).filter(d => d.value > 0), [sites, fuelData]);

  return (
    <div className="min-h-screen flex bg-slate-50 overflow-hidden font-inter text-slate-900">
      {(error || successMsg) && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border animate-in slide-in-from-right duration-300 ${error ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
          {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-bold text-sm">{error || successMsg}</span>
        </div>
      )}

      {isDownloading && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6">
          <Loader2 className="w-16 h-16 text-indigo-400 animate-spin mb-6" />
          <h2 className="text-2xl font-black mb-2 tracking-tight">Mengekspor Laporan</h2>
          <p className="text-slate-300 font-medium text-center">{progress}</p>
        </div>
      )}

      <aside className="hidden lg:flex flex-col w-24 bg-slate-900 text-slate-400 h-screen sticky top-0 no-print z-50">
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

      <main className="flex-1 overflow-y-auto h-screen scroll-smooth">
        <div className="p-4 lg:p-10 min-h-full max-w-[1600px] mx-auto" ref={dashboardRef}>
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Warehouse Operation Zona 9 Dashboard</h1>
              <div className="flex items-center gap-4 mt-1.5">
                <div className="flex items-center gap-2 text-slate-500 font-semibold">
                  <Calendar size={16} className="text-indigo-500" />
                  <span className="text-sm">Laporan Harian • {formattedSelectedDate}</span>
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
                  <span>Simpan Data</span>
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
                    <StatCard title="Total Stock Value" value={formatCurrency(dashboardStats.totalStockValue)} icon={<Package size={24} className="text-slate-600" />} trend="+2.4%" trendClassName="bg-indigo-50 text-indigo-600" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ChartCard title="Good Issue & Receive" subtitle="All Field Zona 9" icon={<ArrowLeftRight size={18} />}>
                      <div className="flex flex-col h-[280px]">
                        <div className="flex items-center px-2 py-2 mb-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="w-[40%] text-left">Location</span>
                          <span className="w-[30%] text-center">Good Issue</span>
                          <span className="w-[30%] text-center">Good Receive</span>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                          {sites.filter(s => s.name !== 'ZONA 9').map((site, index) => (
                            <div key={index} className="flex items-center px-2 py-3 hover:bg-slate-50 rounded-xl border-b border-slate-50 last:border-0 transition-colors">
                              <div className="w-[40%] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: site.color || '#cbd5e1' }}></span>
                                <span className="text-xs font-bold text-slate-700 truncate">{site.name}</span>
                              </div>
                              <div className="w-[30%] text-center font-bold text-emerald-600 text-xs tabular-nums">{site.issued > 0 ? formatCurrency(site.issued) : '-'}</div>
                              <div className="w-[30%] text-center font-bold text-rose-600 text-xs tabular-nums">{site.received > 0 ? formatCurrency(site.received) : '-'}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ChartCard>
                    <ChartCard title="Stock Value" subtitle="All Field Zona 9" icon={<TrendingUp size={18} />}>
                      <div className="flex flex-col h-full gap-4">
                        <div className="w-full h-[180px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={sites.filter(s => s.stock > 0)} 
                                innerRadius={45} 
                                outerRadius={70} 
                                paddingAngle={4} 
                                dataKey="stock" 
                                nameKey="name" 
                                isAnimationActive={true}
                                labelLine={false}
                                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                              >
                                {sites.filter(s => s.stock > 0).map((entry, index) => <Cell key={index} fill={entry.color || '#94a3b8'} stroke="none" />)}
                              </Pie>
                              <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full space-y-2 pt-2">
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
                    <ChartCard title="POB Status" icon={<Users size={18} />} className="md:col-span-1">
                      <div className="h-[210px] flex flex-col space-y-3 pr-1 overflow-y-auto custom-scrollbar">
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
                      <div className="flex flex-col items-center pt-8 border-t border-slate-100 mt-6">
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
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight truncate">
                                  {rm.site} - {rm.rig_name}
                                </span>
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
                      <div className="flex flex-col items-center pt-8 border-t border-slate-100 mt-6">
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">TOTAL MOVE</h3>
                        <div className="relative w-28 h-28">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie 
                                data={rigMovesBySite.length > 0 ? rigMovesBySite : [{ value: 1, color: '#f1f5f9' }]} 
                                innerRadius={30} 
                                outerRadius={45} 
                                dataKey="value" 
                                isAnimationActive={false} 
                                stroke="none"
                              >
                                {rigMovesBySite.length > 0 ? (
                                  rigMovesBySite.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))
                                ) : (
                                  <Cell fill="#f1f5f9" />
                                )}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-lg font-black text-slate-900">{dashboardStats.totalRigMoves}</span>
                          </div>
                        </div>
                      </div>
                    </ChartCard>

                    <ChartCard title="Fuel Consumption" icon={<Fuel size={18} />} className="md:col-span-2">
                      <div className="flex flex-col h-full">
                        <div className="h-[210px] flex flex-col justify-between overflow-y-auto custom-scrollbar pr-1">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-1 w-full">
                            {fuelData.map((data) => (
                              <div key={data.name} className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-1.5 h-3 rounded-full shrink-0" style={{ backgroundColor: sites.find(s => s.name === data.name)?.color || '#94a3b8' }}></div>
                                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight truncate">{data.name}</span>
                                </div>
                                <div className="flex gap-4 ml-3.5 tabular-nums">
                                  <div className="flex flex-col">
                                    <span className="text-slate-300 font-bold uppercase text-[8px] mb-0.5">BIO</span>
                                    <span className="text-xs font-bold text-slate-900 leading-none">{formatNumber(data.biosolar)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-slate-300 font-bold uppercase text-[8px] mb-0.5">PERT</span>
                                    <span className="text-xs font-bold text-slate-900 leading-none">{formatNumber(data.pertalite)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-slate-300 font-bold uppercase text-[8px] mb-0.5">DEX</span>
                                    <span className="text-xs font-bold text-slate-900 leading-none">{formatNumber(data.pertadex)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-center gap-4 bg-slate-50 py-2 rounded-xl mt-4">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">TOTAL</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-black text-indigo-600 tabular-nums">{formatNumber(dashboardStats.grandTotalFuel)}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">LTR</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col py-5 border-t border-slate-100 mt-6 px-2">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mb-5">SUB-TOTAL FUEL</span>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={biosolarSegments} innerRadius={22} outerRadius={34} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                      {biosolarSegments.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                  <span className="text-[10px] font-bold text-slate-900 leading-none">{formatNumber(dashboardStats.totalBiosolar)}</span>
                                  <span className="text-[6px] font-bold text-slate-400 mt-0.5">L</span>
                                </div>
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 mt-2 uppercase">BIOSOLAR</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={pertaliteSegments} innerRadius={22} outerRadius={34} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                      {pertaliteSegments.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                  <span className="text-[10px] font-bold text-slate-900 leading-none">{formatNumber(dashboardStats.totalPertalite)}</span>
                                  <span className="text-[6px] font-bold text-slate-400 mt-0.5">L</span>
                                </div>
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 mt-2 uppercase">PERTALITE</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-20 h-20 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={pertadexSegments} innerRadius={22} outerRadius={34} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                      {pertadexSegments.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                  <span className="text-[10px] font-bold text-slate-900 leading-none">{formatNumber(dashboardStats.totalPertadex)}</span>
                                  <span className="text-[6px] font-bold text-slate-400 mt-0.5">L</span>
                                </div>
                              </div>
                              <span className="text-[8px] font-bold text-slate-400 mt-2 uppercase">PERTADEX</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </ChartCard>
                  </div>
                </div>

                <div className="xl:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full p-8 flex flex-col">
                    <SectionHeader title="Daily Activity Log" subtitle="Detailed operational updates" icon={<ActivityIcon size={18} />} />
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
                                <div key={j} className="relative pl-5 py-1 group">
                                  <div className="absolute left-0 top-[12px] w-1.5 h-1.5 rounded-full bg-slate-200 group-hover:bg-indigo-500 transition-colors"></div>
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
                           <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
                 <Database size={56} className="text-slate-200 mb-6" />
                 <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Data Tidak Ditemukan</h2>
                 <p className="text-slate-500 font-medium text-center max-w-md mb-8">
                    Tidak ada laporan operasional untuk tanggal <span className="text-indigo-600 font-bold">{formattedSelectedDate}</span>. 
                 </p>
                 <button onClick={() => setActiveView('input')} className="flex items-center gap-2 px-8 h-12 bg-indigo-600 text-white rounded-xl shadow-xl hover:bg-indigo-700 transition-all font-bold text-sm uppercase active:scale-95">
                    <PenLine size={18} />
                    <span>Update Data</span>
                 </button>
              </div>
            )
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-10">
                <div className="bg-slate-900 p-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
                      <PenLine size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">Input Data Operasional</h2>
                      <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">Update data untuk {formattedSelectedDate}</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1400px]">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-40">Site Details</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100 w-[380px]">Warehouse Value (IDR)</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100 w-80">Fuel Usage (L)</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100 w-32">POB</th>
                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-l border-slate-100">Rig Logistics</th>
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
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Total Stock Asset</label>
                                    <input type="text" value={s.stock === 0 ? '0' : formatNumber(s.stock)} onChange={e => {
                                        const raw = e.target.value.replace(/\D/g, '');
                                        updateLocalSite(siteName, 'stock', raw === '' ? 0 : Number(raw));
                                      }} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm focus:ring-2 focus:ring-indigo-500/20" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Good Issue</label>
                                      <input type="text" value={s.issued === 0 ? '0' : formatNumber(s.issued)} onChange={e => {
                                          const raw = e.target.value.replace(/\D/g, '');
                                          updateLocalSite(siteName, 'issued', raw === '' ? 0 : Number(raw));
                                        }} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-emerald-600 outline-none text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Good Receive</label>
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
                                  <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Biosolar</label>
                                    <input type="number" value={f.biosolar} onChange={e => updateLocalFuel(siteName, 'biosolar', Number(e.target.value))} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Pertalite</label>
                                      <input type="number" value={f.pertalite} onChange={e => updateLocalFuel(siteName, 'pertalite', Number(e.target.value))} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                      <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Pertadex</label>
                                      <input type="number" value={f.pertadex} onChange={e => updateLocalFuel(siteName, 'pertadex', Number(e.target.value))} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm" />
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-6 border-l border-slate-100 align-top">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-400 uppercase text-center block">Count</label>
                                  <input type="number" value={s.pob} onChange={e => updateLocalSite(siteName, 'pob', Number(e.target.value))} onFocus={handleNumericFocus} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-black text-slate-900 outline-none text-sm text-center" />
                                </div>
                              </td>
                              <td className="p-6 border-l border-slate-100 align-top">
                                <div className="space-y-3">
                                  {siteRigs.map((rm, idx) => (
                                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-white">
                                      <div className="grid grid-cols-3 gap-2 flex-1">
                                        <input type="text" value={rm.rig_name} onChange={e => updateLocalRigMove(siteName, idx, 'rig_name', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none" placeholder="Rig" />
                                        <input type="text" value={rm.from_loc} onChange={e => updateLocalRigMove(siteName, idx, 'from_loc', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none" placeholder="From" />
                                        <input type="text" value={rm.to_loc} onChange={e => updateLocalRigMove(siteName, idx, 'to_loc', e.target.value)} className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 outline-none" placeholder="To" />
                                      </div>
                                      <button onClick={() => deleteLocalRigMove(siteName, idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  ))}
                                  <button onClick={() => addLocalRigMove(siteName)} className="flex items-center justify-center gap-2 w-full py-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-[10px] font-bold text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-all">
                                    <Plus size={14} /> Add Rig Move
                                  </button>
                                </div>
                              </td>
                            </tr>
                            <tr className="border-b border-slate-100">
                              <td colSpan={5} className="p-0">
                                  <div className="bg-slate-50/30 p-6 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <ActivityIcon size={14} className="text-slate-400" />
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activity Log - {siteName}</span>
                                      </div>
                                      <button onClick={() => addLocalActivity(siteName)} className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm">
                                        <Plus size={12} /> Add Activity
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {a.items.map((item, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col gap-3 relative group/log">
                                          <button onClick={() => deleteLocalActivity(siteName, idx)} className="absolute top-2 right-2 p-1.5 text-slate-200 hover:text-rose-500 transition-all opacity-0 group-hover/log:opacity-100"><Trash2 size={12} /></button>
                                          <input type="text" value={item.category} onChange={e => updateLocalActivity(siteName, idx, 'category', e.target.value)} className="px-2 py-1 bg-slate-50 border-none rounded text-[9px] font-black text-indigo-600 outline-none w-fit uppercase" placeholder="CATEGORY" />
                                          <textarea value={item.description} onChange={e => updateLocalActivity(siteName, idx, 'description', e.target.value)} rows={2} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 outline-none resize-none focus:bg-white transition-all" placeholder="Enter activity details..." />
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
        </div>
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        @media print { .no-print { display: none !important; } }
        input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        input[type="date"]::-webkit-calendar-picker-indicator {
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default App;