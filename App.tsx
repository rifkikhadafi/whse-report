import React, { useState, useMemo, useRef } from 'react';
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
  ChevronDown, 
  Activity as ActivityIcon, 
  TrendingUp,
  PenLine,
  Download,
  Loader2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { sites as initialSites, fuelData as initialFuelData, activities as initialActivities } from './mockData';

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
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState('');
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const [sites] = useState(initialSites);
  const [fuelData] = useState(initialFuelData);
  const [activities] = useState(initialActivities);

  const dashboardStats = useMemo(() => {
    const totalStockValue = sites.reduce((acc, curr) => acc + curr.stock, 0);
    const totalGoodIssue = sites.reduce((acc, curr) => acc + curr.issued, 0);
    const totalGoodReceive = sites.reduce((acc, curr) => acc + curr.received, 0);
    return {
      totalStockValue, totalGoodIssue, totalGoodReceive,
      totalPOB: sites.reduce((acc, curr) => acc + curr.pob, 0),
      totalBiosolar: fuelData.reduce((acc, curr) => acc + curr.biosolar, 0),
      totalPertalite: fuelData.reduce((acc, curr) => acc + curr.pertalite, 0),
      totalPertadex: fuelData.reduce((acc, curr) => acc + curr.pertadex, 0),
      grandTotalFuel: fuelData.reduce((acc, curr) => acc + curr.biosolar + curr.pertalite + curr.pertadex, 0)
    };
  }, [sites, fuelData]);

  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return;
    
    setIsDownloading(true);
    setProgress('Mengoptimalisasi Tata Letak...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
        windowWidth: 1600,
        onclone: (clonedDoc) => {
          const main = clonedDoc.querySelector('main');
          if (main) {
            main.style.width = '1600px';
            main.style.padding = '60px';
            
            clonedDoc.querySelectorAll('.pdf-no-clip').forEach((el: any) => {
              el.style.overflow = 'visible';
              el.style.textOverflow = 'clip';
              el.style.whiteSpace = 'nowrap';
              el.style.lineHeight = '1.4';
              el.style.paddingBottom = '4px';
            });

            const h1 = clonedDoc.querySelector('h1');
            if (h1) {
              h1.style.lineHeight = '1.2';
              h1.style.marginBottom = '2px';
              h1.style.paddingBottom = '8px';
            }

            clonedDoc.querySelectorAll('.pdf-overflow-visible').forEach((el: any) => {
              el.style.overflow = 'visible';
            });

            clonedDoc.querySelectorAll('.pdf-shift-down').forEach((el: any) => {
              el.style.transform = 'translateY(3px)';
            });

            clonedDoc.querySelectorAll('.recharts-responsive-container').forEach((el: any) => {
              el.style.marginTop = '4px';
              el.style.overflow = 'visible';
            });

            clonedDoc.querySelectorAll('.pdf-status-dot').forEach((el: any) => {
              el.style.transform = 'translateY(4px)';
            });
            clonedDoc.querySelectorAll('.pdf-bullet').forEach((el: any) => {
              el.style.top = '8px';
            });

            clonedDoc.querySelectorAll('.no-print').forEach((el: any) => {
              el.style.display = 'none';
            });

            clonedDoc.querySelectorAll('.custom-scrollbar').forEach((el: any) => {
              el.style.maxHeight = 'none';
              el.style.overflow = 'visible';
            });
          }
        }
      });
      
      setProgress('Menyusun Dokumen...');
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`Zona9_Dashboard_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Terjadi kesalahan saat mengunduh PDF.');
    } finally {
      setIsDownloading(false);
      setProgress('');
    }
  };

  const renderPercentageLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN) - 2; 
    return (
      <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? 'start' : 'end'} fontSize="10" fontWeight="bold">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    );
  };

  return (
    <div className="min-h-screen flex bg-slate-50/50">
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

      <main className="flex-1 overflow-x-hidden p-4 lg:p-10" ref={dashboardRef}>
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight pdf-no-clip">Warehouse Operation Zona 9</h1>
            <div className="flex items-center gap-2 mt-1.5 text-slate-500 font-semibold pdf-overflow-visible">
              <Calendar size={16} className="text-indigo-500 pdf-shift-down" />
              <span className="text-sm pdf-no-clip">Daily Report Overview • 07 Jan 2026</span>
            </div>
          </div>
          <div className="flex items-center gap-3 no-print">
            <button 
              onClick={handleDownloadPDF} 
              disabled={isDownloading}
              className="flex items-center justify-center gap-2 px-6 h-11 bg-slate-900 text-white rounded-xl shadow-xl shadow-slate-900/10 hover:bg-slate-800 transition-all active:scale-95 font-bold text-sm"
            >
              <Download size={18} />
              <span>Download PDF</span>
            </button>
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 h-11 rounded-xl shadow-sm">
              <Calendar size={18} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5 tracking-wider">Pilih Tanggal</span>
                <span className="text-sm font-bold text-slate-700 leading-none">07 Jan 2026</span>
              </div>
              <ChevronDown size={14} className="text-slate-300 ml-1" />
            </div>
          </div>
        </header>

        {activeView === 'dashboard' ? (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
            <div className="xl:col-span-3 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Total Good Issue" value={formatCurrency(dashboardStats.totalGoodIssue)} icon={<ArrowUpRight size={24} className="text-emerald-500" />} trend="-1.8%" trendClassName="text-emerald-600 bg-emerald-50" />
                <StatCard title="Total Good Receive" value={formatCurrency(dashboardStats.totalGoodReceive)} icon={<ArrowDownLeft size={24} className="text-rose-500" />} trend="+0.5%" trendClassName="text-rose-600 bg-rose-50" />
                <StatCard title="Total Stock Value" value={formatCurrency(dashboardStats.totalStockValue)} icon={<Package size={24} className="text-slate-600" />} trend="+2.4%" trendClassName="text-rose-600 bg-rose-50" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <ChartCard title="Good Issue & Receive" subtitle="PHSS, Sangasanga, Sangatta, Tanjung" icon={<ArrowLeftRight size={18} />}>
                  <div className="flex flex-col h-[280px] pdf-overflow-visible">
                    <div className="flex items-center px-2 py-2 mb-2 bg-slate-50 rounded-lg text-[10px] font-bold text-slate-400 uppercase tracking-wider pdf-table-header">
                      <span className="w-[40%] text-left pdf-no-clip">Location</span>
                      <span className="w-[30%] text-center pdf-no-clip">Good Issue</span>
                      <span className="w-[30%] text-center pdf-no-clip">Good Receive</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pdf-overflow-visible">
                      {sites.filter(s => s.name !== 'ZONA 9').map((site, index) => (
                        <div key={index} className="flex items-center px-2 py-3 hover:bg-slate-50 rounded-xl border-b border-slate-50 last:border-0 pdf-flex-row">
                          <div className="w-[40%] flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0 pdf-status-dot" style={{ backgroundColor: site.color }}></span>
                            <span className="text-xs font-bold text-slate-700 truncate pdf-no-clip">{site.name}</span>
                          </div>
                          <div className="w-[30%] text-center font-semibold text-emerald-600 text-xs tabular-nums pdf-no-clip">{site.issued > 0 ? formatCurrency(site.issued) : '-'}</div>
                          <div className="w-[30%] text-center font-semibold text-rose-600 text-xs tabular-nums pdf-no-clip">{site.received > 0 ? formatCurrency(site.received) : '-'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>

                <ChartCard title="Stock Value Distribution" subtitle="PHSS, Sangasanga, Sangatta, Tanjung" icon={<TrendingUp size={18} />}>
                  <div className="flex flex-col h-full gap-4 pdf-overflow-visible">
                    <div className="w-full h-[180px] shrink-0 pdf-overflow-visible">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={sites.filter(s => s.stock > 0) as any[]} 
                            innerRadius={50} outerRadius={70} 
                            paddingAngle={4} dataKey="stock" nameKey="name" 
                            isAnimationActive={false} 
                            labelLine={false}
                            label={renderPercentageLabel}
                          >
                            {sites.filter(s => s.stock > 0).map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-full space-y-3 pt-2 pdf-overflow-visible">
                      {sites.filter(s => s.stock > 0).map((site, index) => (
                        <div key={index} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 pdf-flex-row">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-3 rounded-full pdf-status-dot" style={{ backgroundColor: site.color }}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight pdf-no-clip">{site.name}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-900 tabular-nums pdf-no-clip">{formatCurrency(site.stock)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <ChartCard title="Person on Board" icon={<Users size={18} />} className="md:col-span-1">
                  <div className="h-[170px] overflow-hidden pdf-overflow-visible">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-3 px-1 pdf-overflow-visible">
                      {sites.map((site) => (
                        <div key={site.name} className="flex flex-col">
                          <div className="flex items-center gap-2 mb-0.5 pdf-flex-row">
                            <div className="w-1.5 h-3 rounded-full flex-shrink-0 pdf-status-dot" style={{ backgroundColor: site.color }}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate pdf-no-clip">{site.name}</span>
                          </div>
                          <span className="text-[12px] font-bold text-slate-900 ml-3.5 tabular-nums pdf-no-clip">{site.pob}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center pt-8 border-t border-slate-100 pdf-overflow-visible">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pdf-no-clip">Total POB</h3>
                    <div className="relative w-28 h-28 pdf-overflow-visible">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={sites as any[]} innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="pob" isAnimationActive={false} stroke="none">
                            {sites.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-slate-900 pdf-no-clip">{dashboardStats.totalPOB}</span>
                      </div>
                    </div>
                  </div>
                </ChartCard>

                <ChartCard title="Support Rig Move" icon={<Truck size={18} />} className="md:col-span-1">
                  <div className="h-[170px] overflow-hidden pdf-overflow-visible">
                    <div className="flex flex-col gap-y-3 px-1 pdf-overflow-visible">
                      {['SANGASANGA', 'SANGATTA', 'TANJUNG'].map(name => (
                        <div key={name} className="flex flex-col">
                          <div className="flex items-center gap-2 mb-0.5 pdf-flex-row">
                            <div className="w-1.5 h-3 rounded-full flex-shrink-0 pdf-status-dot" style={{ backgroundColor: sites.find(s => s.name === name)?.color }}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate pdf-no-clip">{name}</span>
                          </div>
                          <span className="text-[12px] font-bold text-slate-900 ml-3.5 pdf-no-clip">0</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-center pt-8 border-t border-slate-100 pdf-overflow-visible">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pdf-no-clip">TOTAL RIG MOVE</h3>
                    <div className="relative w-28 h-28 pdf-overflow-visible">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={[{ value: 1 }]} innerRadius={30} outerRadius={45} dataKey="value" isAnimationActive={false} stroke="none">
                            <Cell fill="#f1f5f9" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-lg font-black text-slate-900 pdf-no-clip">0</span>
                      </div>
                    </div>
                  </div>
                </ChartCard>

                <ChartCard title="Fuel Consumption" icon={<Fuel size={18} />} className="md:col-span-2">
                  <div className="h-[185px] overflow-hidden flex flex-col justify-between pdf-overflow-visible">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-4 px-1 w-full overflow-y-auto custom-scrollbar pr-2 pdf-overflow-visible">
                      {fuelData.map((data) => (
                        <div key={data.name} className="flex flex-col">
                          <div className="flex items-center gap-2 mb-0.5 pdf-flex-row">
                            <div className="w-1.5 h-3 rounded-full flex-shrink-0 pdf-status-dot" style={{ backgroundColor: sites.find(s => s.name === data.name)?.color }}></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight truncate pdf-no-clip">{data.name}</span>
                          </div>
                          <div className="flex gap-4 ml-3.5 tabular-nums pdf-overflow-visible">
                            <div className="flex flex-col text-[10px]"><span className="text-slate-400 font-bold uppercase text-[8px] pdf-no-clip">Bio</span><span className="font-bold text-slate-900 pdf-no-clip">{formatNumber(data.biosolar)}</span></div>
                            <div className="flex flex-col text-[10px]"><span className="text-slate-400 font-bold uppercase text-[8px] pdf-no-clip">Pert</span><span className="font-bold text-slate-900 pdf-no-clip">{formatNumber(data.pertalite)}</span></div>
                            <div className="flex flex-col text-[10px]"><span className="text-slate-400 font-bold uppercase text-[8px] pdf-no-clip">Dex</span><span className="font-bold text-slate-900 pdf-no-clip">{formatNumber(data.pertadex)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-col items-center py-4 pdf-overflow-visible">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5 pdf-no-clip">Total Fuel Consumption</span>
                      <div className="flex items-baseline gap-1.5 pdf-overflow-visible">
                        <span className="text-xl font-black text-indigo-600 leading-none tabular-nums pdf-no-clip">{formatNumber(dashboardStats.grandTotalFuel)}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter pdf-no-clip">LITER</span>
                      </div>
                    </div>
                  </div>
                  <div className="pt-8 border-t border-slate-100 flex flex-col items-center pdf-overflow-visible">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 pdf-no-clip">SUB-TOTAL FUEL</h3>
                    <div className="grid grid-cols-3 gap-2 w-full pdf-overflow-visible">
                      {[
                        { label: 'BIOSOLAR', key: 'biosolar', total: dashboardStats.totalBiosolar },
                        { label: 'PERTALITE', key: 'pertalite', total: dashboardStats.totalPertalite },
                        { label: 'PERTADEX', key: 'pertadex', total: dashboardStats.totalPertadex }
                      ].map(fuel => (
                        <div key={fuel.label} className="flex flex-col items-center pdf-overflow-visible">
                          <div className="relative w-20 h-20 pdf-overflow-visible">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={fuelData as any[]} innerRadius={22} outerRadius={35} dataKey={fuel.key} paddingAngle={4} isAnimationActive={false}>
                                  {fuelData.map((entry, idx) => <Cell key={idx} fill={sites.find(s => s.name === entry.name)?.color} stroke="none" />)}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-[9px] font-bold text-slate-900 tabular-nums pdf-no-clip leading-none">{formatNumber(fuel.total)}</span>
                              <span className="text-[7px] font-bold text-slate-400 pdf-no-clip leading-none">L</span>
                            </div>
                          </div>
                          <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-widest pdf-no-clip">{fuel.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              </div>
            </div>

            <div className="xl:col-span-2">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 h-full p-8 flex flex-col pdf-container">
                <SectionHeader title="Daily Activity Log" subtitle="Detailed operational updates for each site" icon={<ActivityIcon size={18} />} />
                <div className="flex-1 space-y-6 overflow-y-auto max-h-[1100px] custom-scrollbar pr-2 mt-4 pdf-overflow-visible">
                  {activities.map((act, i) => (
                    <div key={i} className="space-y-3 pdf-overflow-visible">
                      <div className="flex items-center gap-2 sticky top-0 bg-white/95 backdrop-blur-sm py-1.5 z-10 border-b border-slate-50 pdf-flex-row pdf-overflow-visible">
                        <div className="w-1.5 h-4 rounded-full pdf-status-dot" style={{ backgroundColor: sites.find(s => s.name === act.site)?.color }}></div>
                        <h4 className="text-sm font-bold text-slate-900 tracking-tight pdf-no-clip">{act.site}</h4>
                        <span className="ml-auto text-[9px] font-bold text-slate-300 uppercase tracking-widest pdf-no-clip">{act.items.length} EVENT{act.items.length > 1 ? 'S' : ''}</span>
                      </div>
                      <div className="space-y-3 px-1 pdf-overflow-visible">
                        {act.items.map((item, j) => (
                          <div key={j} className="relative pl-5 pdf-overflow-visible">
                            <div className="absolute left-0 top-[6px] w-1.5 h-1.5 rounded-full bg-indigo-200 pdf-bullet"></div>
                            <div className="flex flex-col pdf-overflow-visible">
                              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-0.5 pdf-no-clip">{item.category}</span>
                              <p className="text-sm text-slate-600 leading-relaxed font-medium pdf-no-clip" style={{ whiteSpace: 'normal' }}>{item.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="pt-8 pb-4 flex flex-col items-center opacity-30">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pdf-no-clip">End of Daily Report</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center no-print">
            <PenLine size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">Input mode is active.</p>
            <button onClick={() => setActiveView('dashboard')} className="mt-6 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold">Back to Dashboard</button>
          </div>
        )}
      </main>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media print { .no-print { display: none !important; } }
      `}</style>
    </div>
  );
};

export default App;