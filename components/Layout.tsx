
import React, { useState, useEffect, useRef } from 'react';
import { Activity, Beaker, Stethoscope, Menu, X, User, ScanEye, Eye, LayoutDashboard, HeartPulse, BrainCircuit, Sparkles, Glasses, Baby, Bone, Smile, Flower, Wind, Utensils, Droplets, Droplet, Ambulance, Dna, FileSignature, Settings as SettingsIcon, Wifi, WifiOff, Shield, Key, BarChart3, Lock, AlertTriangle, Download } from 'lucide-react';
import { AppRoute } from '../types';
import { keyManager, KeyStats } from '../services/geminiService';

interface LayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentRoute, onNavigate, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // --- Admin Mode Logic ---
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState(false);
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);
  const [keyStats, setKeyStats] = useState<KeyStats[]>([]);

  // --- PWA Install Logic ---
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA Install Prompt Capture
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  // Trigger Logic
  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTimeRef.current < 800) { // < 1s threshold (800ms)
      clickCountRef.current++;
    } else {
      clickCountRef.current = 1;
    }
    lastClickTimeRef.current = now;

    if (clickCountRef.current === 5) {
      setShowAdminLogin(true);
      clickCountRef.current = 0;
    }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'admin') { // Hardcoded for demo/frontend-only protection
      setShowAdminLogin(false);
      setShowAdminDashboard(true);
      setKeyStats(keyManager.getStatistics()); // Load stats
      setAdminPassword('');
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const NavItem = ({ route, icon: Icon, label }: { route: AppRoute; icon: any; label: string }) => (
    <button
      onClick={() => {
        onNavigate(route);
        setIsSidebarOpen(false);
      }}
      className={`flex items-center w-full p-4 space-x-3 space-x-reverse rounded-xl transition-all duration-200 ${
        currentRoute === route
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      <Icon size={24} />
      <span className="font-medium text-lg">{label}</span>
    </button>
  );

  // Derived Stats
  const totalRequests = keyStats.reduce((acc, curr) => acc + curr.usageCount, 0);
  const activeKeys = keyStats.filter(k => k.status === 'active').length;
  const sortedByUsage = [...keyStats].sort((a, b) => b.usageCount - a.usageCount);
  const mostUsed = sortedByUsage[0];
  const leastUsed = sortedByUsage[sortedByUsage.length - 1];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 right-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} flex flex-col
      `}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center cursor-pointer select-none" onClick={handleLogoClick}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white relative overflow-hidden">
              <Activity className="animate-pulse" />
              {/* Subtle effect to show click targets */}
              <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity"></div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">طبیب هوشمند</h1>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setIsSidebarOpen(false); }} className="lg:hidden text-gray-500">
            <X />
          </button>
        </div>

        {/* Network Status Banner */}
        <div className={`px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 transition-colors ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
           {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
           {isOnline ? 'شبکه متصل است (AI فعال)' : 'حالت آفلاین (دستی)'}
        </div>

        {/* PWA Install Button (Only visible if installable) */}
        {showInstallBtn && (
          <div className="px-4 mt-2">
            <button 
              onClick={handleInstallClick}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 animate-bounce-subtle"
            >
              <Download size={18} />
              نصب نرم‌افزار
            </button>
          </div>
        )}

        <nav className="p-4 space-y-2 mt-2 overflow-y-auto flex-1">
          <NavItem route={AppRoute.PRESCRIPTION} icon={FileSignature} label="میز کار دکتر" />
          <NavItem route={AppRoute.INTAKE} icon={User} label="ویزیت هوشمند" />
          <NavItem route={AppRoute.DIAGNOSIS} icon={Stethoscope} label="اتاق تشخیص" />
          <NavItem route={AppRoute.DASHBOARD} icon={LayoutDashboard} label="داشبورد و بایگانی" />
          <NavItem route={AppRoute.SETTINGS} icon={SettingsIcon} label="اتاق فرمان و تنظیمات" />
          
          <div className="border-t my-4 border-gray-100 pt-4">
            <p className="text-xs font-bold text-gray-400 px-4 mb-2">دپارتمان‌های تخصصی</p>
            <NavItem route={AppRoute.EMERGENCY} icon={Ambulance} label="اورژانس و تروما" />
            <NavItem route={AppRoute.GENETICS} icon={Dna} label="ژنتیک و پزشکی دقیق" />
            <NavItem route={AppRoute.HEMATOLOGY} icon={Droplet} label="خون و سرطان‌شناسی" />
            <NavItem route={AppRoute.UROLOGY} icon={Droplets} label="کلیه و مجاری ادراری" />
            <NavItem route={AppRoute.GASTROENTEROLOGY} icon={Utensils} label="گوارش و تغذیه" />
            <NavItem route={AppRoute.PULMONOLOGY} icon={Wind} label="ریه و تنفس" />
            <NavItem route={AppRoute.CARDIOLOGY} icon={HeartPulse} label="قلب و عروق" />
            <NavItem route={AppRoute.GYNECOLOGY} icon={Flower} label="زنان و زایمان" />
            <NavItem route={AppRoute.NEUROLOGY} icon={BrainCircuit} label="مغز و اعصاب" />
            <NavItem route={AppRoute.ORTHOPEDICS} icon={Bone} label="ارتوپدی و اسکلت" />
            <NavItem route={AppRoute.DENTISTRY} icon={Smile} label="دندانپزشکی" />
            <NavItem route={AppRoute.PSYCHOLOGY} icon={Sparkles} label="روانشناسی و روح" />
            <NavItem route={AppRoute.OPHTHALMOLOGY} icon={Glasses} label="چشم‌پزشکی" />
            <NavItem route={AppRoute.PEDIATRICS} icon={Baby} label="کودکان و رشد" />
            <NavItem route={AppRoute.LABORATORY} icon={Beaker} label="آزمایشگاه هوشمند" />
            <NavItem route={AppRoute.RADIOLOGY} icon={ScanEye} label="رادیولوژی هوشمند" />
            <NavItem route={AppRoute.PHYSICAL_EXAM} icon={Eye} label="معاینه فیزیکی" />
          </div>
        </nav>

        <div className="p-6 bg-blue-50 border-t border-blue-100">
          <div className="flex items-center gap-3">
            <img src="https://picsum.photos/100/100" className="w-12 h-12 rounded-full border-2 border-blue-200" alt="Dr Profile" />
            <div>
              <p className="font-bold text-gray-800">دکتر متخصص</p>
              <p className="text-xs text-blue-600">مدیر سیستم</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 lg:hidden relative z-40">
          <span className="font-bold text-gray-700">طبیب هوشمند</span>
          <div className="flex items-center gap-4">
             {showInstallBtn && (
                <button onClick={handleInstallClick} className="bg-blue-100 text-blue-600 p-2 rounded-lg text-xs font-bold flex items-center gap-1">
                   <Download size={14} /> نصب
                </button>
             )}
             <div className={`p-1.5 rounded-full ${isOnline ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
             </div>
             <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600">
                <Menu />
             </button>
          </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>

      {/* ADMIN LOGIN MODAL */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAdminLogin(false)}>
           <div className="bg-gray-900 border border-gray-700 text-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
              <div className="flex justify-center mb-6 text-emerald-500">
                 <Shield size={48} />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">ورود به اتاق فرمان</h3>
              <p className="text-gray-400 text-sm text-center mb-6">لطفا رمز عبور مدیریتی را وارد کنید</p>
              
              <div className="space-y-4">
                 <div className="relative">
                    <input 
                      type="password" 
                      autoFocus
                      className={`w-full bg-gray-800 border ${loginError ? 'border-red-500' : 'border-gray-600'} rounded-xl p-3 pl-10 text-center outline-none focus:border-emerald-500 transition-colors`}
                      placeholder="• • • • •"
                      value={adminPassword}
                      onChange={e => setAdminPassword(e.target.value)}
                      onKeyPress={e => e.key === 'Enter' && handleAdminLogin()}
                    />
                    <Key className="absolute left-3 top-3.5 text-gray-500" size={18} />
                 </div>
                 {loginError && <p className="text-red-500 text-xs text-center">رمز عبور اشتباه است</p>}
                 
                 <button onClick={handleAdminLogin} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-emerald-900/20">
                    ورود
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ADMIN CONTROL ROOM DASHBOARD */}
      {showAdminDashboard && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 overflow-y-auto">
           <div className="w-full max-w-5xl bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
              
              {/* Header */}
              <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                 <div className="flex items-center gap-4">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                       <BarChart3 className="text-emerald-500" size={28} />
                    </div>
                    <div>
                       <h2 className="text-2xl font-bold text-white">اتاق فرمان</h2>
                       <p className="text-gray-400 text-xs uppercase tracking-widest">سیستم نظارت بر کلیدها و ترافیک</p>
                    </div>
                 </div>
                 <button onClick={() => setShowAdminDashboard(false)} className="p-2 bg-gray-800 rounded-full hover:bg-gray-700 text-gray-400 transition-colors">
                    <X size={24} />
                 </button>
              </div>

              {/* Body */}
              <div className="p-8 flex-1 overflow-y-auto">
                 {/* Stats Cards */}
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                       <p className="text-gray-400 text-xs mb-1">کل درخواست‌ها</p>
                       <p className="text-3xl font-bold text-white">{totalRequests}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                       <p className="text-gray-400 text-xs mb-1">کلیدهای فعال</p>
                       <p className="text-3xl font-bold text-emerald-400">{activeKeys} <span className="text-sm text-gray-500 font-normal">/ {keyStats.length}</span></p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                       <p className="text-gray-400 text-xs mb-1">پرکارترین کلید</p>
                       <p className="text-lg font-bold text-blue-400 truncate">{mostUsed ? mostUsed.maskedKey : '---'}</p>
                       <p className="text-xs text-gray-500">{mostUsed ? `${mostUsed.usageCount} request` : ''}</p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700">
                       <p className="text-gray-400 text-xs mb-1">کم‌کارترین کلید</p>
                       <p className="text-lg font-bold text-orange-400 truncate">{leastUsed ? leastUsed.maskedKey : '---'}</p>
                       <p className="text-xs text-gray-500">{leastUsed ? `${leastUsed.usageCount} request` : ''}</p>
                    </div>
                 </div>

                 {/* Usage Chart (Visual Bar) */}
                 <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 mb-8">
                    <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Activity size={16} className="text-emerald-500"/> توزیع بار (Load Balancing)</h4>
                    <div className="flex h-4 rounded-full overflow-hidden bg-gray-900">
                       {keyStats.map((k, i) => {
                          const percent = totalRequests > 0 ? (k.usageCount / totalRequests) * 100 : 0;
                          if (percent === 0) return null;
                          const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500'];
                          return (
                             <div key={k.key} style={{ width: `${percent}%` }} className={`${colors[i % colors.length]} hover:opacity-80 transition-opacity`} title={`${k.maskedKey}: ${k.usageCount}`}></div>
                          );
                       })}
                    </div>
                 </div>

                 {/* Detailed List */}
                 <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
                    <table className="w-full text-right text-gray-300">
                       <thead className="bg-gray-900 text-gray-500 text-xs uppercase">
                          <tr>
                             <th className="p-4">شناسه کلید</th>
                             <th className="p-4">تعداد درخواست</th>
                             <th className="p-4">خطاها</th>
                             <th className="p-4">آخرین استفاده</th>
                             <th className="p-4">وضعیت</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-gray-700">
                          {keyStats.map(k => (
                             <tr key={k.key} className="hover:bg-gray-750 transition-colors">
                                <td className="p-4 font-mono text-emerald-400">{k.maskedKey}</td>
                                <td className="p-4">{k.usageCount}</td>
                                <td className="p-4 text-red-400">{k.errorCount}</td>
                                <td className="p-4 text-sm text-gray-500">{k.lastUsed ? new Date(k.lastUsed).toLocaleTimeString() : '-'}</td>
                                <td className="p-4">
                                   <span className={`px-2 py-1 rounded text-xs font-bold ${k.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                      {k.status === 'active' ? 'ACTIVE' : 'COOLDOWN'}
                                   </span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Layout;