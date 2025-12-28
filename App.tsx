
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Landmark, 
  BookOpen, 
  CheckCircle, 
  LogOut, 
  Plus, 
  Search,
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  Settings as SettingsIcon,
  Coins,
  Save,
  Lock,
  User as UserIcon,
  ShieldCheck,
  KeyRound,
  Code2
} from 'lucide-react';
import { Customer, BankAccount, Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, User, GlobalRate } from './types';
import Dashboard from './components/Dashboard';
import CustomerManager from './components/CustomerManager';
import BankManager from './components/BankManager';
import Journal from './components/Journal';
import Approvals from './components/Approvals';
import Settings from './components/Settings';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'banks' | 'journal' | 'approvals' | 'settings'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Login & Setup State
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [setupForm, setSetupForm] = useState({ fullName: '', username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Data State - Initialize with default user if empty
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('s_users');
    const parsed = saved ? JSON.parse(saved) : [];
    if (parsed.length === 0) {
      return [{
        id: 'admin-0',
        username: 'Meraj',
        password: '11223344',
        role: 'admin',
        fullName: 'معراج (مدیر)'
      }];
    }
    return parsed;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('s_customers');
    return saved ? JSON.parse(saved) : [
      { id: '1', code: '101', name: 'علی احمدی', phones: ['0799123456'], status: 'active', notes: '', balances: { 'AFN': 50000, 'USD': 1200 } }
    ];
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('s_banks');
    return saved ? JSON.parse(saved) : [
      { id: 'b1', bankName: 'بانک صادرات', accountNumber: '010...123', balance: 12000000, currency: 'IRT_BANK' }
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('s_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [globalRates, setGlobalRates] = useState<GlobalRate[]>(() => {
    const saved = localStorage.getItem('s_rates');
    return saved ? JSON.parse(saved) : [
      { pair: 'USD/AFN', rate: 70.5, lastUpdated: Date.now(), source: 'Manual' }
    ];
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('s_users', JSON.stringify(users));
    localStorage.setItem('s_customers', JSON.stringify(customers));
    localStorage.setItem('s_banks', JSON.stringify(bankAccounts));
    localStorage.setItem('s_transactions', JSON.stringify(transactions));
    localStorage.setItem('s_rates', JSON.stringify(globalRates));
  }, [users, customers, bankAccounts, transactions, globalRates]);

  const handleInitialSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const admin: User = {
      id: 'admin-' + Date.now(),
      fullName: setupForm.fullName,
      username: setupForm.username,
      password: setupForm.password,
      role: 'admin'
    };
    setUsers(prev => [...prev, admin]);
    setCurrentUser(admin);
    setIsLoggedIn(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('نام کاربری یا رمز عبور اشتباه است.');
    }
  };

  const handleLogout = () => {
    if (confirm('آیا مطمئن هستید که می‌خواهید خارج شوید؟')) {
      setIsLoggedIn(false);
      setCurrentUser(null);
      setLoginForm({ username: '', password: '' });
    }
  };

  const stats = useMemo(() => {
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED);
    const cashTransactions = approved.filter(t => !t.bankAccountId);
    const cashBox: Record<string, number> = {};
    SUPPORTED_CURRENCIES.forEach(curr => {
      const resid = cashTransactions.filter(t => t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      const board = cashTransactions.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      cashBox[curr.code] = resid - board;
    });
    const bankSums: Record<string, number> = {};
    bankAccounts.forEach(b => {
        bankSums[b.currency] = (bankSums[b.currency] || 0) + b.balance;
    });
    return { 
      cashBox, 
      bankSums, 
      totalProfit: approved.reduce((acc, t) => acc + (t.profit || 0), 0) 
    };
  }, [transactions, bankAccounts]);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Vazirmatn']" dir="rtl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950"></div>
        <div className="relative w-full max-w-md bg-white/5 backdrop-blur-2xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="bg-blue-600 p-5 rounded-3xl shadow-xl shadow-blue-500/20 mb-6">
              <Lock className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black text-white">ورود به سیستم صرافی جاوید</h1>
            <p className="text-slate-400 text-xs mt-2 font-medium">لطفاً اطلاعات حساب کاربری خود را وارد کنید</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="text" required placeholder="نام کاربری"
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-5 pr-14 pl-5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})}
              />
            </div>
            <div className="relative">
              <KeyRound className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="password" required placeholder="رمز عبور"
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-5 pr-14 pl-5 text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})}
              />
            </div>
            {loginError && <p className="text-rose-500 text-xs font-bold text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all active:scale-95">تائید و ورود</button>
          </form>
          <div className="mt-12 text-center">
             <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Jaweed Exchange Pro v2.6</div>
             <p className="text-[9px] text-slate-600">طراحی شده برای امنیت و دقت بالا در معاملات</p>
             <div className="mt-6 pt-6 border-t border-white/5">
                <p className="text-[9px] text-blue-400/60 font-black">Meraj Salehi Production and Programming Company</p>
                <p className="text-[8px] text-slate-600 mt-1">شرکت تولید و برنامه‌نویسی معراج صالحی</p>
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Vazirmatn']" dir="rtl">
      <aside className="w-72 bg-slate-950 text-white flex flex-col shrink-0 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none"></div>
        <div className="p-8 relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/20">
              <Wallet size={28} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">صرافی جاوید</h1>
              <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-widest">Sarrafi Pro Management</p>
            </div>
          </div>
          
          <nav className="space-y-1.5 flex-1">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="میز کار (داشبورد)" />
            <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">عملیات جاری</div>
            <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={20} />} label="دفتر مشتریان" />
            <NavItem active={activeTab === 'banks'} onClick={() => setActiveTab('banks')} icon={<Landmark size={20} />} label="بانک‌های ایران" />
            <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">حسابداری و نظارت</div>
            <NavItem active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<BookOpen size={20} />} label="روزنامهچه کل" />
            <NavItem active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} icon={<CheckCircle size={20} />} label="تائیدات نهایی" badge={transactions.filter(t => t.status === TransactionStatus.PENDING).length}/>
            <div className="pt-4 pb-2 px-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">تنظیمات</div>
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label="مدیریت و امنیت" />
          </nav>

          <div className="mt-auto py-6 px-4 border-t border-white/5 text-center">
            <div className="flex flex-col items-center gap-1 opacity-40 hover:opacity-100 transition-opacity">
              <Code2 size={16} className="text-blue-500" />
              <p className="text-[8px] font-black uppercase tracking-tighter leading-tight text-slate-400">Developed By</p>
              <p className="text-[9px] font-black text-blue-400 leading-none">Meraj Salehi Production</p>
              <p className="text-[8px] text-slate-600 font-bold">شرکت برنامه‌نویسی معراج صالحی</p>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-900 bg-slate-950/50 relative z-10">
          <div className="flex items-center gap-3 mb-6 p-3 bg-white/5 rounded-2xl border border-white/5">
             <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">{currentUser?.fullName.charAt(0)}</div>
             <div className="overflow-hidden">
                <p className="text-xs font-black truncate">{currentUser?.fullName}</p>
                <p className="text-[9px] text-slate-500 font-bold uppercase">{currentUser?.role === 'admin' ? 'مدیر کل' : 'اپراتور'}</p>
             </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-3 text-slate-500 hover:text-white transition-all group w-full text-right">
            <div className="p-2 bg-slate-900 rounded-xl group-hover:bg-rose-500/10 group-hover:text-rose-500 transition-all"><LogOut size={18} /></div>
            <span className="font-bold text-sm">خروج از سیستم</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-10 py-5 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-black text-slate-900">
              {activeTab === 'dashboard' && "نمای کلی نقدینگی"}
              {activeTab === 'customers' && "حسابداری مشتریان"}
              {activeTab === 'banks' && "مدیریت حساب‌های بانکی"}
              {activeTab === 'journal' && "گزارش روزانه معاملات"}
              {activeTab === 'approvals' && "بررسی و تائید اسناد"}
              {activeTab === 'settings' && "تنظیمات و امنیت"}
            </h2>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex gap-6">
              <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">صندوق (USD)</p><p className="text-sm font-black text-emerald-600">{(stats.cashBox['USD'] || 0).toLocaleString()} $</p></div>
              <div className="text-left border-r border-slate-100 pr-6"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">بانک‌های ایران</p><p className="text-sm font-black text-blue-600">{(stats.bankSums['IRT_BANK'] || 0).toLocaleString()} TB</p></div>
            </div>
            <div className="flex items-center gap-3 bg-slate-50 p-1.5 pr-4 rounded-2xl border border-slate-100">
              <div className="text-right"><p className="text-[10px] font-black text-slate-400">تاریخ امروز</p><p className="text-xs font-bold text-slate-800">{new Date().toLocaleDateString('fa-IR')}</p></div>
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">{currentUser?.fullName.charAt(0)}</div>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto min-h-[calc(100vh-140px)] flex flex-col">
          <div className="flex-1">
            {activeTab === 'dashboard' && <Dashboard stats={stats} bankAccounts={bankAccounts} transactions={transactions} globalRates={globalRates} setGlobalRates={setGlobalRates} />}
            {activeTab === 'customers' && <CustomerManager customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} bankAccounts={bankAccounts} globalRates={globalRates} />}
            {activeTab === 'banks' && <BankManager bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} transactions={transactions} setTransactions={setTransactions} customers={customers} />}
            {activeTab === 'journal' && <Journal transactions={transactions} customers={customers} />}
            {activeTab === 'approvals' && <Approvals transactions={transactions} setTransactions={setTransactions} customers={customers} setCustomers={setCustomers} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} />}
            {activeTab === 'settings' && <Settings users={users} setUsers={setUsers} customers={customers} setCustomers={setCustomers} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} transactions={transactions} setTransactions={setTransactions} currentUser={currentUser} setCurrentUser={setCurrentUser} />}
          </div>

          {/* Persistent Footer Branding */}
          <footer className="mt-16 pt-8 border-t border-slate-200 flex flex-col items-center justify-center text-center opacity-30 hover:opacity-100 transition-opacity">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">طراحی و توسعه توسط</p>
            <p className="text-xs font-black text-blue-600">شرکت تولید و برنامه‌نویسی معراج صالحی</p>
            <p className="text-[9px] font-mono text-slate-400 mt-1">Meraj Salehi Production and Programming Company © {new Date().getFullYear()}</p>
          </footer>
        </div>
      </main>
    </div>
  );
};

interface NavItemProps { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number; }
const NavItem: React.FC<NavItemProps> = ({ active, onClick, icon, label, badge }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 font-bold translate-x-1' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'}`}>
    <div className="flex items-center gap-3"><div>{icon}</div><span className="text-sm">{label}</span></div>
    {badge ? <span className="bg-rose-50 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">{badge}</span> : null}
  </button>
);

export default App;
