
import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, Upload, ShieldCheck, Database, History, 
  AlertTriangle, CheckCircle2, FileJson, Users, 
  Lock, Key, UserPlus, Trash2, UserCheck, ShieldAlert,
  Eye, EyeOff, Fingerprint, KeyRound, Save, Building
} from 'lucide-react';
import { Customer, BankAccount, Transaction, User, UserRole } from '../types';

interface SettingsProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  shopName: string;
  setShopName: (name: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  users, setUsers, customers, setCustomers, bankAccounts, setBankAccounts, 
  transactions, setTransactions, currentUser, setCurrentUser,
  shopName, setShopName
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [activeSubTab, setActiveSubTab] = useState<'backup' | 'users' | 'security' | 'general'>(isAdmin ? 'general' : 'security');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'none', message: string }>({ type: 'none', message: '' });
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Password Change State
  const [passForm, setPassForm] = useState({ current: '', new: '', confirm: '' });
  const [newUser, setNewUser] = useState({ fullName: '', username: '', password: '', role: 'operator' as UserRole });
  
  // Shop Name Edit State
  const [tempShopName, setTempShopName] = useState(shopName);

  useEffect(() => {
    if (!isAdmin && activeSubTab !== 'security') {
      setActiveSubTab('security');
    }
  }, [isAdmin, activeSubTab]);

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const handleExport = () => {
    if (!isAdmin) return;
    try {
      const backupData = {
        version: "2.6",
        timestamp: Date.now(),
        data: { users, customers, bankAccounts, transactions, shopName }
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sarrafi_db_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      setStatus({ type: 'success', message: 'فایل پشتیبان با موفقیت صادر شد.' });
      setTimeout(() => setStatus({ type: 'none', message: '' }), 3000);
    } catch (err) { setStatus({ type: 'error', message: 'خطا در خروجی فایل پشتیبان.' }); }
  };

  const handleImportClick = () => { if (isAdmin) fileInputRef.current?.click(); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (confirm('هشدار: تمام داده‌های فعلی پاک و با اطلاعات فایل جایگزین خواهند شد. آیا مطمئن هستید؟')) {
          setUsers(json.data.users);
          setCustomers(json.data.customers);
          setBankAccounts(json.data.bankAccounts);
          setTransactions(json.data.transactions);
          if (json.data.shopName) setShopName(json.data.shopName);
          setStatus({ type: 'success', message: 'تمامی اطلاعات با موفقیت بازیابی شد.' });
          setTimeout(() => setStatus({ type: 'none', message: '' }), 3000);
        }
      } catch (err) { setStatus({ type: 'error', message: 'فایل وارد شده نامعتبر است.' }); }
    };
    reader.readAsText(file);
  };

  const handleAddUser = (e: React.FormEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    const user: User = { id: Math.random().toString(36).substr(2, 9), ...newUser };
    setUsers(prev => [...prev, user]);
    setNewUser({ fullName: '', username: '', password: '', role: 'operator' });
    setStatus({ type: 'success', message: `کاربر ${user.fullName} با موفقیت ایجاد شد.` });
    setTimeout(() => setStatus({ type: 'none', message: '' }), 3000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (passForm.current !== currentUser.password) {
      setStatus({ type: 'error', message: 'رمز عبور فعلی اشتباه است.' });
      return;
    }
    if (passForm.new !== passForm.confirm) {
      setStatus({ type: 'error', message: 'رمز عبور جدید و تکرار آن مطابقت ندارند.' });
      return;
    }
    if (passForm.new.length < 6) {
        setStatus({ type: 'error', message: 'رمز عبور جدید باید حداقل ۶ کاراکتر باشد.' });
        return;
    }

    const updatedUser = { ...currentUser, password: passForm.new };
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setCurrentUser(updatedUser);
    setPassForm({ current: '', new: '', confirm: '' });
    setStatus({ type: 'success', message: 'رمز عبور شما با موفقیت تغییر یافت.' });
    setTimeout(() => setStatus({ type: 'none', message: '' }), 3000);
  };

  const handleSaveShopName = () => {
    if (!tempShopName.trim()) return;
    setShopName(tempShopName.trim());
    setStatus({ type: 'success', message: 'نام صرافی با موفقیت تغییر یافت.' });
    setTimeout(() => setStatus({ type: 'none', message: '' }), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Tab Navigation */}
      <div className="flex bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 max-w-2xl mx-auto">
        {isAdmin && (
          <button 
            onClick={() => setActiveSubTab('general')} 
            className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] font-black text-xs transition-all ${activeSubTab === 'general' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
          >
            تنظیمات عمومی
          </button>
        )}
        <button 
          onClick={() => setActiveSubTab('security')} 
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] font-black text-xs transition-all ${activeSubTab === 'security' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
        >
          امنیت و رمز عبور
        </button>
        {isAdmin && (
          <>
            <button 
              onClick={() => setActiveSubTab('users')} 
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] font-black text-xs transition-all ${activeSubTab === 'users' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              مدیریت کاربران
            </button>
            <button 
              onClick={() => setActiveSubTab('backup')} 
              className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-[1.5rem] font-black text-xs transition-all ${activeSubTab === 'backup' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' : 'text-slate-400 hover:text-slate-600'}`}
            >
              نسخه پشتیبان
            </button>
          </>
        )}
      </div>

      {status.type !== 'none' && (
        <div className={`p-6 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top duration-300 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
          {status.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
          <p className="font-bold text-sm">{status.message}</p>
        </div>
      )}

      {/* General Settings - Admin Only */}
      {isAdmin && activeSubTab === 'general' && (
        <div className="flex justify-center animate-in zoom-in duration-300">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 w-full max-w-xl">
            <div className="flex flex-col items-center mb-10 text-center">
              <div className="bg-blue-50 text-blue-600 p-5 rounded-3xl mb-4">
                <Building size={32} />
              </div>
              <h3 className="text-2xl font-black text-slate-900">هویت سیستم</h3>
              <p className="text-sm text-slate-400 mt-2 font-medium">نام نمایش داده شده در هدر و رسیدهای چاپی صرافی.</p>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-1">نام صرافی (فروشگاه)</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                  placeholder="مثلاً: صرافی جاوید"
                  value={tempShopName} 
                  onChange={e => setTempShopName(e.target.value)}
                />
              </div>
              <button onClick={handleSaveShopName} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-3">
                <Save size={20} /> بروزرسانی نام صرافی
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security View */}
      {activeSubTab === 'security' && (
        <div className="flex justify-center animate-in zoom-in duration-300">
           <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 w-full max-w-xl">
             <div className="flex flex-col items-center mb-10 text-center">
                <div className="bg-blue-50 text-blue-600 p-5 rounded-3xl mb-4">
                  <KeyRound size={32} />
                </div>
                <h3 className="text-2xl font-black text-slate-900">تغییر رمز عبور حساب</h3>
                <p className="text-sm text-slate-400 mt-2 font-medium">برای امنیت بیشتر، رمز عبور خود را به صورت دوره‌ای تغییر دهید.</p>
             </div>
             <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase mr-1">رمز عبور فعلی</label>
                   <input 
                     type="password" required 
                     className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                     placeholder="••••••••"
                     value={passForm.current} onChange={e => setPassForm({...passForm, current: e.target.value})}
                   />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase mr-1">رمز عبور جدید</label>
                       <input 
                         type="password" required 
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                         placeholder="حداقل ۶ کاراکتر"
                         value={passForm.new} onChange={e => setPassForm({...passForm, new: e.target.value})}
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase mr-1">تکرار رمز جدید</label>
                       <input 
                         type="password" required 
                         className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                         placeholder="••••••••"
                         value={passForm.confirm} onChange={e => setPassForm({...passForm, confirm: e.target.value})}
                       />
                    </div>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-black shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-3 mt-4">
                  <Save size={20} /> ذخیره رمز عبور جدید
                </button>
             </form>
           </div>
        </div>
      )}

      {/* Backup View - Admin Only */}
      {isAdmin && activeSubTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in zoom-in duration-300">
          <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 text-center flex flex-col items-center">
            <div className="p-6 bg-blue-50 text-blue-600 rounded-[2.5rem] mb-8">
               <Download size={48} />
            </div>
            <h4 className="text-2xl font-black mb-4">صدور نسخه پشتیبان</h4>
            <p className="text-sm text-slate-400 mb-10 leading-relaxed font-medium">یک فایل JSON حاوی تمامی اطلاعات مشتریان، بانک‌ها و تراکنش‌ها برای شما آماده و دانلود می‌شود.</p>
            <button onClick={handleExport} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-slate-100">دریافت فایل پشتیبان (Full DB)</button>
          </div>
          <div className="bg-white p-12 rounded-[3.5rem] shadow-sm border border-slate-100 text-center flex flex-col items-center">
            <div className="p-6 bg-amber-50 text-amber-600 rounded-[2.5rem] mb-8">
               <Upload size={48} />
            </div>
            <h4 className="text-2xl font-black mb-4">بازیابی اطلاعات</h4>
            <p className="text-sm text-slate-400 mb-10 leading-relaxed font-medium">با انتخاب یک فایل پشتیبان قبلی، تمامی اطلاعات سیستم فعلی حذف و با فایل جدید جایگزین می‌شود.</p>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            <button onClick={handleImportClick} className="w-full border-2 border-slate-200 text-slate-700 py-6 rounded-2xl font-black text-lg hover:bg-slate-50 transition-all">انتخاب فایل و شروع بازیابی</button>
          </div>
        </div>
      )}

      {/* Users View - Admin Only */}
      {isAdmin && activeSubTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in zoom-in duration-300">
          <div className="lg:col-span-8 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-2xl font-black mb-10 flex items-center gap-3">
               <Users size={28} className="text-blue-600" /> کاربران فعال سیستم
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {users.map(user => (
                <div key={user.id} className="p-6 bg-slate-50 rounded-[2.5rem] flex justify-between items-center group border border-transparent hover:border-slate-200 transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shadow-lg shadow-blue-100">{user.fullName.charAt(0)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-slate-900">{user.fullName}</p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-700'}`}>
                          {user.role === 'admin' ? 'مدیر کل' : 'اپراتور'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">@{user.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-100">
                      <span className="text-xs font-mono font-bold text-slate-500">{visiblePasswords[user.id] ? user.password : '••••••••'}</span>
                      <button onClick={() => togglePasswordVisibility(user.id)} className="text-slate-300 hover:text-blue-600 transition-colors">
                        {visiblePasswords[user.id] ? <EyeOff size={18}/> : <Eye size={18}/>}
                      </button>
                    </div>
                    {user.id !== currentUser?.id && (
                       <button 
                         onClick={() => setUsers(prev => prev.filter(u => u.id !== user.id))}
                         className="p-3 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                       >
                         <Trash2 size={20} />
                       </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl shadow-slate-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none"><UserPlus size={150} /></div>
            <h3 className="text-xl font-black mb-8 relative z-10">تعریف کاربر جدید</h3>
            <form onSubmit={handleAddUser} className="space-y-5 relative z-10">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase mr-1">نام کامل</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="مثلاً: محمد کریمی" value={newUser.fullName} onChange={e => setNewUser({...newUser, fullName: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase mr-1">نام کاربری</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="username" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase mr-1">رمز عبور</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" placeholder="••••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase mr-1">سطح دسترسی</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm font-bold outline-none appearance-none" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}>
                   <option value="operator" className="bg-slate-900">اپراتور (محدود)</option>
                   <option value="admin" className="bg-slate-900">مدیر کل (دسترسی کامل)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/10 mt-4">ایجاد حساب کاربری</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
