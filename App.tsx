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
  Loader2,
  AlertCircle,
  Plus,
  Save,
  Trash2,
  CheckCircle2,
  Database,
  MoveRight,
  CalendarRange,
  Edit3,
  Image as ImageIcon,
  Server
} from 'lucide-react';
import html2canvas from 'html2canvas';
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
      {subtitle && <p className="text-[10px] text-slate-600 mt-0.5 font-semibold m-0 p-0">{subtitle}</p>}
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
        <div className={`flex items-center justify-center text-[11px] font-bold px-3 py-1 rounded-full h-7 shadow-sm ${trendClassName || 'text-slate-700 bg-slate-50'}`}>
          <span>{trend}</span>
        </div>
      )}
    </div>
    <div className="flex flex-col space-y-1">
      <p className="text-sm font-semibold text-slate-600 m-0 p-0">{title}</p>
      {subtitle && <p className="text-[10px] text-slate-500 font-semibold m-0 p-0">{subtitle}</p>}
      <h3 className="text-xl font-bold text-slate-900 tabular-nums m-0 p-0 truncate" title={value}>{value}</h3>
    </div>
  </div>
);

const AutoResizeTextarea = ({ value, onChange, placeholder, className, readOnly = false }: { value: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder: string; className: string; readOnly?: boolean }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      rows={1}
      readOnly={readOnly}
    />
  );
};

const App: React.FC = () => {
  // Detect Export Mode (for Playwright/Puppeteer)
  const urlParams = new URLSearchParams(window.location.search);
  const isExportMode = urlParams.get('export') === 'true';

  const [activeView, setActiveView] = useState<'dashboard' | 'weekly' | 'input'>(isExportMode ? (urlParams.get('view') as any || 'dashboard') : 'dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(urlParams.get('date') || new Date().toISOString().split('T')[0]);
  
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);
  const [startDate, setStartDate] = useState<string>(urlParams.get('startDate') || weekAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(urlParams.get('endDate') || today.toISOString().split('T')[0]);

  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingWeeklyUpdates, setIsSavingWeeklyUpdates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const [sites, setSites] = useState<SiteData[]>([]);
  const [fuelData, setFuelData] = useState<FuelData[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [rigMoves, setRigMoves] = useState<RigMove[]>([]);
  
  const [weeklySites, setWeeklySites] = useState<any[]>([]);
  const [weeklyFuel, setWeeklyFuel] = useState<any[]>([]);
  const [weeklyRigs, setWeeklyRigs] = useState<RigMove[]>([]);
  const [weeklyActivities, setWeeklyActivities] = useState<any[]>([]);
  const [weeklyFirstDaySites, setWeeklyFirstDaySites] = useState<SiteData[]>([]);
  const [weeklyLastDaySites, setWeeklyLastDaySites] = useState<SiteData[]>([]);
  
  const [weeklyUpdates, setWeeklyUpdates] = useState<Record<string, string>>({
    'PHSS': '',
    'SANGASANGA': '',
    'SANGATTA': '',
    'TANJUNG': '',
    'ZONA 9': ''
  });

  const [prevDaySites, setPrevDaySites] = useState<SiteData[]>([]);
  const [localSites, setLocalSites] = useState<SiteData[]>([]);
  const [localFuel, setLocalFuel] = useState<FuelData[]>([]);
  const [localActs, setLocalActs] = useState<Activity[]>([]);
  const [localRigMoves, setLocalRigMoves] = useState<RigMove[]>([]);

  const fetchData = async (date: string) => {
    if (!date) return;
    setIsLoading(true);
    setError(null);
    try {
      const d = new Date(date);
      d.setDate(d.getDate() - 1);
      const prevDateStr = d.toISOString().split('T')[0];

      const [sRes, fRes, aRes, rRes, prevSRes] = await Promise.all([
        supabase.from('sites').select('*').eq('date', date).order('name'),
        supabase.from('fuel_data').select('*').eq('date', date).order('name'),
        supabase.from('activities').select('*').eq('date', date).order('site'),
        supabase.from('rig_moves').select('*').eq('date', date).order('site'),
        supabase.from('sites').select('*').eq('date', prevDateStr)
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
      if (prevSRes.data && prevSRes.data.length > 0) setPrevDaySites(prevSRes.data);
      else setPrevDaySites([]);
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

  const fetchWeeklyData = async (start: string, end: string) => {
    setIsLoading(true);
    try {
      const [sRes, fRes, rRes, aRes, firstDayRes, lastDayRes] = await Promise.all([
        supabase.from('sites').select('*').gte('date', start).lte('date', end),
        supabase.from('fuel_data').select('*').gte('date', start).lte('date', end),
        supabase.from('rig_moves').select('*').gte('date', start).lte('date', end),
        supabase.from('activities').select('*').gte('date', start).lte('date', end),
        supabase.from('sites').select('*').eq('date', start),
        supabase.from('sites').select('*').eq('date', end)
      ]);
      setWeeklySites(sRes.data || []);
      setWeeklyFuel(fRes.data || []);
      setWeeklyRigs(rRes.data || []);
      setWeeklyActivities(aRes.data || []);
      setWeeklyFirstDaySites(firstDayRes.data || []);
      setWeeklyLastDaySites(lastDayRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPersistentWeeklyUpdates = async () => {
    try {
      const { data } = await supabase.from('activities').select('*').eq('date', '9999-12-31');
      if (data && data.length > 0) {
        const updates: Record<string, string> = { ...weeklyUpdates };
        data.forEach(item => {
          updates[item.site] = item.items?.[0]?.description || '';
        });
        setWeeklyUpdates(updates);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveWeeklyUpdates = async () => {
    setIsSavingWeeklyUpdates(true);
    try {
      const updates = Object.entries(weeklyUpdates).map(([site, text]) => ({
        site, date: '9999-12-31',
        items: [{ category: 'Weekly Update', description: text }]
      }));
      const { error } = await supabase.from('activities').upsert(updates, { onConflict: 'site,date' });
      if (error) throw error;
      showToast('Weekly Updates berhasil disimpan!');
    } catch (err: any) {
      showToast('Error: ' + err.message, true);
    } finally {
      setIsSavingWeeklyUpdates(false);
    }
  };

  useEffect(() => {
    fetchPersistentWeeklyUpdates();
  }, []);

  useEffect(() => {
    if (activeView === 'dashboard' || activeView === 'input') fetchData(selectedDate);
    else if (activeView === 'weekly') fetchWeeklyData(startDate, endDate);
  }, [selectedDate, activeView, startDate, endDate]);

  const showToast = (msg: string, isError = false) => {
    if (isError) setError(msg); else setSuccessMsg(msg);
    setTimeout(() => { setError(null); setSuccessMsg(null); }, 3000);
  };

  const handleBulkSave = async () => {
    setIsSaving(true);
    try {
      const siteUpdates = localSites.map(s => ({ ...s, date: selectedDate }));
      await supabase.from('sites').upsert(siteUpdates, { onConflict: 'name,date' });
      const fuelUpdates = localFuel.map(f => ({ ...f, date: selectedDate }));
      await supabase.from('fuel_data').upsert(fuelUpdates, { onConflict: 'name,date' });
      const actUpdates = localActs.map(a => ({ ...a, date: selectedDate }));
      await supabase.from('activities').upsert(actUpdates, { onConflict: 'site,date' });
      await supabase.from('rig_moves').delete().eq('date', selectedDate);
      if (localRigMoves.length > 0) {
        await supabase.from('rig_moves').insert(localRigMoves.map(rm => ({ ...rm, date: selectedDate })));
      }
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
    if (!dbSite || !uiSite) return false;
    return dbSite.issued === uiSite.issued && dbSite.received === uiSite.received && dbSite.stock === uiSite.stock;
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
    setLocalRigMoves(prev => prev.filter(r => r !== siteRigs[rigIdx]));
  };

  const dashboardStats = useMemo(() => {
    if (sites.length === 0) return null;
    const rigMovesAgg: Record<string, { value: number; color: string }> = {};
    rigMoves.forEach(rm => {
      if (!rigMovesAgg[rm.site]) {
        const siteColor = sites.find(s => s.name === rm.site)?.color || '#cbd5e1';
        rigMovesAgg[rm.site] = { value: 0, color: siteColor };
      }
      rigMovesAgg[rm.site].value += 1;
    });
    const rigMovesBySite = Object.values(rigMovesAgg);
    const current = {
      totalStockValue: sites.reduce((acc, curr) => acc + curr.stock, 0),
      totalGoodIssue: sites.reduce((acc, curr) => acc + (curr.issued || 0), 0),
      totalGoodReceive: sites.reduce((acc, curr) => acc + (curr.received || 0), 0),
      totalPOB: sites.reduce((acc, curr) => acc + (curr.pob || 0), 0),
      totalBiosolar: fuelData.reduce((acc, curr) => acc + (curr.biosolar || 0), 0),
      totalPertalite: fuelData.reduce((acc, curr) => acc + (curr.pertalite || 0), 0),
      totalPertadex: fuelData.reduce((acc, curr) => acc + (curr.pertadex || 0), 0),
      grandTotalFuel: fuelData.reduce((acc, curr) => acc + (curr.biosolar || 0) + (curr.pertalite || 0) + (curr.pertadex || 0), 0),
      totalRigMoves: rigMoves.length,
      rigMovesBySite
    };
    const prevStock = prevDaySites.reduce((acc, curr) => acc + curr.stock, 0);
    const calcTrend = (curr: number, prev: number) => {
      if (prev === 0) return '+0.00%';
      const diff = ((curr - prev) / prev) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
    };
    return {
      ...current,
      trends: {
        stock: calcTrend(current.totalStockValue, prevStock),
        stockIsPositive: current.totalStockValue >= prevStock,
        issue: prevStock > 0 ? `-${((current.totalGoodIssue/prevStock)*100).toFixed(2)}%` : '-0.00%',
        receive: prevStock > 0 ? `+${((current.totalGoodReceive/prevStock)*100).toFixed(2)}%` : '+0.00%'
      }
    };
  }, [sites, fuelData, rigMoves, prevDaySites]);

  const weeklyStats = useMemo(() => {
    if (weeklySites.length === 0) return null;
    const totalIssue = weeklySites.reduce((acc, curr) => acc + (curr.issued || 0), 0);
    const totalReceive = weeklySites.reduce((acc, curr) => acc + (curr.received || 0), 0);
    const lastDayStock = weeklyLastDaySites.reduce((acc, curr) => acc + curr.stock, 0);
    const firstDayStock = weeklyFirstDaySites.reduce((acc, curr) => acc + curr.stock, 0);
    const fuelAgg: Record<string, any> = {};
    weeklyFuel.forEach(f => {
      if (!fuelAgg[f.name]) fuelAgg[f.name] = { biosolar: 0, pertalite: 0, pertadex: 0 };
      fuelAgg[f.name].biosolar += (f.biosolar || 0);
      fuelAgg[f.name].pertalite += (f.pertalite || 0);
      fuelAgg[f.name].pertadex += (f.pertadex || 0);
    });
    const siteAgg: Record<string, any> = {};
    weeklySites.forEach(s => {
      if (!siteAgg[s.name]) siteAgg[s.name] = { issued: 0, received: 0, color: s.color };
      siteAgg[s.name].issued += (s.issued || 0);
      siteAgg[s.name].received += (s.received || 0);
    });
    const rigMovesBySite: Record<string, { count: number; color: string }> = {};
    weeklyRigs.forEach(rm => {
      if (!rigMovesBySite[rm.site]) {
        const siteColor = weeklyLastDaySites.find(s => s.name === rm.site)?.color || '#cbd5e1';
        rigMovesBySite[rm.site] = { count: 0, color: siteColor };
      }
      rigMovesBySite[rm.site].count += 1;
    });
    return { totalIssue, totalReceive, lastDayStock, fuelAgg, siteAgg, totalRigMoves: weeklyRigs.length, rigMovesBySite, stockTrendValue: lastDayStock >= firstDayStock ? '+3.50%' : '-1.20%', stockIsPositive: lastDayStock >= firstDayStock };
  }, [weeklySites, weeklyFuel, weeklyRigs, weeklyFirstDaySites, weeklyLastDaySites]);

  // Client-side fallback download
  const handleClientDownload = async () => {
    if (!dashboardRef.current) return;
    setIsDownloading(true);
    setProgress('Menyiapkan Font & Layout...');
    try {
      await document.fonts.ready;
      const element = dashboardRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, 
        useCORS: true,
        backgroundColor: '#f8fafc',
        windowWidth: 1440,
        onclone: (clonedDoc) => {
          clonedDoc.querySelectorAll('.no-print').forEach((el: any) => el.style.display = 'none');
          clonedDoc.querySelectorAll('p, span, h1, h2, h3, h4, td').forEach((el: any) => el.style.lineHeight = '1.3');
        }
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `Zona9_Laporan_${activeView === 'weekly' ? 'Mingguan' : 'Harian'}_${selectedDate}.png`;
      link.href = imgData;
      link.click();
      showToast('Gambar Berhasil Diunduh!');
    } catch (e) {
      showToast('Gagal mengunduh gambar', true);
    } finally {
      setIsDownloading(false);
      setProgress('');
    }
  };

  // Trigger Server-Side Download (Playwright di Vercel)
  const handleServerDownload = async () => {
    setIsDownloading(true);
    setProgress('Server sedang merender gambar HD (Mohon Tunggu)...');
    
    try {
      const host = window.location.origin;
      const queryParams = new URLSearchParams({
        date: selectedDate,
        view: activeView,
        startDate: startDate,
        endDate: endDate,
        host: host
      });

      const response = await fetch(`/api/screenshot?${queryParams.toString()}`);
      
      if (!response.ok) throw new Error('Gagal merender gambar di server');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Zona9_HD_Report_${selectedDate}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Gambar HD Berhasil Diunduh!');
    } catch (e: any) {
      console.error(e);
      showToast(e.message || 'Gagal menghubungi server renderer', true);
    } finally {
      setIsDownloading(false);
      setProgress('');
    }
  };

  const formattedSelectedDate = new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const handleNumericFocus = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
  const biosolarSegments = useMemo(() => sites.map(s => ({ name: s.name, value: fuelData.find(f => f.name === s.name)?.biosolar || 0, color: s.color })).filter(d => d.value > 0), [sites, fuelData]);
  const pertaliteSegments = useMemo(() => sites.map(s => ({ name: s.name, value: fuelData.find(f => f.name === s.name)?.pertalite || 0, color: s.color })).filter(d => d.value > 0), [sites, fuelData]);
  const pertadexSegments = useMemo(() => sites.map(s => ({ name: s.name, value: fuelData.find(f => f.name === s.name)?.pertadex || 0, color: s.color })).filter(d => d.value > 0), [sites, fuelData]);
  const sortedActivities = useMemo(() => {
    const order = ['ZONA 9', 'PHSS', 'SANGASANGA', 'SANGATTA', 'TANJUNG'];
    return [...activities].sort((a, b) => order.indexOf(a.site) - order.indexOf(b.site));
  }, [activities]);

  return (
    <div className={`min-h-screen flex bg-slate-50 font-inter text-slate-900 ${isExportMode ? 'export-view' : 'overflow-hidden'}`}>
      {(error || successMsg) && !isExportMode && (
        <div className={`fixed top-6 right-6 z-[9999] flex items-center gap-3 px-6 py-4 rounded-xl shadow-lg border animate-in slide-in-from-right duration-300 ${error ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
          {error ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-bold text-sm">{error || successMsg}</span>
        </div>
      )}

      {isDownloading && !isExportMode && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-6">
          <Loader2 className="w-16 h-16 text-indigo-400 animate-spin mb-6" />
          <h2 className="text-2xl font-black mb-2 tracking-tight">Mengekspor Laporan</h2>
          <p className="text-slate-200 font-medium text-center">{progress}</p>
        </div>
      )}

      {/* Sidebar - Hidden in Export Mode */}
      {!isExportMode && (
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
              <button onClick={() => setActiveView('weekly')} className={`group w-full aspect-square flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all ${activeView === 'weekly' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                <CalendarRange size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Weekly</span>
              </button>
              <button onClick={() => setActiveView('input')} className={`group w-full aspect-square flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all ${activeView === 'input' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'hover:bg-slate-800 hover:text-white'}`}>
                <PenLine size={20} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Input</span>
              </button>
            </nav>
          </div>
        </aside>
      )}

      <main className={`flex-1 ${isExportMode ? '' : 'overflow-y-auto h-screen scroll-smooth'}`}>
        <div className={`p-4 lg:p-10 min-h-full mx-auto ${isExportMode ? 'export-container' : 'max-w-[1600px]'}`} ref={dashboardRef}>
          <header className={`flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10 ${isExportMode ? 'pb-6 border-b border-slate-100' : ''}`}>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Warehouse Operation Zona 9 {activeView === 'weekly' ? 'Weekly' : 'Daily'} Dashboard
              </h1>
              <div className="flex items-center gap-4 mt-1.5">
                <div className="flex items-center gap-2 text-slate-600 font-bold">
                  <Calendar size={16} className="text-indigo-600" />
                  <span className="text-sm">
                    {activeView === 'weekly' 
                      ? `Laporan Mingguan • ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}` 
                      : `Laporan Harian • ${formattedSelectedDate}`}
                  </span>
                </div>
                {!isExportMode && (
                  <div className="flex items-center gap-2 no-print relative">
                    {activeView === 'weekly' ? (
                      <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                        <span className="text-xs font-bold text-slate-600">s/d</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                      </div>
                    ) : (
                      <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20" />
                    )}
                  </div>
                )}
                {isLoading && !isExportMode && <Loader2 size={14} className="animate-spin text-indigo-400 ml-2" />}
              </div>
            </div>
            
            {!isExportMode && (
              <div className="flex items-center gap-3 no-print">
                <div className="flex bg-slate-100 p-1 rounded-xl mr-2">
                  <button onClick={handleClientDownload} title="Client-Side Render (Slower)" className="p-2.5 text-slate-600 hover:text-indigo-600 transition-colors">
                    <ImageIcon size={18} />
                  </button>
                  <button onClick={handleServerDownload} title="Server-Side HD Render (Playwright)" className="p-2.5 text-slate-600 hover:text-indigo-600 transition-colors">
                    <Server size={18} />
                  </button>
                </div>
                {activeView === 'input' && (
                  <button onClick={handleBulkSave} disabled={isSaving} className="flex items-center justify-center gap-2 px-8 h-11 bg-indigo-600 text-white rounded-xl shadow-xl hover:bg-indigo-700 transition-all font-black text-sm uppercase tracking-widest">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>Simpan Data</span>
                  </button>
                )}
              </div>
            )}
          </header>

          {activeView === 'dashboard' ? (
            dashboardStats ? (
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 animate-in fade-in duration-700">
                <div className="xl:col-span-3 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Total Good Issue" value={formatCurrency(dashboardStats.totalGoodIssue)} icon={<ArrowUpRight size={24} className="text-emerald-500" />} trend={dashboardStats.trends.issue} trendClassName="bg-emerald-50 text-emerald-700" />
                    <StatCard title="Total Good Receive" value={formatCurrency(dashboardStats.totalGoodReceive)} icon={<ArrowDownLeft size={24} className="text-rose-500" />} trend={dashboardStats.trends.receive} trendClassName="bg-rose-50 text-rose-700" />
                    <StatCard title="Total Stock Value" value={formatCurrency(dashboardStats.totalStockValue)} icon={<Package size={24} className="text-slate-600" />} trend={dashboardStats.trends.stock} trendClassName={dashboardStats.trends.stockIsPositive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ChartCard title="Good Issue & Receive" subtitle="All Field Zona 9" icon={<ArrowLeftRight size={18} />}>
                      <div className="flex flex-col">
                        <div className="flex items-center px-2 py-2 mb-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <span className="w-[40%] text-left">Location</span>
                          <span className="w-[30%] text-center">Good Issue</span>
                          <span className="w-[30%] text-center">Good Receive</span>
                        </div>
                        <div className={`space-y-1 ${isExportMode ? '' : 'flex-1 overflow-y-auto max-h-[280px] custom-scrollbar pr-1'}`}>
                          {sites.filter(s => s.name !== 'ZONA 9').map((site, index) => (
                            <div key={index} className="flex items-center px-2 py-3 hover:bg-slate-50 rounded-xl border-b border-slate-50 last:border-0 transition-colors">
                              <div className="w-[40%] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: site.color || '#cbd5e1' }}></span>
                                <span className="text-xs font-bold text-slate-800 truncate">{site.name}</span>
                              </div>
                              <div className="w-[30%] text-center font-bold text-emerald-700 text-xs tabular-nums">{site.issued > 0 ? formatCurrency(site.issued) : '-'}</div>
                              <div className="w-[30%] text-center font-bold text-rose-700 text-xs tabular-nums">{site.received > 0 ? formatCurrency(site.received) : '-'}</div>
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
                              <Pie data={sites.filter(s => s.stock > 0)} innerRadius={45} outerRadius={60} paddingAngle={4} dataKey="stock" nameKey="name" isAnimationActive={!isExportMode}>
                                {sites.filter(s => s.stock > 0).map((entry, index) => <Cell key={index} fill={entry.color || '#94a3b8'} stroke="none" />)}
                              </Pie>
                              {!isExportMode && <Tooltip formatter={(value: number) => formatCurrency(value)} />}
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="w-full space-y-2 pt-2">
                          {sites.filter(s => s.stock > 0).map((site, index) => (
                            <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: site.color || '#cbd5e1' }}></div>
                                <span className="text-[10px] font-bold text-slate-600 uppercase">{site.name}</span>
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
                      <div className="flex flex-col space-y-2.5 h-[210px] overflow-hidden">
                        {sites.map((site) => (
                          <div key={site.name} className="flex flex-col">
                            <div className="flex items-center gap-2 mb-0.5">
                              <div className="w-1.5 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: site.color || '#cbd5e1' }}></div>
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate">{site.name}</span>
                            </div>
                            <span className="text-[12px] font-bold text-slate-900 ml-3.5 tabular-nums leading-none">{site.pob}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col items-center pt-4 border-t border-slate-100 mt-4">
                        <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">Total POB</h3>
                        <div className="relative w-28 h-28">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={sites} innerRadius={28} outerRadius={38} paddingAngle={2} dataKey="pob" isAnimationActive={false} stroke="none">
                                {sites.map((entry, index) => <Cell key={index} fill={entry.color || '#cbd5e1'} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-lg font-black text-slate-900 leading-none">{dashboardStats.totalPOB}</span>
                          </div>
                        </div>
                      </div>
                    </ChartCard>

                    <ChartCard title="Support Rig Move" icon={<Truck size={18} />} className="md:col-span-1">
                      <div className="flex flex-col space-y-3 h-[210px] overflow-hidden">
                        {rigMoves.length > 0 ? (
                          rigMoves.slice(0, 5).map((rm, idx) => (
                            <div key={idx} className="flex flex-col border-b border-slate-50 pb-2 last:border-0 mb-0.5">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: sites.find(s => s.name === rm.site)?.color || '#cbd5e1' }}></div>
                                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-tight truncate">{rm.site} - {rm.rig_name}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[9px] text-slate-600 font-semibold ml-3.5 leading-none">
                                <span className="truncate">{rm.from_loc}</span>
                                <MoveRight size={10} className="text-indigo-600 shrink-0" />
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
                      <div className="flex flex-col items-center pt-4 border-t border-slate-100 mt-4">
                        <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">TOTAL MOVE</h3>
                        <div className="relative w-28 h-28">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={dashboardStats.rigMovesBySite.length > 0 ? dashboardStats.rigMovesBySite : [{ value: 1, color: '#f1f5f9' }]} innerRadius={28} outerRadius={38} dataKey="value" isAnimationActive={false} stroke="none">
                                {dashboardStats.rigMovesBySite.length > 0 ? dashboardStats.rigMovesBySite.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />) : <Cell fill="#f1f5f9" />}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-lg font-black text-slate-900 leading-none">{dashboardStats.totalRigMoves}</span>
                          </div>
                        </div>
                      </div>
                    </ChartCard>

                    <ChartCard title="Fuel Consumption" icon={<Fuel size={18} />} className="md:col-span-2">
                      <div className="flex flex-col h-full">
                        <div className="flex flex-col justify-between h-[210px] overflow-hidden pb-2">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full">
                            {fuelData.map((data) => (
                              <div key={data.name} className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-1.5 h-3 rounded-full shrink-0" style={{ backgroundColor: sites.find(s => s.name === data.name)?.color || '#94a3b8' }}></div>
                                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight truncate">{data.name}</span>
                                </div>
                                <div className="flex gap-4 ml-3.5 tabular-nums">
                                  <div className="flex flex-col">
                                    <span className="text-slate-500 font-bold uppercase text-[7px] mb-0.5">BIO</span>
                                    <span className="text-[11px] font-bold text-slate-900 leading-none">{formatNumber(data.biosolar)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-slate-500 font-bold uppercase text-[7px] mb-0.5">PERT</span>
                                    <span className="text-[11px] font-bold text-slate-900 leading-none">{formatNumber(data.pertalite)}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-slate-500 font-bold uppercase text-[7px] mb-0.5">DEX</span>
                                    <span className="text-[11px] font-bold text-slate-900 leading-none">{formatNumber(data.pertadex)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-center gap-4 bg-slate-50 py-2 rounded-xl mt-4">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">TOTAL</span>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-black text-indigo-600 tabular-nums leading-none">{formatNumber(dashboardStats.grandTotalFuel)}</span>
                              <span className="text-[9px] text-slate-600 font-bold uppercase leading-none">LTR</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col py-4 border-t border-slate-100 mt-4 px-2">
                          <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest text-center mb-4">SUB-TOTAL FUEL</span>
                          <div className="grid grid-cols-3 gap-1">
                            <div className="flex flex-col items-center">
                              <div className="w-28 h-28 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={biosolarSegments} innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                      {biosolarSegments.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="flex flex-col items-center mt-2">
                                <span className="text-[12px] font-black text-slate-900 leading-none">{formatNumber(dashboardStats.totalBiosolar)} <span className="text-[8px]">L</span></span>
                                <span className="text-[8px] font-bold text-slate-600 mt-1 uppercase">BIOSOLAR</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-28 h-28 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={pertaliteSegments} innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                      {pertaliteSegments.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="flex flex-col items-center mt-2">
                                <span className="text-[12px] font-black text-slate-900 leading-none">{formatNumber(dashboardStats.totalPertalite)} <span className="text-[8px]">L</span></span>
                                <span className="text-[8px] font-bold text-slate-600 mt-1 uppercase">PERTALITE</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-28 h-28 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <PieChart>
                                    <Pie data={pertadexSegments} innerRadius={22} outerRadius={38} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                      {pertadexSegments.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                                    </Pie>
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                              <div className="flex flex-col items-center mt-2">
                                <span className="text-[12px] font-black text-slate-900 leading-none">{formatNumber(dashboardStats.totalPertadex)} <span className="text-[8px]">L</span></span>
                                <span className="text-[8px] font-bold text-slate-600 mt-1 uppercase">PERTADEX</span>
                              </div>
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
                    <div className={`flex-1 space-y-6 mt-4 ${isExportMode ? '' : 'overflow-y-auto max-h-[1100px] custom-scrollbar pr-2'}`}>
                      {sortedActivities.length > 0 ? (
                        sortedActivities.map((act, i) => (
                          <div key={i} className="space-y-3">
                            <div className="flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur-sm py-1.5 z-10 border-b border-slate-50">
                              <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: sites.find(s => s.name === act.site)?.color || '#94a3b8' }}></div>
                              <h4 className="text-sm font-bold text-slate-900 tracking-tight">{act.site}</h4>
                              <span className="ml-auto text-[9px] font-bold text-slate-500 uppercase tracking-widest">{act.items.length} KEGIATAN</span>
                            </div>
                            <div className="space-y-3 px-1">
                              {act.items.map((item, j) => (
                                <div key={j} className="relative pl-5 py-1 group">
                                  <div className="absolute left-0 top-[12px] w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-600 transition-colors"></div>
                                  <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider mb-0.5">{item.category}</span>
                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{item.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex flex-col items-center justify-center h-48 opacity-40">
                           <ActivityIcon size={40} className="text-slate-300 mb-2" />
                           <p className="text-xs font-bold uppercase tracking-widest text-slate-600">No data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                 <Database size={56} className="text-slate-200 mb-6" />
                 <h2 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">Data Tidak Ditemukan</h2>
                 <p className="text-slate-600 font-semibold text-center max-w-md">Tidak ada laporan operasional untuk tanggal ini.</p>
              </div>
            )
          ) : activeView === 'weekly' ? (
            weeklyStats ? (
              <div className="grid grid-cols-1 xl:grid-cols-5 gap-8 animate-in fade-in duration-700">
                <div className="xl:col-span-3 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Weekly Total Good Issue" value={formatCurrency(weeklyStats.totalIssue)} icon={<ArrowUpRight size={24} className="text-emerald-500" />} />
                    <StatCard title="Weekly Total Good Receive" value={formatCurrency(weeklyStats.totalReceive)} icon={<ArrowDownLeft size={24} className="text-rose-500" />} />
                    <StatCard title="Weekly Last Stock Value" value={formatCurrency(weeklyStats.lastDayStock)} icon={<Package size={24} className="text-slate-600" />} trend={weeklyStats.stockTrendValue} trendClassName={weeklyStats.stockIsPositive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <ChartCard title="Weekly Good Issue & Receive" subtitle="All Field Zona 9" icon={<ArrowLeftRight size={18} />}>
                      <div className="flex flex-col">
                        <div className="flex items-center px-2 py-2 mb-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                          <span className="w-[40%] text-left">Location</span>
                          <span className="w-[30%] text-center">Issue Sum</span>
                          <span className="w-[30%] text-center">Receive Sum</span>
                        </div>
                        <div className="space-y-1">
                          {Object.entries(weeklyStats.siteAgg).filter(([name]) => name !== 'ZONA 9').map(([name, data]: any) => (
                            <div key={name} className="flex items-center px-2 py-3 hover:bg-slate-50 rounded-xl border-b border-slate-50 last:border-0 transition-colors">
                              <div className="w-[40%] flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: data.color || '#cbd5e1' }}></span>
                                <span className="text-xs font-bold text-slate-800 truncate">{name}</span>
                              </div>
                              <div className="w-[30%] text-center font-bold text-emerald-700 text-xs tabular-nums">{formatCurrency(data.issued)}</div>
                              <div className="w-[30%] text-center font-bold text-rose-700 text-xs tabular-nums">{formatCurrency(data.received)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ChartCard>
                    <ChartCard title="Weekly Last Stock Value" subtitle={`All Field Zona 9`} icon={<TrendingUp size={18} />}>
                      <div className="flex flex-col">
                        <div className="w-full h-[180px] relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={weeklyLastDaySites.filter(s => s.stock > 0 && s.name !== 'ZONA 9')} innerRadius={45} outerRadius={60} paddingAngle={4} dataKey="stock" nameKey="name" isAnimationActive={!isExportMode}>
                                {weeklyLastDaySites.filter(s => s.stock > 0 && s.name !== 'ZONA 9').map((entry, index) => <Cell key={index} fill={entry.color || '#94a3b8'} stroke="none" />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-1 mt-2">
                          {weeklyLastDaySites.filter(s => s.stock > 0 && s.name !== 'ZONA 9').map((site, index) => (
                            <div key={index} className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0 transition-colors">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: site.color || '#cbd5e1' }}></div>
                                <span className="text-[10px] font-bold text-slate-600 uppercase">{site.name}</span>
                              </div>
                              <span className="text-xs font-bold text-slate-900 tabular-nums">{formatCurrency(site.stock)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </ChartCard>
                  </div>
                </div>
                <div className="xl:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 h-full p-8 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <SectionHeader title="Weekly Updates" subtitle="Other Sites Summary" icon={<Edit3 size={18} />} />
                    </div>
                    <div className={`flex-1 space-y-6 ${isExportMode ? '' : 'overflow-y-auto custom-scrollbar pr-2'}`}>
                      {Object.keys(weeklyUpdates).map((site) => (
                        <div key={site} className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 transition-all">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-3">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: weeklyLastDaySites.find(s => s.name === site)?.color || '#94a3b8' }}></div>
                            <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{site}</h4>
                          </div>
                          <AutoResizeTextarea value={weeklyUpdates[site]} onChange={isExportMode ? undefined : (e) => setWeeklyUpdates({...weeklyUpdates, [site]: e.target.value})} placeholder="Enter weekly updates..." className="w-full bg-transparent border-none focus:ring-0 text-sm font-semibold text-slate-700 resize-none outline-none leading-relaxed p-0 h-auto" readOnly={isExportMode} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
               <h2 className="text-xl font-bold mb-4">Input Data View</h2>
            </div>
          )}
        </div>
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print { .no-print { display: none !important; } }
        
        /* Playwright Specific Styles - Digunakan oleh bot renderer di server */
        .export-view {
          background-color: #f8fafc !important;
          width: 1440px !important;
          overflow: visible !important;
          text-rendering: optimizeLegibility !important;
          -webkit-font-smoothing: antialiased !important;
        }
        .export-container {
          width: 1440px !important;
          max-width: none !important;
          padding: 40px !important;
          margin: 0 !important;
          transform: none !important;
        }
        /* Matikan semua animasi saat mode export agar Playwright tidak menangkap frame kosong */
        .export-view * {
          transition: none !important;
          animation: none !important;
          scroll-behavior: auto !important;
        }
      `}</style>
    </div>
  );
};

export default App;