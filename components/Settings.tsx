
import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, Upload, ShieldCheck, Database, History, 
  AlertTriangle, CheckCircle2, FileJson, Users, 
  Lock, Key, UserPlus, Trash2, UserCheck, ShieldAlert,
  Eye, EyeOff, Fingerprint, KeyRound, Save, Building
} from 'lucide-react';
import { Customer, Transaction, User, UserRole } from '../types';

interface SettingsProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  shopName: string;
  setShopName: (name: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  users, setUsers, customers, setCustomers, 
  transactions, setTransactions, currentUser, setCurrentUser,
  shopName, setShopName
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [activeSubTab, setActiveSubTab] = useState<'backup' | 'users' | 'security' | 'general'>(isAdmin ? 'general' : 'security');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'none', message: string }>({ type: 'none', message: '' });
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [newUser, setNewUser] = useState({ fullName: '', username: '', password: '', role: 'operator' as UserRole });
  const [tempShopName, setTempShopName] = useState(shopName);

  const handleExport = () => {
    if (!isAdmin) return;
    const backupData = { version: "3.0", timestamp: Date.now(), data: { users, customers, transactions, shopName } };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`; link.click();
  };

  const handleImportClick = () => { if (isAdmin) fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (confirm('هشدار: تمام داده‌های فعلی پاک خواهند شد. ادامه می‌دهید؟')) {
          setUsers(json.data.users); setCustomers(json.data.customers);
          setTransactions(json.data.transactions); setShopName(json.data.shopName);
          setStatus({ type: 'success', message: 'بازیابی با موفقیت انجام شد.' });
        }
      } catch (err) { setStatus({ type: 'error', message: 'فایل نامعتبر است.' }); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 max-w-2xl mx-auto">
        {isAdmin && <button onClick={() => setActiveSubTab('general')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs transition-all ${activeSubTab === 'general' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>تنظیمات عمومی</button>}
        <button onClick={() => setActiveSubTab('security')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs transition-all ${activeSubTab === 'security' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>امنیت</button>
        {isAdmin && <button onClick={() => setActiveSubTab('users')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs transition-all ${activeSubTab === 'users' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>کاربران</button>}
        {isAdmin && <button onClick={() => setActiveSubTab('backup')} className={`flex-1 py-4 rounded-[1.5rem] font-black text-xs transition-all ${activeSubTab === 'backup' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>پشتیبان‌گیری</button>}
      </div>

      {activeSubTab === 'general' && isAdmin && (
        <div className="flex justify-center"><div className="bg-white p-12 rounded-[3.5rem] w-full max-w-xl shadow-sm border border-slate-100">
          <input type="text" className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 font-bold mb-6 outline-none" placeholder="نام صرافی" value={tempShopName} onChange={e => setTempShopName(e.target.value)} />
          <button onClick={() => { setShopName(tempShopName); setStatus({type:'success', message:'تغییر یافت'}); }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black">بروزرسانی نام</button>
        </div></div>
      )}

      {activeSubTab === 'backup' && isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 text-center flex flex-col items-center">
            <Download size={48} className="text-blue-600 mb-8" />
            <h4 className="text-2xl font-black mb-10">خروجی کل دیتابیس</h4>
            <button onClick={handleExport} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black">دانلود فایل پشتیبان</button>
          </div>
          <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 text-center flex flex-col items-center">
            <Upload size={48} className="text-amber-600 mb-8" />
            <h4 className="text-2xl font-black mb-10">بازیابی دیتابیس</h4>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            <button onClick={handleImportClick} className="w-full border-2 border-slate-200 py-6 rounded-2xl font-black">انتخاب فایل</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
