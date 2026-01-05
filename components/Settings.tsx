
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { 
  Download, Upload, ShieldCheck, Database, 
  AlertTriangle, CheckCircle2, Users, 
  Lock, Key, UserPlus, Trash2, Save, Building, Eye, EyeOff, User as UserIcon,
  Receipt, Plus, Wallet
} from 'lucide-react';
import { Customer, Transaction, User, UserRole, SUPPORTED_CURRENCIES, TransactionType, TransactionStatus } from '../types';

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
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'security' | 'users' | 'backup' | 'expenses'>(isAdmin ? 'general' : 'security');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'none', message: string }>({ type: 'none', message: '' });
  
  // Security States
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [tempUsername, setTempUsername] = useState(currentUser?.username || '');
  
  // General States
  const [tempShopName, setTempShopName] = useState(shopName);

  // User Management States
  const [newUser, setNewUser] = useState({ fullName: '', username: '', password: '', role: 'operator' as UserRole });

  // Expenses States
  const [expenseData, setExpenseData] = useState({ amount: 0, currency: 'AFN', description: '' });

  useEffect(() => {
    if (status.type !== 'none') {
      const timer = setTimeout(() => setStatus({ type: 'none', message: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

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
      setStatus({ type: 'error', message: 'این نام کاربری قبلاً توسط شخص دیگری انتخاب شده است.' });
      return;
    }

    const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, username: tempUsername } : u);
    setUsers(updatedUsers);
    setCurrentUser({ ...currentUser, username: tempUsername });
    setStatus({ type: 'success', message: 'نام کاربری با موفقیت بروزرسانی شد.' });
  };

  const handleSaveShopName = () => {
    setShopName(tempShopName);
    setStatus({ type: 'success', message: 'نام صرافی بروزرسانی شد.' });
  };

  const handleExport = () => {
    const backupData = { version: "3.0", timestamp: Date.now(), data: { users, customers, transactions, shopName } };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
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
          setStatus({ type: 'success', message: 'داده‌ها با موفقیت بازیابی شدند.' });
        }
      } catch (err) {
        setStatus({ type: 'error', message: 'فایل نامعتبر است.' });
      }
    };
    reader.readAsText(file);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseData.amount <= 0 || !expenseData.description) {
      setStatus({ type: 'error', message: 'لطفاً مبلغ و شرح مصرف را وارد کنید.' });
      return;
    }

    const newExpenseTransaction: Transaction = {
      id: 'EXP-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      type: TransactionType.BOARD,
      amount: expenseData.amount,
      currency: expenseData.currency,
      description: `[مصرف] ${expenseData.description}`,
      timestamp: Date.now(),
      status: TransactionStatus.APPROVED,
      isBank: false
    };

    setTransactions(prev => [...prev, newExpenseTransaction]);
    setExpenseData({ amount: 0, currency: 'AFN', description: '' });
    setStatus({ type: 'success', message: 'هزینه با موفقیت در حساب مصارف ثبت شد.' });
  };

  const expenseHistory = useMemo(() => {
    return transactions
      .filter(t => t.description.startsWith('[مصرف]'))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Toast Notification */}
      {status.type !== 'none' && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-xl shadow-lg animate-in slide-in-from-top ${status.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
          {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <p className="font-bold text-sm">{status.message}</p>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 max-w-3xl mx-auto overflow-x-auto scrollbar-hide">
        {isAdmin && (
          <button onClick={() => setActiveSubTab('general')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'general' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>تنظیمات عمومی</button>
        )}
        <button onClick={() => setActiveSubTab('security')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'security' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>امنیت</button>
        {isAdmin && (
          <button onClick={() => setActiveSubTab('expenses')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'expenses' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>مصارف شخصی و دفتر</button>
        )}
        {isAdmin && (
          <button onClick={() => setActiveSubTab('users')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>کاربران</button>
        )}
        {isAdmin && (
          <button onClick={() => setActiveSubTab('backup')} className={`flex-1 py-3 px-4 rounded-xl font-bold text-[10px] transition-all whitespace-nowrap ${activeSubTab === 'backup' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>پشتیبان‌گیری</button>
        )}
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 min-h-[400px]">
        {activeSubTab === 'general' && isAdmin && (
          <div className="max-w-md mx-auto space-y-6 text-right animate-in zoom-in duration-300">
            <div className="flex items-center gap-3 mb-6">
              <Building className="text-blue-600" size={24} />
              <h3 className="text-xl font-black">اطلاعات صرافی</h3>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 mr-1">نام صرافی</label>
              <input type="text" className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-bold outline-none focus:ring-2 focus:ring-blue-500/20" value={tempShopName} onChange={e => setTempShopName(e.target.value)} />
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
              <h3 className="text-xl font-black text-slate-900">ثبت مصارف شخصی و دفتر</h3>
            </div>
            
            <form onSubmit={handleAddExpense} className="max-w-xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
               <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">مبلغ هزینه</label>
                  <div className="flex gap-2">
                    <input type="number" className="flex-1 p-3.5 bg-slate-50 border border-slate-100 rounded-xl font-black text-lg outline-none" placeholder="0" value={expenseData.amount || ''} onChange={e => setExpenseData({...expenseData, amount: Number(e.target.value)})} />
                    <select className="w-24 p-3 bg-slate-100 rounded-xl font-black text-xs outline-none" value={expenseData.currency} onChange={e => setExpenseData({...expenseData, currency: e.target.value})}>
                      {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
               </div>
               <div className="space-y-1.5 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">شرح مصرف (توضیحات)</label>
                  <input type="text" className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none" placeholder="مثلاً: اجاره، برق، کرایه..." value={expenseData.description} onChange={e => setExpenseData({...expenseData, description: e.target.value})} />
               </div>
               <div className="md:col-span-2 pt-2">
                  <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-xl font-black text-sm shadow-lg shadow-rose-100 flex items-center justify-center gap-2 hover:bg-rose-700 transition-all">
                    <Plus size={18} /> ثبت در دفتر مصارف
                  </button>
               </div>
            </form>

            <hr className="border-slate-50" />

            <div className="space-y-4">
               <h4 className="text-sm font-black text-slate-800 text-right">تاریخچه مصارف اخیر</h4>
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-xs">
                   <thead className="bg-slate-50 text-slate-400">
                     <tr>
                       <th className="p-4 font-black">تاریخ</th>
                       <th className="p-4 font-black">شرح مصرف</th>
                       <th className="p-4 font-black">مبلغ</th>
                       <th className="p-4 font-black text-center">عملیات</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                     {expenseHistory.map(exp => (
                       <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                         <td className="p-4 text-slate-400 font-medium tabular-nums">{new Date(exp.timestamp).toLocaleDateString('fa-IR')}</td>
                         <td className="p-4 font-black text-slate-700">{exp.description.replace('[مصرف] ', '')}</td>
                         <td className="p-4 font-black text-rose-600 tabular-nums">{exp.amount.toLocaleString()} <span className="text-[9px] opacity-50">{exp.currency}</span></td>
                         <td className="p-4 text-center">
                            <button onClick={() => {
                              if(confirm('آیا این رکورد مصرف حذف شود؟')) {
                                setTransactions(prev => prev.filter(t => t.id !== exp.id));
                                setStatus({ type: 'success', message: 'رکورد هزینه حذف شد.' });
                              }
                            }} className="p-2 text-rose-300 hover:text-rose-600 transition-colors">
                               <Trash2 size={16} />
                            </button>
                         </td>
                       </tr>
                     ))}
                     {expenseHistory.length === 0 && (
                       <tr><td colSpan={4} className="p-10 text-center text-slate-300 font-bold">هنوز هیچ مصرفی ثبت نشده است.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}

        {activeSubTab === 'security' && (
          <div className="max-w-md mx-auto space-y-10 text-right animate-in zoom-in duration-300">
            {/* Username Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <UserIcon className="text-blue-600" size={24} />
                <h3 className="text-xl font-black">تنظیم نام کاربری</h3>
              </div>
              <form onSubmit={handleUpdateUsername} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 mr-1">نام کاربری فعلی شما</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-black outline-none focus:ring-2 focus:ring-blue-500/20" 
                    value={tempUsername} 
                    onChange={e => setTempUsername(e.target.value)}
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-100 transition-transform active:scale-95">
                  <Save size={18} /> بروزرسانی نام کاربری
                </button>
              </form>
            </div>

            <hr className="border-slate-100" />

            {/* Password Section */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <Lock className="text-rose-600" size={24} />
                <h3 className="text-xl font-black">تنظیم رمز عبور جدید</h3>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 mr-1">رمز عبور جدید</label>
                  <div className="relative">
                    <input 
                      type={showPass ? "text" : "password"} 
                      className="w-full p-4 bg-slate-50 rounded-xl border border-slate-100 font-black outline-none focus:ring-2 focus:ring-rose-500/20" 
                      value={newPassword} 
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="رمز عبور جدید را وارد کنید..."
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <button type="submit" className="w-full bg-rose-600 text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg shadow-rose-100 transition-transform active:scale-95">
                  <ShieldCheck size={18} /> بروزرسانی رمز عبور
                </button>
              </form>
            </div>
          </div>
        )}

        {activeSubTab === 'users' && isAdmin && (
          <div className="space-y-10 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 mb-6 text-right">
              <Users className="text-blue-600" size={24} />
              <h3 className="text-xl font-black">مدیریت دسترسی کاربران</h3>
            </div>
            <div className="grid grid-cols-1 md:divide-x md:divide-x-reverse divide-slate-100">
              <div className="space-y-4 pr-0 md:pr-4">
                {users.map(u => (
                  <div key={u.id} className="p-4 bg-slate-50 rounded-xl flex items-center justify-between group">
                    <div className="text-right">
                      <p className="font-black text-slate-900">{u.fullName}</p>
                      <p className="text-[10px] text-slate-400 font-bold">نام کاربری: {u.username} | {u.role === 'admin' ? 'مدیر' : 'اپراتور'}</p>
                    </div>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => {
                        if(confirm('حذف کاربر؟')) setUsers(prev => prev.filter(user => user.id !== u.id));
                      }} className="p-2 text-rose-300 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'backup' && isAdmin && (
          <div className="max-w-2xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-in zoom-in duration-300">
            <button onClick={handleExport} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-4 hover:bg-blue-50 transition-all">
              <div className="p-4 bg-blue-100 text-blue-600 rounded-2xl"><Download size={32} /></div>
              <p className="font-black">پشتیبان‌گیری (Export)</p>
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col items-center gap-4 hover:bg-amber-50 transition-all">
              <div className="p-4 bg-amber-100 text-amber-600 rounded-2xl"><Upload size={32} /></div>
              <p className="font-black">بازیابی داده‌ها (Import)</p>
              <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
