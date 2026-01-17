
import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, Upload, ShieldCheck, AlertTriangle, CheckCircle2, Users, 
  Lock, Save, Building, Eye, EyeOff, User as UserIcon,
  Receipt, Plus, Trash2, X, ShieldAlert, KeyRound, AlertOctagon, Terminal, Copy, ClipboardCheck, Trash,
  CreditCard, Landmark, HardDrive, Construction, Wallet, RotateCcw, Info
} from 'lucide-react';
import { Customer, Transaction, User as SystemUser, SUPPORTED_CURRENCIES, TransactionType, TransactionStatus, BankAccount, GlobalRate } from '../types';

const getSystemNow = () => Date.now();
const DEVELOPER_SECRET_KEY = '0796606605';

interface SettingsProps {
  users: SystemUser[]; setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  customers: Customer[]; setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[]; setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  bankAccounts: BankAccount[]; setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  globalRates: GlobalRate[]; setGlobalRates: React.Dispatch<React.SetStateAction<GlobalRate[]>>;
  currentUser: SystemUser | null; setCurrentUser: (user: SystemUser | null) => void;
  shopName: string; setShopName: (name: string) => void;
  appStatus: 'ACTIVE' | 'LOCKED'; setAppStatus: (status: 'ACTIVE' | 'LOCKED') => void;
  isMasterSession: boolean;
}

const Settings: React.FC<SettingsProps> = ({ 
  users, setUsers, customers, setCustomers, 
  transactions, setTransactions, bankAccounts, setBankAccounts,
  globalRates, setGlobalRates,
  currentUser, setCurrentUser, shopName, setShopName,
  appStatus, setAppStatus, isMasterSession
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'security' | 'users' | 'expenses' | 'backup' | 'dev'> ('general');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'none', message: string }>({ type: 'none', message: '' });
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  const [tempShopName, setTempShopName] = useState(shopName);

  // Security States
  const [tempUsername, setTempUsername] = useState(currentUser?.username || '');
  const [tempPassword, setTempPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Expense States
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDescription, setExpenseDescription] = useState('');

  useEffect(() => {
    if (status.type !== 'none') {
      const timer = setTimeout(() => setStatus({ type: 'none', message: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleExport = () => {
    const backupData = { 
      version: "14.0", 
      timestamp: getSystemNow(), 
      shopName,
      data: { 
        users, 
        customers, 
        transactions, 
        bankAccounts,
        globalRates,
        appStatus
      } 
    };
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const dateStr = new Date().toLocaleDateString('fa-IR').replace(/\//g, '-');
    link.download = `Sarrafi_Backup_Full_${dateStr}.json`;
    link.click();
    setStatus({ type: 'success', message: 'فایل پشتیبان کامل ایجاد شد. آن را در فلش خود ذخیره کنید.' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!json.data || !json.data.customers) {
          throw new Error('فایل پشتیبان معتبر نیست.');
        }

        if (confirm('⚠️ توجه: تمام اطلاعات فعلی با اطلاعات موجود در فلش جایگزین خواهد شد. آیا مطمئن هستید؟')) {
          if (json.data.users) setUsers(json.data.users);
          if (json.data.customers) setCustomers(json.data.customers);
          if (json.data.transactions) setTransactions(json.data.transactions);
          if (json.data.bankAccounts) setBankAccounts(json.data.bankAccounts);
          if (json.data.globalRates) setGlobalRates(json.data.globalRates);
          if (json.shopName) setShopName(json.shopName);
          if (json.data.appStatus) setAppStatus(json.data.appStatus);
          
          setStatus({ type: 'success', message: 'تمام اطلاعات با موفقیت از فلش بازیابی شد.' });
          
          // ریست کردن ورودی فایل برای انتخاب مجدد در آینده
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch (err) { 
        setStatus({ type: 'error', message: 'خطا: فایل انتخاب شده معتبر نیست یا آسیب دیده است.' }); 
      }
    };
    reader.readAsText(file);
  };

  const checkDevPassword = () => {
    if (devPasswordInput === DEVELOPER_SECRET_KEY) {
      setIsDevUnlocked(true);
      setStatus({ type: 'success', message: 'قفل ابزار سازنده باز شد.' });
    } else {
      setStatus({ type: 'error', message: 'رمز سازنده اشتباه است.' });
    }
  };

  const handleFactoryReset = () => {
    if (!isDevUnlocked) return;
    if (confirm('⚠️ هشدار جدی: تمامی اطلاعات شامل مشتریان، تراکنش‌ها، موجودی‌ها و تنظیمات برای همیشه پاک خواهند شد. آیا مطمئن هستید؟')) {
      localStorage.clear();
      setStatus({ type: 'success', message: 'تمامی اطلاعات پاک شد. در حال بازنشانی...' });
      setTimeout(() => window.location.reload(), 1500);
    }
  };

  const handleUpdateUsername = () => {
    if (!currentUser) return;
    if (!tempUsername.trim()) {
      setStatus({ type: 'error', message: 'نام کاربری نمی‌تواند خالی باشد.' });
      return;
    }
    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, username: tempUsername } : u);
    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, username: tempUsername });
    setStatus({ type: 'success', message: 'نام کاربری با موفقیت بروزرسانی شد.' });
  };

  const handleUpdatePassword = () => {
    if (!currentUser) return;
    if (!tempPassword || tempPassword.length < 4) {
      setStatus({ type: 'error', message: 'رمز عبور باید حداقل ۴ کاراکتر باشد.' });
      return;
    }
    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: tempPassword } : u);
    setUsers(updatedUsers);
    setTempPassword('');
    setStatus({ type: 'success', message: 'رمز عبور با موفقیت تغییر یافت.' });
  };

  const handleAddExpense = () => {
    if (expenseAmount <= 0) {
      setStatus({ type: 'error', message: 'لطفاً مبلغ هزینه را وارد کنید.' });
      return;
    }
    const transaction: Transaction = {
      id: 'EXP-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      type: TransactionType.BOARD,
      amount: expenseAmount,
      currency: 'AFN', // Default expense currency
      description: `[مصرف دفتر] ${expenseDescription || 'بدون شرح'}`,
      timestamp: getSystemNow(),
      status: TransactionStatus.APPROVED,
      isBank: false
    };
    setTransactions(prev => [...prev, transaction]);
    setExpenseAmount(0);
    setExpenseDescription('');
    setStatus({ type: 'success', message: 'هزینه با موفقیت در دفتر مصارف ثبت شد.' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 font-['Vazirmatn'] text-right pb-10" dir="rtl">
      {status.type !== 'none' && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-6 py-3 rounded-xl shadow-lg ${status.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          <p className="font-bold text-sm">{status.message}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex bg-white p-2 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto custom-scrollbar gap-2">
        <button onClick={() => setActiveSubTab('general')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-2 ${activeSubTab === 'general' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
          تنظیمات عمومی
        </button>
        <button onClick={() => setActiveSubTab('security')} className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-2 ${activeSubTab === 'security' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
          امنیت
        </button>
        <button onClick={() => setActiveSubTab('users')} className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-2 ${activeSubTab === 'users' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
          کاربران
        </button>
        <button onClick={() => setActiveSubTab('expenses')} className={`flex-1 min-w-[100px] py-3 px-4 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-2 ${activeSubTab === 'expenses' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
          مصارف دفتر
        </button>
        <button onClick={() => setActiveSubTab('backup')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-2 ${activeSubTab === 'backup' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
          ذخیره در فلش (بکاپ)
        </button>
        <button onClick={() => setActiveSubTab('dev')} className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl font-bold text-[11px] transition-all flex items-center justify-center gap-2 ${activeSubTab === 'dev' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
          پنل سازنده 🏗️
        </button>
      </div>

      {/* Main Content Card */}
      <div className="bg-white p-16 rounded-[3rem] shadow-sm border border-slate-100 min-h-[500px] relative">
        {activeSubTab === 'general' && (
          <div className="max-w-lg mx-auto space-y-10 animate-in fade-in duration-300">
            <div className="flex flex-row-reverse items-center justify-center gap-4 mb-10">
              <h3 className="text-2xl font-black text-slate-800">اطلاعات صرافی</h3>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                 <Building size={28} />
              </div>
            </div>

            <div className="space-y-4 text-right">
              <label className="block text-xs font-bold text-slate-400 mr-2">نام صرافی</label>
              <input 
                type="text" 
                className="w-full p-6 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-lg outline-none focus:bg-white focus:ring-4 focus:ring-blue-500/5 transition-all text-center" 
                value={tempShopName} 
                onChange={e => setTempShopName(e.target.value)} 
                placeholder="نام صرافی را وارد کنید"
              />
            </div>

            <div className="pt-6">
              <button 
                onClick={() => { setShopName(tempShopName); setStatus({type:'success', message:'تغییرات با موفقیت ذخیره شد.'}); }} 
                className="w-full bg-[#0f172a] text-white py-6 rounded-2xl font-black text-base shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 group"
              >
                <Save size={22} className="group-hover:scale-110 transition-transform" /> ذخیره تغییرات
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'security' && (
          <div className="max-w-lg mx-auto space-y-16 animate-in fade-in duration-300">
            <div className="space-y-10">
              <div className="flex flex-row-reverse items-center justify-center gap-4">
                <h3 className="text-xl font-black text-slate-800">تنظیم حساب کاربری</h3>
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                   <UserIcon size={24} />
                </div>
              </div>

              <div className="space-y-4 text-right">
                <label className="block text-xs font-bold text-slate-400 mr-2">نام کاربری فعلی</label>
                <input 
                  type="text" 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-base outline-none focus:bg-white transition-all text-center" 
                  value={tempUsername} 
                  onChange={e => setTempUsername(e.target.value)}
                />
              </div>

              <button 
                onClick={handleUpdateUsername}
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-sm shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
              >
                <Save size={18} /> بروزرسانی نام کاربری
              </button>
            </div>

            <div className="h-px bg-slate-50"></div>

            <div className="space-y-10">
              <div className="flex flex-row-reverse items-center justify-center gap-4">
                <h3 className="text-xl font-black text-slate-800">تنظیم رمز عبور جدید</h3>
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                   <Lock size={24} />
                </div>
              </div>

              <div className="space-y-4 text-right relative">
                <label className="block text-xs font-bold text-slate-400 mr-2">رمز عبور جدید</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-base outline-none focus:bg-white transition-all text-center pr-12" 
                    placeholder="رمز عبور..."
                    value={tempPassword}
                    onChange={e => setTempPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleUpdatePassword}
                className="w-full bg-[#e11d48] text-white py-5 rounded-2xl font-black text-sm shadow-lg hover:bg-rose-700 transition-all flex items-center justify-center gap-2 group"
              >
                <ShieldCheck size={18} /> تغییر رمز عبور
              </button>
            </div>

            <div className="pt-10 flex justify-center">
              <button onClick={() => setAppStatus(appStatus === 'ACTIVE' ? 'LOCKED' : 'ACTIVE')} className={`px-8 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 border transition-all ${appStatus === 'LOCKED' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-rose-500'}`}>
                 {appStatus === 'LOCKED' ? 'سیستم قفل است (برای باز کردن کلیک کنید)' : 'قفل امنیتی کل سیستم (Security Lock)'}
                 {appStatus === 'LOCKED' ? <Lock size={14}/> : <ShieldAlert size={14}/>}
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'users' && (
          <div className="max-w-xl mx-auto space-y-10 animate-in fade-in duration-300">
            <div className="flex flex-row-reverse items-center justify-center gap-4 mb-10">
              <h3 className="text-2xl font-black text-slate-800">مدیریت کاربران</h3>
              <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                 <Users size={28} />
              </div>
            </div>

            <div className="space-y-4">
              {users.map(u => (
                <div key={u.id} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-right">
                  <p className="font-black text-slate-800 text-base">{u.fullName} ({u.role === 'admin' ? 'مدیر' : 'اپراتور'})</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wide">نام کاربری: {u.username}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'expenses' && (
          <div className="max-w-xl mx-auto space-y-10 animate-in fade-in duration-300">
            <div className="flex flex-row-reverse items-center justify-center gap-4 mb-10">
              <h3 className="text-2xl font-black text-slate-800">ثبت مصارف دفتر</h3>
              <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                 <Receipt size={28} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-right">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 mr-2">مبلغ هزینه</label>
                <input 
                  type="number" 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-lg outline-none focus:bg-white transition-all text-center tabular-nums" 
                  value={expenseAmount || ''} 
                  onChange={e => setExpenseAmount(Number(e.target.value))} 
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-400 mr-2">شرح مصرف</label>
                <input 
                  type="text" 
                  className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-base outline-none focus:bg-white transition-all text-right" 
                  value={expenseDescription} 
                  onChange={e => setExpenseDescription(e.target.value)} 
                  placeholder="مثلاً: کرایه"
                />
              </div>
            </div>

            <div className="pt-6">
              <button 
                onClick={handleAddExpense}
                className="w-full bg-[#e11d48] text-white py-6 rounded-2xl font-black text-base shadow-xl hover:bg-rose-700 transition-all flex items-center justify-center gap-3 group"
              >
                <Plus size={22} className="group-hover:rotate-90 transition-transform" /> ثبت در دفتر مصارف
              </button>
            </div>
          </div>
        )}

        {activeSubTab === 'backup' && (
          <div className="max-w-3xl mx-auto space-y-10 animate-in fade-in text-right">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4 mb-8">
               <Info className="text-blue-600 shrink-0" size={24} />
               <p className="text-xs font-bold text-blue-900 leading-relaxed">
                  <strong>مرکز بازیابی اضطراری:</strong> اگر برنامه شما حذف شد یا قصد دارید اطلاعات را به کامپیوتر دیگری منتقل کنید، ابتدا فایل پشتیبان را روی فلش ذخیره کنید و سپس در برنامه جدید از بخش «بازیابی از فلش» آن را فراخوانی کنید.
               </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 flex flex-col items-center text-center hover:border-blue-500 transition-all shadow-sm">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl"><Download size={32} /></div>
                  <h4 className="text-xl font-black text-slate-800">ذخیره روی فلش</h4>
                  <p className="text-xs text-slate-500 mt-2 mb-8 leading-relaxed">ایجاد فایل پشتیبان کامل از تمام تراکنش‌ها و حسابات جهت نگهداری در فلش مموری.</p>
                  <button onClick={handleExport} className="w-full bg-[#0f172a] text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3">
                     <HardDrive size={18} /> ساخت فایل پشتیبان
                  </button>
               </div>

               <div className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 flex flex-col items-center text-center hover:border-emerald-500 transition-all shadow-sm">
                  <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl"><RotateCcw size={32} /></div>
                  <h4 className="text-xl font-black text-slate-800">بازیابی از فلش</h4>
                  <p className="text-xs text-slate-500 mt-2 mb-8 leading-relaxed">فراخوانی اطلاعات ذخیره شده در فلش و بازگرداندن تمام اسناد به برنامه جدید.</p>
                  <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
                  <button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3">
                     <Upload size={18} /> انتخاب فایل از فلش
                  </button>
               </div>
            </div>

            <div className="bg-amber-50 p-8 rounded-[2.5rem] border border-amber-100 mt-8">
               <div className="flex items-center gap-3 text-amber-700 mb-4">
                  <AlertTriangle size={20} />
                  <h5 className="font-black text-sm">نکات حیاتی امنیتی:</h5>
               </div>
               <ul className="text-[11px] font-bold text-amber-800 space-y-3 list-disc pr-4">
                  <li>همیشه بعد از اتمام کارهای روزانه، یک نسخه پشتیبان روی فلش ذخیره کنید.</li>
                  <li>در صورت مفقود شدن فایل پشتیبان، اطلاعات قابل بازیابی نخواهند بود.</li>
                  <li>فایل پشتیبان را در جای امن نگهداری کنید زیرا حاوی تمام اسناد مالی شماست.</li>
               </ul>
            </div>
          </div>
        )}

        {activeSubTab === 'dev' && (
          <div className="max-w-md mx-auto space-y-8 animate-in zoom-in-95">
            <div className="p-8 bg-rose-50 border border-rose-100 rounded-[2.5rem]">
              <div className="flex flex-row-reverse items-center gap-3 text-rose-600 mb-6">
                <AlertOctagon size={28} />
                <h3 className="text-lg font-black">پنل سازنده (Developer Only)</h3>
              </div>
              
              {!isDevUnlocked ? (
                <div className="space-y-4">
                  <div className="relative">
                    <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                      type="password" 
                      placeholder="کد فعال‌سازی سازنده" 
                      className="w-full p-5 pr-12 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:border-rose-500 transition-all text-center"
                      value={devPasswordInput}
                      onChange={e => setDevPasswordInput(e.target.value)}
                    />
                  </div>
                  <button onClick={checkDevPassword} className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black shadow-lg">احراز هویت</button>
                </div>
              ) : (
                <div className="space-y-6">
                  <button onClick={handleFactoryReset} className="w-full bg-rose-700 text-white py-6 rounded-2xl font-black text-lg shadow-xl animate-pulse flex items-center justify-center gap-3">
                    <Trash size={24} /> پاکسازی کامل دیتابیس (Reset)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Watermark/Brand */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
           <p className="text-[8px] font-black text-blue-700/40 uppercase tracking-[0.3em] text-center">
              Meraj Salehi Programming and Production Company
           </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
