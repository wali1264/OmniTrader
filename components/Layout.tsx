
import React, { useState, useEffect } from 'react';
import { Activity, Beaker, Stethoscope, Menu, X, User, ScanEye, Eye, LayoutDashboard, HeartPulse, BrainCircuit, Sparkles, Glasses, Baby, Bone, Smile, Flower, Wind, Utensils, Droplets, Droplet, Ambulance, Dna, FileSignature, Settings as SettingsIcon, Wifi, WifiOff } from 'lucide-react';
import { AppRoute } from '../types';

interface LayoutProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentRoute, onNavigate, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Activity />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">طبیب هوشمند</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-500">
            <X />
          </button>
        </div>

        {/* Network Status Banner */}
        <div className={`px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-2 transition-colors ${isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
           {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
           {isOnline ? 'شبکه متصل است (AI فعال)' : 'حالت آفلاین (دستی)'}
        </div>

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
             {/* Mobile Network Indicator */}
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
    </div>
  );
};

export default Layout;
