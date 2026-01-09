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
  Server,
  Download
} from 'lucide-react';
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

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; trend?: string; trendClassName?: string; subtitle?: string }> = ({ title, value, icon, trend, trendClassName, subtitle }) => {
  const isLargeNumber = value.length > 18;
  const valueFontSize = isLargeNumber ? 'text-lg' : 'text-xl';

  return (
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
        <h3 className={`${valueFontSize} font-bold text-slate-900 tabular-nums m-0 p-0 break-all`} title={value}>{value}</h3>
      </div>
    </div>
  );
};

const AutoResizeTextarea = ({ value, onChange, placeholder, className, readOnly = false }: { value: string; onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder: string; className: string; readOnly?: boolean }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 5}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(adjustHeight, 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`${className} overflow-hidden resize-none`}
      rows={1}
      readOnly={readOnly}
    />
  );
};

const renderStockPercentLabel = ({ cx, cy, midAngle, outerRadius, percent, fill }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.01) return null;

  return (
    <text
      x={x}
      y={y}
      fill={fill}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="11"
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const NumericInput = ({ label, value, onChange }: { label: string; value: number; onChange: (val: number) => void }) => {
  const [displayValue, setDisplayValue] = useState(value === 0 ? "" : formatNumber(value));

  useEffect(() => {
    setDisplayValue(value === 0 ? "" : formatNumber(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    
    if (raw === "") {
      setDisplayValue("");
      onChange(0);
      return;
    }

    const num = parseInt(raw, 10);
    setDisplayValue(formatNumber(num));
    onChange(num);
  };

  const handleBlur = () => {
    if (displayValue === "") {
      setDisplayValue("0");
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</label>
      <input 
        type="text" 
        value={displayValue}
        placeholder="0"
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-full h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all" 
      />
    </div>
  );
};

const App: React.FC = () => {
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
  const [isSavingDailyUpdates, setIsSavingDailyUpdates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState('');
  const dashboardRef = useRef<HTMLDivElement>(null);

  const [activeInputTab, setActiveInputTab] = useState<'sites' | 'fuel' | 'rigmoves'>('sites');
  
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
    'PHSS': '', 'SANGASANGA': '', 'SANGATTA': '', 'TANJUNG': '', 'ZONA 9': ''
  });

  const [dailyUpdates, setDailyUpdates] = useState<Record<string, string>>({
    'PHSS': '', 'SANGASANGA': '', 'SANGATTA': '', 'TANJUNG': '', 'ZONA 9': ''
  });

  const [prevDaySites, setPrevDaySites] = useState<SiteData[]>([]);
  const [localSites, setLocalSites] = useState<SiteData[]>([]);
  const [localFuel, setLocalFuel] = useState<FuelData[]>([]);
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
        supabase.from('activities').select('*').eq('date', '8888-12-31').order('site'),
        supabase.from('rig_moves').select('*').eq('date', date).order('site'),
        supabase.from('sites').select('*').eq('date', prevDateStr)
      ]);

      if (sRes.error || fRes.error || aRes.error || rRes.error) {
        throw new Error("Gagal mengambil data dari database.");
      }

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
        const updates: Record<string, string> = { 'PHSS': '', 'SANGASANGA': '', 'SANGATTA': '', 'TANJUNG': '', 'ZONA 9': '' };
        aRes.data.forEach(act => {
          updates[act.site] = act.items?.[0]?.description || '';
        });
        setDailyUpdates(updates);
      } else {
        setActivities([]);
        setDailyUpdates({ 'PHSS': '', 'SANGASANGA': '', 'SANGATTA': '', 'TANJUNG': '', 'ZONA 9': '' });
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

  const handleSaveDailyUpdates = async () => {
    setIsSavingDailyUpdates(true);
    try {
      const updates = Object.entries(dailyUpdates).map(([site, text]) => ({
        site, date: '8888-12-31',
        items: [{ category: 'Daily Log', description: text }]
      }));
      const { error } = await supabase.from('activities').upsert(updates, { onConflict: 'site,date' });
      if (error) throw error;
      showToast('Daily Notes berhasil disimpan!');
      const updatedActs = updates.map(u => ({ site: u.site, items: u.items, date: u.date }));
      setActivities(updatedActs as any);
    } catch (err: any) {
      showToast('Error: ' + err.message, true);
    } finally {
      setIsSavingDailyUpdates(false);
    }
  };

  const handleServerDownload = async () => {
    setIsDownloading(true);
    setProgress('Menghubungkan ke server render...');
    try {
      const host = window.location.origin;
      const params = new URLSearchParams({
        date: selectedDate,
        view: activeView,
        startDate: startDate,
        endDate: endDate,
        host: host
      });
      setProgress('Sedang merender dashboard HD (ini mungkin butuh 10-20 detik)...');
      const response = await fetch(`/api/screenshot?${params.toString()}`);
      if (!response.ok) throw new Error('Gagal mengunduh laporan dari server.');
      setProgress('Menyiapkan file unduhan...');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Zona9_Report_${activeView}_${selectedDate}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('Laporan berhasil diunduh!');
    } catch (err: any) {
      showToast('Export Error: ' + err.message, true);
    } finally {
      setIsDownloading(false);
      setProgress('');
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
      // 1. Simpan Site Data
      const siteUpdates = localSites.map(s => {
        const { id, created_at, ...cleanSite } = s as any;
        return { ...cleanSite, date: selectedDate };
      });
      const sResult = await supabase.from('sites').upsert(siteUpdates, { onConflict: 'name,date' });
      if (sResult.error) throw new Error(`Sites: ${sResult.error.message}`);

      // 2. Simpan Fuel Data
      const fuelUpdates = localFuel.map(f => {
        const { id, created_at, ...cleanFuel } = f as any;
        return { ...cleanFuel, date: selectedDate };
      });
      const fResult = await supabase.from('fuel_data').upsert(fuelUpdates, { onConflict: 'name,date' });
      if (fResult.error) throw new Error(`Fuel: ${fResult.error.message}`);

      // 3. Simpan Rig Moves
      const rDel = await supabase.from('rig_moves').delete().eq('date', selectedDate);
      if (rDel.error) throw new Error(`Rig Delete: ${rDel.error.message}`);

      if (localRigMoves.length > 0) {
        const cleanRigMoves = localRigMoves.map(rm => ({
          site: rm.site,
          rig_name: rm.rig_name,
          from_loc: rm.from_loc,
          to_loc: rm.to_loc,
          move_date: rm.move_date || selectedDate,
          date: selectedDate
        }));
        const rIns = await supabase.from('rig_moves').insert(cleanRigMoves);
        if (rIns.error) {
          if (rIns.error.message.includes('column "move_date"')) {
            throw new Error("Gagal: Kolom 'move_date' belum ada di database. Silakan jalankan update SQL di Supabase.");
          }
          throw new Error(`Rig Insert: ${rIns.error.message}`);
        }
      }

      showToast('Data berhasil disimpan!');
      await fetchData(selectedDate);
    } catch (err: any) {
      console.error("Bulk Save Error:", err);
      showToast(err.message, true);
    } finally {
      setIsSaving(false);
    }
  };

  const updateLocalSite = (name: string, field: keyof SiteData, value: any) => {
    setLocalSites(prev => prev.map(s => s.name === name ? { ...s, [field]: value } : s));
  };
  const updateLocalFuel = (name: string, field: keyof FuelData, value: any) => {
    setLocalFuel(prev => prev.map(f => f.name === name ? { ...f, [field]: value } : f));
  };

  const addLocalRigMove = () => {
    setLocalRigMoves(prev => [...prev, { site: 'PHSS', rig_name: '', from_loc: '', to_loc: '', move_date: selectedDate }]);
  };
  const updateLocalRigMove = (index: number, field: keyof RigMove, value: string) => {
    setLocalRigMoves(prev => prev.map((rm, i) => i === index ? { ...rm, [field]: value } : rm));
  };
  const removeLocalRigMove = (index: number) => {
    setLocalRigMoves(prev => prev.filter((_, i) => i !== index));
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

    const biosolarSegments = fuelData.map(f => ({
      name: f.name, value: f.biosolar || 0, color: sites.find(s => s.name === f.name)?.color || '#94a3b8'
    })).filter(d => d.value > 0);

    const pertaliteSegments = fuelData.map(f => ({
      name: f.name, value: f.pertalite || 0, color: sites.find(s => s.name === f.name)?.color || '#94a3b8'
    })).filter(d => d.value > 0);

    const pertadexSegments = fuelData.map(f => ({
      name: f.name, value: f.pertadex || 0, color: sites.find(s => s.name === f.name)?.color || '#94a3b8'
    })).filter(d => d.value > 0);

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
      rigMovesBySite: Object.values(rigMovesAgg),
      biosolarSegments, pertaliteSegments, pertadexSegments
    };

    const prevStock = prevDaySites.reduce((acc, curr) => acc + curr.stock, 0);
    const calcTrend = (curr: number, prev: number) => {
      if (prev === 0) return '+0.00%';
      const diff = ((curr - prev) / prev) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
    };

    const sortedRigMoves = [...rigMoves].sort((a, b) => {
        const dateA = a.move_date || a.date || '';
        const dateB = b.move_date || b.date || '';
        return dateA.localeCompare(dateB);
    });

    return {
      ...current,
      sortedRigMoves,
      trends: {
        stock: calcTrend(current.totalStockValue, prevStock),
        stockIsPositive: current.totalStockValue >= prevStock,
      }
    };
  }, [sites, fuelData, rigMoves, prevDaySites]);

  const weeklyStats = useMemo(() => {
    if (weeklySites.length === 0) return null;
    const totalIssue = weeklySites.reduce((acc, curr) => acc + (curr.issued || 0), 0);
    const totalReceive = weeklySites.reduce((acc, curr) => acc + (curr.received || 0), 0);
    
    const lastDayStock = weeklyLastDaySites.reduce((acc, curr) => acc + curr.stock, 0);
    const firstDayStock = weeklyFirstDaySites.reduce((acc, curr) => acc + curr.stock, 0);
    
    const calcTrend = (curr: number, prev: number) => {
      if (prev === 0) return '+0.00%';
      const diff = ((curr - prev) / prev) * 100;
      return `${diff >= 0 ? '+' : ''}${diff.toFixed(2)}%`;
    };

    const stockTrendValue = calcTrend(lastDayStock, firstDayStock);
    const stockIsPositive = lastDayStock >= firstDayStock;

    const fuelAgg: Record<string, any> = {};
    weeklyFuel.forEach(f => {
      if (!fuelAgg[f.name]) fuelAgg[f.name] = { biosolar: 0, pertalite: 0, pertadex: 0 };
      fuelAgg[f.name].biosolar += (f.biosolar || 0);
      fuelAgg[f.name].pertalite += (f.pertalite || 0);
      fuelAgg[f.name].pertadex += (f.pertadex || 0);
    });

    const grandTotalFuel = Object.values(fuelAgg).reduce((acc: number, curr: any) => acc + curr.biosolar + curr.pertalite + curr.pertadex, 0);
    const totalBiosolar = Object.values(fuelAgg).reduce((acc: number, curr: any) => acc + curr.biosolar, 0);
    const totalPertalite = Object.values(fuelAgg).reduce((acc: number, curr: any) => acc + curr.pertalite, 0);
    const totalPertadex = Object.values(fuelAgg).reduce((acc: number, curr: any) => acc + curr.pertadex, 0);

    const siteAgg: Record<string, any> = {};
    weeklySites.forEach(s => {
      if (!siteAgg[s.name]) siteAgg[s.name] = { issued: 0, received: 0, color: s.color };
      siteAgg[s.name].issued += (s.issued || 0);
      siteAgg[s.name].received += (s.received || 0);
    });

    const rigMovesBySite: Record<string, { count: number; color: string; value: number }> = {};
    weeklyRigs.forEach(rm => {
      if (!rigMovesBySite[rm.site]) {
        const siteColor = weeklyLastDaySites.find(s => s.name === rm.site)?.color || '#cbd5e1';
        rigMovesBySite[rm.site] = { count: 0, color: siteColor, value: 0 };
      }
      rigMovesBySite[rm.site].count += 1;
      rigMovesBySite[rm.site].value += 1;
    });

    const biosolarSegments = Object.entries(fuelAgg).map(([name, data]) => ({ name, value: data.biosolar, color: weeklyLastDaySites.find(s => s.name === name)?.color || '#94a3b8' })).filter(d => d.value > 0);
    const pertaliteSegments = Object.entries(fuelAgg).map(([name, data]) => ({ name, value: data.pertalite, color: weeklyLastDaySites.find(s => s.name === name)?.color || '#94a3b8' })).filter(d => d.value > 0);
    const pertadexSegments = Object.entries(fuelAgg).map(([name, data]) => ({ name, value: data.pertadex, color: weeklyLastDaySites.find(s => s.name === name)?.color || '#94a3b8' })).filter(d => d.value > 0);

    const sortedRigMoves = [...weeklyRigs].sort((a, b) => {
        const dateA = a.move_date || a.date || '';
        const dateB = b.move_date || b.date || '';
        return dateA.localeCompare(dateB);
    });

    return { 
      totalIssue, totalReceive, lastDayStock, firstDayStock, stockTrendValue, stockIsPositive, fuelAgg, siteAgg, 
      totalRigMoves: weeklyRigs.length, rigMovesBySite: Object.values(rigMovesBySite),
      grandTotalFuel, totalBiosolar, totalPertalite, totalPertadex,
      biosolarSegments, pertaliteSegments, pertadexSegments, sortedRigMoves
    };
  }, [weeklySites, weeklyFuel, weeklyRigs, weeklyFirstDaySites, weeklyLastDaySites]);

  const formattedSelectedDate = new Date(selectedDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const sortedSiteNames = ['ZONA 9', 'PHSS', 'SANGASANGA', 'SANGATTA', 'TANJUNG'];

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
          <h2 className="text-2xl font-black mb-2 tracking-tight">Mengekspor Laporan HD</h2>
          <p className="text-slate-200 font-medium text-center">{progress}</p>
        </div>
      )}

      {!isExportMode && (
        <aside className="hidden lg:flex flex-col w-24 bg-slate-900 text-slate-400 h-screen sticky top-0 no-print z-50">
          <div className="py-8 flex flex-col items-center">
            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-10 shadow-lg shadow-black/20 overflow-hidden p-2">
              <img src="./logo.png" alt="Z9 Logo" className="w-full h-full object-contain" />
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
            <div className="flex items-center gap-5">
              {!isExportMode && <img src="./logo.png" alt="Z9 Logo" className="w-14 h-14 object-contain" />}
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                  Warehouse Operation Zona 9 {activeView === 'weekly' ? 'Weekly' : (activeView === 'input' ? 'Data Entry' : 'Daily')} Dashboard
                </h1>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="flex items-center gap-2 text-slate-600 font-bold">
                    <Calendar size={16} className="text-indigo-600" />
                    <span className="text-sm">
                      {activeView === 'weekly' 
                        ? `Laporan Mingguan • ${new Date(startDate).toLocaleDateString('id-ID')} - ${new Date(endDate).toLocaleDateString('id-ID')}` 
                        : `Laporan Operasional • ${formattedSelectedDate}`}
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
            </div>
            {!isExportMode && (
              <div className="flex items-center gap-3 no-print">
                {activeView === 'dashboard' && (
                  <button onClick={handleSaveDailyUpdates} disabled={isSavingDailyUpdates} className="flex items-center justify-center gap-2 px-6 h-11 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all font-bold text-xs uppercase tracking-wider">
                    {isSavingDailyUpdates ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Save Daily Notes</span>
                  </button>
                )}
                {activeView === 'weekly' && (
                  <button onClick={handleSaveWeeklyUpdates} disabled={isSavingWeeklyUpdates} className="flex items-center justify-center gap-2 px-6 h-11 bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700 transition-all font-bold text-xs uppercase tracking-wider">
                    {isSavingWeeklyUpdates ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    <span>Save Weekly Notes</span>
                  </button>
                )}
                {activeView !== 'input' && (
                  <button onClick={handleServerDownload} className="flex items-center gap-2 px-6 h-11 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all font-bold text-xs uppercase tracking-wider">
                    <Download size={16} />
                    <span>Download HD Report</span>
                  </button>
                )}
                {activeView === 'input' && (
                  <button onClick={handleBulkSave} disabled={isSaving} className="flex items-center justify-center gap-2 px-8 h-11 bg-indigo-600 text-white rounded-xl shadow-xl hover:bg-indigo-700 transition-all font-black text-sm uppercase tracking-widest">
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    <span>Simpan Data</span>
                  </button>
                )}
              </div>
            )}
          </header>

          {activeView === 'input' ? (
            <div className="animate-in slide-in-from-bottom-4 duration-500 max-w-6xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8">
                <div className="flex border-b border-slate-100 bg-slate-50/50">
                  <button onClick={() => setActiveInputTab('sites')} className={`flex-1 py-4 px-6 text-xs font-black uppercase tracking-widest transition-all ${activeInputTab === 'sites' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}>Stock & POB</button>
                  <button onClick={() => setActiveInputTab('fuel')} className={`flex-1 py-4 px-6 text-xs font-black uppercase tracking-widest transition-all ${activeInputTab === 'fuel' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}>Fuel</button>
                  <button onClick={() => setActiveInputTab('rigmoves')} className={`flex-1 py-4 px-6 text-xs font-black uppercase tracking-widest transition-all ${activeInputTab === 'rigmoves' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}>Rig Moves</button>
                </div>

                <div className="p-8">
                  {activeInputTab === 'sites' && (
                    <div className="space-y-6">
                      {localSites.map((site) => (
                        <div key={site.name} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: site.color }}></div>
                            <h3 className="font-black text-slate-800 uppercase tracking-tight">{site.name}</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <NumericInput label="Issued Value" value={site.issued} onChange={(val) => updateLocalSite(site.name, 'issued', val)} />
                            <NumericInput label="Received Value" value={site.received} onChange={(val) => updateLocalSite(site.name, 'received', val)} />
                            <NumericInput label="Stock Value" value={site.stock} onChange={(val) => updateLocalSite(site.name, 'stock', val)} />
                            <NumericInput label="POB" value={site.pob} onChange={(val) => updateLocalSite(site.name, 'pob', val)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeInputTab === 'fuel' && (
                    <div className="space-y-6">
                      {localFuel.map((fuel) => (
                        <div key={fuel.name} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: localSites.find(s => s.name === fuel.name)?.color || '#94a3b8' }}></div>
                            <h3 className="font-black text-slate-800 uppercase tracking-tight">{fuel.name}</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <NumericInput label="Biosolar (LTR)" value={fuel.biosolar} onChange={(val) => updateLocalFuel(fuel.name, 'biosolar', val)} />
                            <NumericInput label="Pertalite (LTR)" value={fuel.pertalite} onChange={(val) => updateLocalFuel(fuel.name, 'pertalite', val)} />
                            <NumericInput label="Pertadex (LTR)" value={fuel.pertadex} onChange={(val) => updateLocalFuel(fuel.name, 'pertadex', val)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeInputTab === 'rigmoves' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-black text-slate-800 uppercase tracking-tight">Rig Movement Log</h3>
                        <button onClick={addLocalRigMove} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">
                          <Plus size={16} /> Record Move
                        </button>
                      </div>
                      <div className="space-y-4">
                        {localRigMoves.map((rm, idx) => (
                          <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 items-end">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Site</label>
                              <select value={rm.site} onChange={(e) => updateLocalRigMove(idx, 'site', e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none">
                                {localSites.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date</label><input type="date" value={rm.move_date || selectedDate} onChange={(e) => updateLocalRigMove(idx, 'move_date', e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Rig</label><input value={rm.rig_name} onChange={(e) => updateLocalRigMove(idx, 'rig_name', e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">From</label><input value={rm.from_loc} onChange={(e) => updateLocalRigMove(idx, 'from_loc', e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                            <div className="space-y-1.5"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">To</label><input value={rm.to_loc} onChange={(e) => updateLocalRigMove(idx, 'to_loc', e.target.value)} className="w-full h-11 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none" /></div>
                            <button onClick={() => removeLocalRigMove(idx)} className="h-11 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={20} /></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            (activeView === 'dashboard' || activeView === 'weekly') ? (
              (activeView === 'dashboard' ? dashboardStats : weeklyStats) ? (
                activeView === 'weekly' ? (
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 animate-in fade-in duration-700 overflow-visible items-stretch">
                    <div className="xl:col-span-3 space-y-5 overflow-visible flex flex-col">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <StatCard title="Weekly Good Issue" value={formatCurrency(weeklyStats!.totalIssue)} icon={<ArrowUpRight size={24} className="text-emerald-500" />} />
                        <StatCard title="Weekly Good Receive" value={formatCurrency(weeklyStats!.totalReceive)} icon={<ArrowDownLeft size={24} className="text-rose-500" />} />
                        <StatCard 
                          title="Last Stock Value" 
                          value={formatCurrency(weeklyStats!.lastDayStock)} 
                          icon={<Package size={24} className="text-slate-600" />} 
                          trend={weeklyStats!.stockTrendValue} 
                          trendClassName={weeklyStats!.stockIsPositive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} 
                          subtitle={`vs ${new Date(startDate).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}`}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ChartCard title="Weekly Good Issue & Receive" icon={<ArrowLeftRight size={18} />}>
                          <div className="flex flex-col">
                            <div className="flex items-center px-2 py-2 mb-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <span className="w-[28%]">Location</span><span className="w-[36%] text-center">Issue</span><span className="w-[36%] text-center">Receive</span>
                            </div>
                            {Object.entries(weeklyStats!.siteAgg)
                              .filter(([name]) => name !== 'ZONA 9')
                              .map(([name, data]: any) => (
                              <div key={name} className="flex items-center px-2 py-3 border-b border-slate-50 last:border-0">
                                <div className="w-[28%] flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: data.color }}></span><span className="text-[11px] font-bold text-slate-800 truncate">{name}</span></div>
                                <div className="w-[36%] text-center font-bold text-emerald-700 text-[11px] tabular-nums">{data.issued > 0 ? formatCurrency(data.issued) : '-'}</div>
                                <div className="w-[36%] text-center font-bold text-rose-700 text-[11px] tabular-nums">{data.received > 0 ? formatCurrency(data.received) : '-'}</div>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                        <ChartCard title="Weekly Stock Value" icon={<TrendingUp size={18} />}>
                          <div className="w-full h-[180px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={weeklyLastDaySites.filter(s => s.stock > 0 && s.name !== 'ZONA 9')} innerRadius={45} outerRadius={60} paddingAngle={4} dataKey="stock" nameKey="name" isAnimationActive={false} labelLine={false} label={renderStockPercentLabel}>
                                  {weeklyLastDaySites.filter(s => s.stock > 0 && s.name !== 'ZONA 9').map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full space-y-2 pt-2">
                            {weeklyLastDaySites.filter(s => s.stock > 0 && s.name !== 'ZONA 9').map((site, index) => (
                              <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                                <div className="flex items-center gap-2"><div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: site.color }}></div><span className="text-[10px] font-bold text-slate-600 uppercase">{site.name}</span></div>
                                <span className="text-xs font-bold text-slate-900 tabular-nums">{formatCurrency(site.stock)}</span>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <ChartCard title="Weekly Rig Move" icon={<Truck size={18} />} className="md:col-span-2">
                          <div className="flex flex-col space-y-3">
                            {weeklyStats!.sortedRigMoves.length > 0 ? (
                              weeklyStats!.sortedRigMoves.slice(0, 10).map((rm, idx) => (
                                <div key={idx} className="flex flex-col border-b border-slate-50 pb-2 last:border-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-3 rounded-full shrink-0" style={{ backgroundColor: weeklyLastDaySites.find(s => s.name === rm.site)?.color || '#cbd5e1' }}></div>
                                      <span className="text-[10px] font-bold text-slate-700 uppercase truncate">{rm.site} - {rm.rig_name}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded">
                                      {new Date(rm.move_date || rm.date || '').toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[9px] text-slate-600 font-semibold ml-3.5"><span className="truncate">{rm.from_loc}</span><MoveRight size={10} className="text-indigo-600 shrink-0" /><span className="truncate">{rm.to_loc}</span></div>
                                </div>
                              ))
                            ) : <div className="text-center py-10 opacity-20"><Truck size={32} className="mx-auto" /></div>}
                          </div>
                          <div className="flex flex-col items-center pt-4 border-t border-slate-100 mt-auto">
                            <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-1">WEEKLY MOVE</h3>
                            <div className="relative w-28 h-28">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={weeklyStats!.rigMovesBySite.length > 0 ? weeklyStats!.rigMovesBySite : [{ value: 1, color: '#f1f5f9' }]} innerRadius={28} outerRadius={38} dataKey="value" isAnimationActive={false} stroke="none">
                                    {weeklyStats!.rigMovesBySite.length > 0 ? weeklyStats!.rigMovesBySite.map((entry: any, index: number) => <Cell key={index} fill={entry.color} />) : <Cell fill="#f1f5f9" />}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-lg font-black text-slate-900 leading-none">{weeklyStats!.totalRigMoves}</span></div>
                            </div>
                          </div>
                        </ChartCard>

                        <ChartCard title="Weekly Fuel Consumption" icon={<Fuel size={18} />} className="md:col-span-2">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full pb-4">
                            {Object.entries(weeklyStats!.fuelAgg).map(([name, data]: any) => ({ name, ...data })).map((data: any) => (
                              <div key={data.name} className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-3 rounded-full shrink-0" style={{ backgroundColor: weeklyLastDaySites.find(s => s.name === data.name)?.color }}></div><span className="text-[10px] font-bold text-slate-600 uppercase truncate">{data.name}</span></div>
                                <div className="flex gap-4 ml-3.5 tabular-nums text-[11px] font-bold text-slate-900 leading-none">
                                  <div className="flex flex-col"><span className="text-[7px] text-slate-500 uppercase font-bold">BIO</span><span>{formatNumber(data.biosolar)}</span></div>
                                  <div className="flex flex-col"><span className="text-[7px] text-slate-500 uppercase font-bold">LITE</span><span>{formatNumber(data.pertalite)}</span></div>
                                  <div className="flex flex-col"><span className="text-[7px] text-slate-500 uppercase font-bold">DEX</span><span>{formatNumber(data.pertadex)}</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-center gap-4 bg-slate-50 py-2 rounded-xl mt-auto">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">TOTAL CONSUMPTION</span>
                            <div className="flex items-baseline gap-1.5"><span className="text-xl font-black text-indigo-600">{formatNumber(weeklyStats!.grandTotalFuel)}</span><span className="text-[9px] text-slate-600 font-bold uppercase">LTR</span></div>
                          </div>
                          <div className="grid grid-cols-3 gap-1 pt-6 border-t border-slate-100 mt-6">
                             <div className="flex flex-col items-center">
                               <div className="w-24 h-24 relative">
                                 <ResponsiveContainer width="100%" height="100%">
                                   <PieChart>
                                     <Pie data={weeklyStats!.biosolarSegments} innerRadius={20} outerRadius={35} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                       {weeklyStats!.biosolarSegments.map((entry: any, idx: number) => <Cell key={idx} fill={entry.color} />)}
                                     </Pie>
                                   </PieChart>
                                 </ResponsiveContainer>
                               </div>
                               <span className="text-[11px] font-black text-slate-900 leading-none mt-1">{formatNumber(weeklyStats!.totalBiosolar)} L</span>
                               <span className="text-[8px] font-bold text-slate-500 uppercase mt-1 text-center leading-tight">BIOSOLAR</span>
                             </div>
                             <div className="flex flex-col items-center">
                               <div className="w-24 h-24 relative">
                                 <ResponsiveContainer width="100%" height="100%">
                                   <PieChart>
                                     <Pie data={weeklyStats!.pertaliteSegments} innerRadius={20} outerRadius={35} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                       {weeklyStats!.pertaliteSegments.map((entry: any, idx: number) => <Cell key={idx} fill={entry.color} />)}
                                     </Pie>
                                   </PieChart>
                                 </ResponsiveContainer>
                               </div>
                               <span className="text-[11px] font-black text-slate-900 leading-none mt-1">{formatNumber(weeklyStats!.totalPertalite)} L</span>
                               <span className="text-[8px] font-bold text-slate-500 uppercase mt-1 text-center leading-tight">PERTALITE</span>
                             </div>
                             <div className="flex flex-col items-center">
                               <div className="w-24 h-24 relative">
                                 <ResponsiveContainer width="100%" height="100%">
                                   <PieChart>
                                     <Pie data={weeklyStats!.pertadexSegments} innerRadius={20} outerRadius={35} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                       {weeklyStats!.pertadexSegments.map((entry: any, idx: number) => <Cell key={idx} fill={entry.color} />)}
                                     </Pie>
                                   </PieChart>
                                 </ResponsiveContainer>
                               </div>
                               <span className="text-[11px] font-black text-slate-900 leading-none mt-1">{formatNumber(weeklyStats!.totalPertadex)} L</span>
                               <span className="text-[8px] font-bold text-slate-500 uppercase mt-1 text-center leading-tight">PERTADEX</span>
                             </div>
                          </div>
                        </ChartCard>
                      </div>

                      <div className="flex-1 flex flex-col pt-8 overflow-visible min-h-fit">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-auto flex flex-col overflow-visible">
                          <SectionHeader title="Weekly Update Zona 9" icon={<Edit3 size={18} />} />
                          <div className="flex-1 mt-4 overflow-visible h-auto">
                            <AutoResizeTextarea 
                              value={weeklyUpdates['ZONA 9'] || ''} 
                              onChange={(e) => setWeeklyUpdates({...weeklyUpdates, ['ZONA 9']: e.target.value})} 
                              placeholder="Catatan mingguan..." 
                              className="w-full bg-slate-50/50 p-6 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700 outline-none leading-relaxed h-auto" 
                              readOnly={isExportMode} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="xl:col-span-2 flex flex-col overflow-visible">
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-auto flex flex-col overflow-visible">
                        <SectionHeader title="Weekly Update Sites" icon={<Edit3 size={18} />} />
                        <div className="flex-1 space-y-6 mt-4 overflow-visible h-auto">
                          {Object.keys(weeklyUpdates).filter(site => site !== 'ZONA 9').map((site) => (
                            <div key={site} className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 overflow-visible h-auto">
                              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: weeklyLastDaySites.find(s => s.name === site)?.color }}></div>
                                <h4 className="text-xs font-black text-slate-800 uppercase">{site}</h4>
                              </div>
                              <AutoResizeTextarea 
                                value={weeklyUpdates[site]} 
                                onChange={(e) => setWeeklyUpdates({...weeklyUpdates, [site]: e.target.value})} 
                                placeholder={`Catatan ${site}...`} 
                                className="w-full bg-transparent border-none text-sm font-semibold text-slate-700 resize-none outline-none p-0 h-auto" 
                                readOnly={isExportMode} 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 animate-in fade-in duration-700 overflow-visible items-stretch">
                    <div className="xl:col-span-3 space-y-5 overflow-visible flex flex-col">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <StatCard title="Total Good Issue" value={formatCurrency(dashboardStats!.totalGoodIssue)} icon={<ArrowUpRight size={24} className="text-emerald-500" />} />
                        <StatCard title="Total Good Receive" value={formatCurrency(dashboardStats!.totalGoodReceive)} icon={<ArrowDownLeft size={24} className="text-rose-500" />} />
                        <StatCard title="Total Stock Value" value={formatCurrency(dashboardStats!.totalStockValue)} icon={<Package size={24} className="text-slate-600" />} trend={dashboardStats!.trends.stock} trendClassName={dashboardStats!.trends.stockIsPositive ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <ChartCard title="Good Issue & Receive" icon={<ArrowLeftRight size={18} />}>
                          <div className="flex flex-col">
                            <div className="flex items-center px-2 py-2 mb-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              <span className="w-[28%]">Location</span><span className="w-[36%] text-center">Issue</span><span className="w-[36%] text-center">Receive</span>
                            </div>
                            {sites.filter(curr => curr.name !== 'ZONA 9').map((data) => (
                              <div key={data.name} className="flex items-center px-2 py-3 border-b border-slate-50 last:border-0">
                                <div className="w-[28%] flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: data.color }}></span><span className="text-[11px] font-bold text-slate-800 truncate">{data.name}</span></div>
                                <div className="w-[36%] text-center font-bold text-emerald-700 text-[11px] tabular-nums">{data.issued > 0 ? formatCurrency(data.issued) : '-'}</div>
                                <div className="w-[36%] text-center font-bold text-rose-700 text-[11px] tabular-nums">{data.received > 0 ? formatCurrency(data.received) : '-'}</div>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                        <ChartCard title="Stock Value" icon={<TrendingUp size={18} />}>
                          <div className="w-full h-[180px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={sites.filter(s => s.stock > 0 && s.name !== 'ZONA 9')} innerRadius={45} outerRadius={60} paddingAngle={4} dataKey="stock" nameKey="name" isAnimationActive={false} labelLine={false} label={renderStockPercentLabel}>
                                  {sites.filter(s => s.stock > 0 && s.name !== 'ZONA 9').map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full space-y-2 pt-2">
                            {sites.filter(s => s.stock > 0 && s.name !== 'ZONA 9').map((site, index) => (
                              <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0">
                                <div className="flex items-center gap-2"><div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: site.color }}></div><span className="text-[10px] font-bold text-slate-600 uppercase">{site.name}</span></div>
                                <span className="text-xs font-bold text-slate-900 tabular-nums">{formatCurrency(site.stock)}</span>
                              </div>
                            ))}
                          </div>
                        </ChartCard>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <ChartCard title="Person on Board" icon={<Users size={18} />} className="md:col-span-1">
                          <div className="flex flex-col space-y-2.5">
                            {sites.map((site) => (
                              <div key={site.name} className="flex flex-col">
                                <div className="flex items-center gap-2 mb-0.5"><div className="w-1.5 h-3 rounded-full shrink-0" style={{ backgroundColor: site.color }}></div><span className="text-[10px] font-bold text-slate-600 uppercase truncate">{site.name}</span></div>
                                <span className="text-[12px] font-bold text-slate-900 ml-3.5 tabular-nums leading-none">{site.pob}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex flex-col items-center pt-4 border-t border-slate-100 mt-4">
                            <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-1">Snapshot POB</h3>
                            <div className="relative w-28 h-28">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={sites} innerRadius={28} outerRadius={38} paddingAngle={2} dataKey="pob" isAnimationActive={false} stroke="none">
                                    {sites.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-lg font-black text-slate-900 leading-none">{dashboardStats!.totalPOB}</span></div>
                            </div>
                          </div>
                        </ChartCard>

                        <ChartCard title="Support Rig Move" icon={<Truck size={18} />} className="md:col-span-1">
                          <div className="flex flex-col space-y-3">
                            {dashboardStats!.sortedRigMoves.length > 0 ? (
                              dashboardStats!.sortedRigMoves.slice(0, 5).map((rm, idx) => (
                                <div key={idx} className="flex flex-col border-b border-slate-50 pb-2 last:border-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-3 rounded-full shrink-0" style={{ backgroundColor: sites.find(s => s.name === rm.site)?.color || '#cbd5e1' }}></div>
                                      <span className="text-[10px] font-bold text-slate-700 uppercase truncate">{rm.site} - {rm.rig_name}</span>
                                    </div>
                                    <span className="text-[8px] font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">
                                      {new Date(rm.move_date || rm.date || '').toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[9px] text-slate-600 font-semibold ml-3.5"><span className="truncate">{rm.from_loc}</span><MoveRight size={10} className="text-indigo-600 shrink-0" /><span className="truncate">{rm.to_loc}</span></div>
                                </div>
                              ))
                            ) : <div className="text-center py-10 opacity-20"><Truck size={32} className="mx-auto" /></div>}
                          </div>
                          <div className="flex flex-col items-center pt-4 border-t border-slate-100 mt-4">
                            <h3 className="text-[10px] font-bold text-slate-600 uppercase mb-1">DAILY MOVE</h3>
                            <div className="relative w-28 h-28">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie data={dashboardStats!.rigMovesBySite.length > 0 ? dashboardStats!.rigMovesBySite : [{ value: 1, color: '#f1f5f9' }]} innerRadius={28} outerRadius={38} dataKey="value" isAnimationActive={false} stroke="none">
                                    {dashboardStats!.rigMovesBySite.length > 0 ? dashboardStats!.rigMovesBySite.map((entry: any, index: number) => <Cell key={index} fill={entry.color} />) : <Cell fill="#f1f5f9" />}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-lg font-black text-slate-900 leading-none">{dashboardStats!.totalRigMoves}</span></div>
                            </div>
                          </div>
                        </ChartCard>

                        <ChartCard title="Fuel Consumption" icon={<Fuel size={18} />} className="md:col-span-2">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-3 w-full pb-4">
                            {fuelData.map((data: any) => (
                              <div key={data.name} className="flex flex-col">
                                <div className="flex items-center gap-2 mb-1"><div className="w-1.5 h-3 rounded-full shrink-0" style={{ backgroundColor: sites.find(s => s.name === data.name)?.color }}></div><span className="text-[10px] font-bold text-slate-600 uppercase truncate">{data.name}</span></div>
                                <div className="flex gap-4 ml-3.5 tabular-nums text-[11px] font-bold text-slate-900 leading-none">
                                  <div className="flex flex-col"><span className="text-[7px] text-slate-500 uppercase font-bold">BIO</span><span>{formatNumber(data.biosolar)}</span></div>
                                  <div className="flex flex-col"><span className="text-[7px] text-slate-500 uppercase font-bold">LITE</span><span>{formatNumber(data.pertalite)}</span></div>
                                  <div className="flex flex-col"><span className="text-[7px] text-slate-500 uppercase font-bold">DEX</span><span>{formatNumber(data.pertadex)}</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-center gap-4 bg-slate-50 py-2 rounded-xl mt-auto">
                            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">TOTAL CONSUMPTION</span>
                            <div className="flex items-baseline gap-1.5"><span className="text-xl font-black text-indigo-600">{formatNumber(dashboardStats!.grandTotalFuel)}</span><span className="text-[9px] text-slate-600 font-bold uppercase">LTR</span></div>
                          </div>
                          <div className="grid grid-cols-3 gap-1 pt-6 border-t border-slate-100 mt-6">
                             <div className="flex flex-col items-center">
                               <div className="w-24 h-24 relative">
                                 <ResponsiveContainer width="100%" height="100%">
                                   <PieChart>
                                     <Pie data={dashboardStats!.biosolarSegments} innerRadius={20} outerRadius={35} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                       {dashboardStats!.biosolarSegments.map((entry: any, idx: number) => <Cell key={idx} fill={entry.color} />)}
                                     </Pie>
                                   </PieChart>
                                 </ResponsiveContainer>
                               </div>
                               <span className="text-[11px] font-black text-slate-900 leading-none mt-1">{formatNumber(dashboardStats!.totalBiosolar)} L</span>
                               <span className="text-[8px] font-bold text-slate-500 uppercase mt-1 text-center leading-tight">BIOSOLAR</span>
                             </div>
                             <div className="flex flex-col items-center">
                               <div className="w-24 h-24 relative">
                                 <ResponsiveContainer width="100%" height="100%">
                                   <PieChart>
                                     <Pie data={dashboardStats!.pertaliteSegments} innerRadius={20} outerRadius={35} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                       {dashboardStats!.pertaliteSegments.map((entry: any, idx: number) => <Cell key={idx} fill={entry.color} />)}
                                     </Pie>
                                   </PieChart>
                                 </ResponsiveContainer>
                               </div>
                               <span className="text-[11px] font-black text-slate-900 leading-none mt-1">{formatNumber(dashboardStats!.totalPertalite)} L</span>
                               <span className="text-[8px] font-bold text-slate-500 uppercase mt-1 text-center leading-tight">PERTALITE</span>
                             </div>
                             <div className="flex flex-col items-center">
                               <div className="w-24 h-24 relative">
                                 <ResponsiveContainer width="100%" height="100%">
                                   <PieChart>
                                     <Pie data={dashboardStats!.pertadexSegments} innerRadius={20} outerRadius={35} paddingAngle={2} dataKey="value" isAnimationActive={false} stroke="none">
                                       {dashboardStats!.pertadexSegments.map((entry: any, idx: number) => <Cell key={idx} fill={entry.color} />)}
                                     </Pie>
                                   </PieChart>
                                 </ResponsiveContainer>
                               </div>
                               <span className="text-[11px] font-black text-slate-900 leading-none mt-1">{formatNumber(dashboardStats!.totalPertadex)} L</span>
                               <span className="text-[8px] font-bold text-slate-500 uppercase mt-1 text-center leading-tight">PERTADEX</span>
                             </div>
                          </div>
                        </ChartCard>
                      </div>
                    </div>

                    <div className="xl:col-span-2 flex flex-col overflow-visible">
                      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-auto flex flex-col overflow-visible">
                        <SectionHeader title="Daily Activity Log" icon={<ActivityIcon size={18} />} />
                        <div className="flex-1 space-y-6 mt-4 overflow-visible h-auto">
                          {sortedSiteNames.map((siteName) => (
                            <div key={siteName} className="space-y-3 p-4 bg-slate-50/50 rounded-xl border border-slate-100 overflow-visible h-auto">
                              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                                <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: sites.find(s => s.name === siteName)?.color }}></div>
                                <h4 className="text-xs font-black text-slate-800 uppercase">{siteName}</h4>
                              </div>
                              <AutoResizeTextarea 
                                value={dailyUpdates[siteName] || ''} 
                                onChange={(e) => setDailyUpdates({...dailyUpdates, [siteName]: e.target.value})} 
                                placeholder={`Catatan log harian untuk ${siteName}...`} 
                                className="w-full bg-transparent border-none text-sm font-semibold text-slate-700 resize-none outline-none p-0 h-auto" 
                                readOnly={isExportMode} 
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="text-center py-20 flex flex-col items-center"><Database size={48} className="text-slate-200 mb-4" /><h2 className="text-xl font-bold">Data Tidak Ditemukan</h2></div>
              )
            ) : null
          )}
        </div>
      </main>
      
      <style>{`
        @media print { .no-print { display: none !important; } }
        .export-view { background-color: #f8fafc !important; width: 1440px !important; overflow: visible !important; }
        .export-container { width: 1440px !important; max-width: none !important; padding: 40px !important; }
        .bg-white.rounded-2xl { overflow: visible !important; height: auto !important; }
        .grid, .xl\\:col-span-3, .xl\\:col-span-2 { overflow: visible !important; }
      `}</style>
    </div>
  );
};

export default App;