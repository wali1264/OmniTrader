
import React, { useRef, useState, useEffect } from 'react';
import { 
  Download, Upload, ShieldCheck, 
  AlertTriangle, CheckCircle2, Users, 
  Lock, Save, Building, Eye, EyeOff, User as UserIcon,
  Receipt, Plus, Trash2, ShieldX, X, AlertOctagon, KeyRound
} from 'lucide-react';
import { Customer, Transaction, User, SUPPORTED_CURRENCIES, TransactionType, TransactionStatus, BankAccount } from '../types';

const SYSTEM_TIME_OFFSET = 3600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;
const DEVELOPER_SECRET_KEY = 'ADMIN@2026'; // رمز مخصوص سازنده

interface SettingsProps {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  shopName: string;
  setShopName: (name: string) => void;
  appStatus: 'ACTIVE' | 'LOCKED';
  setAppStatus: (status: 'ACTIVE' | 'LOCKED') => void;
  isMasterSession: boolean;
}

const Settings: React.FC<SettingsProps> = ({ 
  users, setUsers, customers, setCustomers, 
  transactions, setTransactions, bankAccounts, setBankAccounts,
  currentUser, setCurrentUser, shopName, setShopName,
  appStatus, setAppStatus, isMasterSession
}) => {
  const isAdmin = currentUser?.role === 'admin';
  
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'security' | 'users' | 'backup' | 'expenses'>(isAdmin ? 'general' : 'security');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'none', message: string }>({ type: 'none', message: '' });
  
  // Security Wipe States
  const [showDevAuth, setShowDevAuth] = useState(false);
  const [devPasswordInput, setDevPasswordInput] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  // General Account States
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [tempUsername, setTempUsername] = useState(currentUser?.username || '');
  const [tempShopName, setTempShopName] = useState(shopName);
  const [expenseData, setExpenseData] = useState({ amount: 0, currency: 'AFN', description: '' });

  useEffect(() => {
    if (status.type !== 'none') {
      const timer = setTimeout(() => setStatus({ type: 'none', message: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const handleVerifyDev = (e: React.FormEvent) => {
    e.preventDefault();
    if (devPasswordInput === DEVELOPER_SECRET_KEY) {
      setIsVerified(true);
    } else {
      setStatus({ type: 'error', message: 'رمز سازنده نادرست است!' });
      setDevPasswordInput('');
    }
  };

  const executeFinalWipe = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newPassword.length < 4) {
      setStatus({ type: 'error', message: 'رمز عبور باید حداقل ۴ کاراکتر باشد.' });
      return;
    }
    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: newPassword } : u);
    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, password: newPassword });
    setNewPassword('');
    setStatus({ type: 'success', message: 'رمز عبور با موفقیت تغییر کرد.' });
  };

  const handleUpdateUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !tempUsername) return;
    if (users.find(u => u.username === tempUsername && u.id !== currentUser.id)) {
      setStatus({ type: 'error', message: 'این نام کاربری قبلاً انتخاب شده است.' });
      return;
    }
    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, username: tempUsername } : u);
    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, username: tempUsername });
    setStatus({ type: 'success', message: 'نام کاربری بروزرسانی شد.' });
  };

  const handleSaveShopName = () => {
    setShopName(tempShopName);
    setStatus({ type: 'success', message: 'نام صرافی بروزرسانی شد.' });
  };

  const handleExport = () => {
    const backupData = { version: "3.0", timestamp: getSystemNow(), data: { users, customers, transactions, shopName, bankAccounts } };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_${new Date(getSystemNow()).toISOString().split('T')[0]}.json`;
    link.click();
    setStatus({ type: 'success', message: 'پشتیبان‌گیری انجام شد.' });
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (confirm('آیا مطمئن هستید؟ تمام داده‌های فعلی پاک خواهند شد.')) {
          setUsers(json.data.users);
          setCustomers(json.data.customers);
          setTransactions(json.data.transactions);
          setShopName(json.data.shopName);
          if (json.data.bankAccounts) setBankAccounts(json.data.bankAccounts);
          setStatus({ type: 'success', message: 'داده‌ها بازیابی شدند.' });
        }
      } catch (err) {
        setStatus({ type: 'error', message: 'فایل نامعتبر است.' });
      }
    };
    reader.readAsText(file);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseData.amount <= 0 || !expenseData.description) return;
    const newExpenseTransaction: Transaction = {
      id: 'EXP-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      type: TransactionType.BOARD,
      amount: expenseData.amount,
      currency: expenseData.currency,
      description: `[مصرف] ${expenseData.description}`,
      timestamp: getSystemNow(),
      status: TransactionStatus.APPROVED,
      isBank: false
    };
    setTransactions(prev => [...prev, newExpenseTransaction]);
    setExpenseData({ amount: 0, currency: 'AFN', description: '' });
    setStatus({ type: 'success', message: 'هزینه در دفتر مصارف ثبت شد.' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 font-['Vazirmatn']">
      {status.type !== 'none' && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-xl shadow-lg animate-in slide-in-from-top ${status.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <p className="font-bold text-sm">{status.message}</p>
        </div>
      )}

      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 max-w-3xl mx-auto overflow-x-auto scrollbar-hide text-right" dir="rtl">
        {isAdmin && (
          <button onClick={() => setActiveSubTab('general')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'general' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>تنظیمات عمومی</button>
        )}
        <button onClick={() => setActiveSubTab('security')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'security' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>امنیت</button>
        {isAdmin && (
          <button onClick={() => setActiveSubTab('expenses')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'expenses' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>مصارف دفتر</button>
        )}
        {isAdmin && (
          <button onClick={() => setActiveSubTab('users')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>کاربران</button>
        )}
        {isAdmin && (
          <button onClick={() => setActiveSubTab('backup')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'backup' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>مدیریت داده‌ها</button>
        )}
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[400px] flex flex-col" dir="rtl">
        <div className="flex-1">
            {activeSubTab === 'general' && isAdmin && (
            <div className="max-w-md mx-auto space-y-6 text-right animate-in zoom-in duration-300">
                <div className="flex items-center gap-3 mb-6">
                <Building className="text-blue-600" size={24} />
                <h3 className="text-xl font-black">اطلاعات صرافی</h3>
                </div>
                <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 mr-1">نام صرافی</label>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-right" value={tempShopName} onChange={e => setTempShopName(e.target.value)} />
                </div>
                <button onClick={handleSaveShopName} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2">
                <Save size={18} /> ذخیره تغییرات
                </button>
            </div>
            )}

            {activeSubTab === 'expenses' && isAdmin && (
            <div className="space-y-10 animate-in zoom-in duration-300">
                <div className="flex items-center gap-3 mb-6 text-right">
                <Receipt className="text-rose-600" size={24} />
                <h3 className="text-xl font-black text-slate-900">ثبت مصارف دفتر</h3>
                </div>
                <form onSubmit={handleAddExpense} className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">مبلغ هزینه</label>
                    <div className="flex gap-2">
                        <input type="number" className="flex-1 p-3.5 bg-slate-50 border border-slate-100 rounded-xl font-black text-lg outline-none text-right" placeholder="0" value={expenseData.amount || ''} onChange={e => setExpenseData({...expenseData, amount: Number(e.target.value)})} />
                        <select className="w-24 p-3 bg-slate-100 rounded-xl font-black text-xs outline-none text-right" value={expenseData.currency} onChange={e => setExpenseData({...expenseData, currency: e.target.value})}>
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                    </div>
                </div>
                <div className="space-y-1.5 md:col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">شرح مصرف</label>
                    <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none text-right" placeholder="مثلاً: کرایه" value={expenseData.description} onChange={e => setExpenseData({...expenseData, description: e.target.value})} />
                </div>
                <div className="md:col-span-2 pt-2">
                    <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-rose-100 flex items-center justify-center gap-2 hover:bg-rose-700 transition-all">
                        <Plus size={18} /> ثبت در دفتر مصارف
                    </button>
                </div>
                </form>
            </div>
            )}

            {activeSubTab === 'security' && (
            <div className="max-w-md mx-auto space-y-10 text-right animate-in zoom-in duration-300">
                <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <UserIcon className="text-blue-600" size={24} />
                    <h3 className="text-xl font-black">تنظیم حساب کاربری</h3>
                </div>
                <form onSubmit={handleUpdateUsername} className="space-y-4">
                    <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 mr-1">نام کاربری فعلی</label>
                    <input type="text" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-black outline-none focus:ring-2 focus:ring-blue-500/20 text-right" value={tempUsername} onChange={e => setTempUsername(e.target.value)} />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2">
                    <Save size={18} /> بروزرسانی نام کاربری
                    </button>
                </form>
                </div>

                <hr className="border-slate-100" />

                <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                    <Lock className="text-rose-600" size={24} />
                    <h3 className="text-xl font-black">تنظیم رمز عبور جدید</h3>
                </div>
                <form onSubmit={handleUpdatePassword} className="space-y-6">
                    <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 mr-1">رمز عبور جدید</label>
                    <div className="relative">
                        <input type={showPass ? "text" : "password"} className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-black outline-none focus:ring-2 focus:ring-rose-500/20 text-right" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="رمز عبور..." />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    </div>
                    <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg">
                    <ShieldCheck size={18} /> تغییر رمز عبور
                    </button>
                </form>
                </div>
            </div>
            )}

            {activeSubTab === 'users' && isAdmin && (
            <div className="space-y-10 animate-in fade-in duration-300 text-right">
                <div className="flex items-center gap-3 mb-6">
                <Users className="text-blue-600" size={24} />
                <h3 className="text-xl font-black">مدیریت کاربران</h3>
                </div>
                <div className="grid grid-cols-1 divide-y divide-slate-100">
                {users.map(u => (
                    <div key={u.id} className="p-4 bg-slate-50 rounded-xl flex items-center justify-between group mb-2">
                    <div className="text-right">
                        <p className="font-black text-slate-900">{u.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-bold">نام کاربری: {u.username}</p>
                    </div>
                    {u.id !== currentUser?.id && (
                        <button onClick={() => setUsers(prev => prev.filter(user => user.id !== u.id))} className="p-2 text-rose-300 hover:text-rose-600"><Trash2 size={18} /></button>
                    )}
                    </div>
                ))}
                </div>
            </div>
            )}

            {activeSubTab === 'backup' && isAdmin && (
            <div className="space-y-10 animate-in zoom-in duration-300 text-right">
                <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button onClick={handleExport} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-4 hover:bg-blue-50 transition-all">
                      <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl"><Download size={32} /></div>
                      <p className="font-black">بکاپ اطلاعات (Export)</p>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-4 hover:bg-amber-50 transition-all">
                      <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl"><Upload size={32} /></div>
                      <p className="font-black">بازیابی اطلاعات (Import)</p>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                  </button>
                </div>

                <div className="max-w-2xl mx-auto pt-10 border-t border-slate-50">
                  <div className="bg-rose-50 border border-rose-100 p-8 rounded-[2.5rem] space-y-6 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-900/20">
                        <ShieldX size={32} />
                      </div>
                      <h3 className="text-xl font-black text-rose-800">حذف کامل اطلاعات صرافی</h3>
                      <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest leading-relaxed">این عملیات فقط با رمز مخصوص سازنده مجاز است.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowDevAuth(true);
                        setIsVerified(false);
                        setDevPasswordInput('');
                      }}
                      className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <Trash2 size={20} /> پاکسازی کامل و امحاء تمام اطلاعات سیستم
                    </button>
                  </div>
                </div>
            </div>
            )}
        </div>
      </div>
      
      {/* صفحه/مدال تأیید هویت و امحاء سازنده */}
      {showDevAuth && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-300 relative text-right">
            <button 
              onClick={() => setShowDevAuth(false)}
              className="absolute top-6 left-6 p-2 text-slate-400 hover:text-slate-900 transition-all"
            >
              <X size={24} />
            </button>

            {!isVerified ? (
              <div className="space-y-8 animate-in slide-in-from-bottom duration-300">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl">
                    <KeyRound size={32} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-slate-900">🔐 تأیید هویت سازنده</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Master Identity Authentication Required</p>
                  </div>
                </div>

                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-800 font-bold leading-relaxed text-center">
                    این عملیات فوق‌حساس فقط توسط سازنده اپلیکیشن قابل اجراست.
                    لطفاً رمز مخصوص سازنده را جهت بازگشایی پنل امحاء وارد کنید.
                  </p>
                </div>

                <form onSubmit={handleVerifyDev} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">رمز مخصوص سازنده</label>
                    <input 
                      type="password"
                      autoFocus
                      className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-center text-xl outline-none focus:ring-4 focus:ring-blue-100 transition-all tabular-nums"
                      placeholder="••••••••"
                      value={devPasswordInput}
                      onChange={e => setDevPasswordInput(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      type="submit"
                      className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-black shadow-xl"
                    >
                      <ShieldCheck size={20} /> تأیید و ورود
                    </button>
                    <button 
                      type="button"
                      onClick={() => setShowDevAuth(false)}
                      className="px-6 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs"
                    >
                      لغو
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-rose-600 text-white rounded-2xl animate-pulse shadow-xl shadow-rose-900/20">
                    <AlertOctagon size={40} />
                  </div>
                  <div className="text-center">
                    <h3 className="text-2xl font-black text-rose-600">⚠️ هشدار نهایی امنیتی</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest text-center">Irreversible Data Destruction Process</p>
                  </div>
                </div>

                <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 text-right space-y-4">
                  <p className="text-xs text-rose-900 font-black leading-relaxed text-center">
                    تمام اطلاعات صرافی (صندوق، مشتریان، تبادلات...) به صورت کامل و غیرقابل بازگشت حذف خواهد شد.
                  </p>
                  <div className="flex flex-col gap-2">
                     <span className="flex items-center gap-2 text-[10px] font-bold text-rose-700">
                       <CheckCircle2 size={12} /> انحلال تمام دفاتر حسابداری
                     </span>
                     <span className="flex items-center gap-2 text-[10px] font-bold text-rose-700">
                       <CheckCircle2 size={12} /> پاکسازی تاریخچه تراکنش‌ها
                     </span>
                     <span className="flex items-center gap-2 text-[10px] font-bold text-rose-700">
                       <CheckCircle2 size={12} /> ریست کامل تنظیمات سیستم
                     </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={executeFinalWipe}
                    className="w-full bg-rose-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-rose-900/20 hover:bg-rose-700 active:scale-95 transition-all"
                  >
                    حذف نهایی و امحاء کل داده‌ها
                  </button>
                  <button 
                    onClick={() => {
                        setIsVerified(false);
                        setShowDevAuth(false);
                    }}
                    className="w-full bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs"
                  >
                    انصراف و بازگشت به تنظیمات
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* فوتر اطلاعات سازنده */}
      <div className="pt-6 text-center opacity-30 select-none">
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Meraj Salehi Production and Programming Company</p>
      </div>
    </div>
  );
};

export default Settings;
