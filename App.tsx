
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, BookOpen, CheckCircle, LogOut, Wallet, 
  Settings as SettingsIcon, Briefcase, ArrowRightLeft, PieChart, HelpCircle, 
  Lock, Landmark, Sparkles, ShieldCheck
} from 'lucide-react';
import { Customer, Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, User, GlobalRate, BankAccount } from './types';
import Dashboard from './components/Dashboard';
import CustomerManager from './components/CustomerManager';
import Journal from './components/Journal';
import Approvals from './components/Approvals';
import Settings from './components/Settings';
import AssetCalculator from './components/AssetCalculator';
import AnonymousDeposits from './components/AnonymousDeposits';
import CashBoxManager from './components/CashBoxManager';
import ExchangeBalances from './components/ExchangeBalances';
import BankManager from './components/BankManager';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'bankAccounts' | 'journal' | 'approvals' | 'assets' | 'anonymous' | 'cashbox' | 'exchange' | 'settings'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [shopName, setShopName] = useState(() => localStorage.getItem('s_shopName') || 'صرافی جاوید');

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('s_users');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length ? parsed : [{ id: 'admin-0', username: 'Meraj', password: '11223344', role: 'admin', fullName: 'معراج (مدیر)' }];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('s_customers');
    return saved ? JSON.parse(saved) : [{ id: '1', code: '101', name: 'علی احمدی', phones: ['0799123456'], status: 'active', notes: '', balances: { 'AFN': 50000, 'USD': 1200 } }];
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('s_bankAccounts');
    return saved ? JSON.parse(saved) : [
      { id: 'b1', bankName: 'بانک ملت', accountNumber: '1234-5678', balance: 0, currency: 'IRT_BANK' },
      { id: 'b2', bankName: 'بانک ملی', accountNumber: '9876-5432', balance: 0, currency: 'IRT_BANK' }
    ];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('s_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [globalRates, setGlobalRates] = useState<GlobalRate[]>(() => {
    const saved = localStorage.getItem('s_rates');
    return saved ? JSON.parse(saved) : [{ currencyCode: 'USD', rateToAfn: 70.5, lastUpdated: Date.now(), source: 'Manual' }];
  });

  useEffect(() => {
    localStorage.setItem('s_users', JSON.stringify(users));
    localStorage.setItem('s_customers', JSON.stringify(customers));
    localStorage.setItem('s_transactions', JSON.stringify(transactions));
    localStorage.setItem('s_rates', JSON.stringify(globalRates));
    localStorage.setItem('s_bankAccounts', JSON.stringify(bankAccounts));
    localStorage.setItem('s_shopName', shopName);
  }, [users, customers, transactions, globalRates, shopName, bankAccounts]);

  const stats = useMemo(() => {
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED);
    const approvedCash = approved.filter(t => !t.isBank);
    
    const cashBox: Record<string, number> = {};
    SUPPORTED_CURRENCIES.forEach(curr => {
      const resid = approvedCash.filter(t => (t.type === TransactionType.RESID && t.currency === curr.code) || (t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code)).reduce((sum, t) => sum + (t.type === TransactionType.EXCHANGE ? (t.convertedAmount || 0) : t.amount), 0);
      const board = approvedCash.filter(t => (t.type === TransactionType.BOARD && t.currency === curr.code) || (t.type === TransactionType.EXCHANGE && t.currency === curr.code)).reduce((sum, t) => sum + t.amount, 0);
      cashBox[curr.code] = resid - board;
    });

    return { 
      cashBox, 
      totalProfit: approved.reduce((acc, t) => acc + (t.netProfit || t.profit || 0), 0) 
    };
  }, [transactions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) { setCurrentUser(user); setIsLoggedIn(true); setLoginError(''); }
    else { setLoginError('نام کاربری یا رمز عبور اشتباه است.'); }
  };

  const LuxuriousBrand = ({ className, size = 'md' }: { className?: string, size?: 'sm' | 'md' | 'lg' }) => (
    <div className={`flex flex-col items-center justify-center select-none group transition-all duration-700 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="h-px w-8 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent group-hover:w-12 transition-all duration-1000"></div>
        <div className="relative">
          <Sparkles size={size === 'sm' ? 12 : 16} className="text-blue-500 absolute -top-4 -right-4 animate-pulse opacity-50" />
          <span className={`font-black uppercase tracking-[0.2em] text-blue-600/60 transition-all duration-700 group-hover:text-blue-500 group-hover:tracking-[0.25em] ${size === 'sm' ? 'text-[8px]' : 'text-[10px]'}`}>
            Meraj Salehi
          </span>
        </div>
        <div className="h-px w-8 bg-gradient-to-r from-transparent via-blue-500/50 to-transparent group-hover:w-12 transition-all duration-1000"></div>
      </div>
      <div className={`font-medium uppercase tracking-[0.4em] text-blue-400/40 mt-1.5 transition-all duration-1000 group-hover:text-blue-400 group-hover:opacity-80 ${size === 'sm' ? 'text-[6px]' : 'text-[7px]'}`}>
        Production & Programming Company
      </div>
      <div className="mt-2 w-0 h-0.5 bg-blue-500/20 group-hover:w-full transition-all duration-700 rounded-full"></div>
    </div>
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-['Vazirmatn'] relative overflow-hidden" dir="rtl">
        <div className="absolute top-1/4 -right-24 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-1/4 -left-24 w-96 h-96 bg-indigo-600/10 blur-[120px] rounded-full"></div>
        
        <div className="relative w-full max-w-md bg-white/5 backdrop-blur-3xl p-14 rounded-[4rem] border border-white/10 shadow-[0_35px_100px_-15px_rgba(0,0,0,0.6)] mb-12">
          <div className="flex flex-col items-center mb-12 text-center text-white">
            <div className="relative mb-8">
               <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-20 animate-pulse"></div>
               <div className="relative bg-gradient-to-br from-blue-500 to-indigo-700 p-6 rounded-[2rem] shadow-2xl ring-1 ring-white/20">
                 <ShieldCheck size={40} className="text-white" />
               </div>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white mb-2">خوش آمدید</h1>
            <p className="text-slate-400 text-xs font-bold opacity-60">پنل اختصاصی مدیریت صرافی {shopName}</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-2">
              <input type="text" required placeholder="نام کاربری" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white outline-none focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all font-bold" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            </div>
            <div className="space-y-2">
              <input type="password" required placeholder="رمز عبور" className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-white outline-none focus:bg-white/10 focus:ring-2 focus:ring-blue-500/20 transition-all font-bold" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            </div>
            {loginError && <p className="text-rose-500 text-[10px] font-black text-center animate-bounce">{loginError}</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6 rounded-2xl font-black text-lg shadow-2xl shadow-blue-900/40 hover:scale-[1.02] active:scale-95 transition-all">
              ورود امن به پنل
            </button>
          </form>
        </div>
        
        <LuxuriousBrand />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Vazirmatn'] relative" dir="rtl">
      
      <div className="fixed bottom-10 left-10 z-[100] pointer-events-none opacity-50 hover:opacity-100 transition-opacity">
        <LuxuriousBrand size="sm" className="items-start" />
      </div>

      <aside className="w-72 bg-slate-950 text-white flex flex-col shrink-0 relative z-10 shadow-[20px_0_60px_-15px_rgba(0,0,0,0.3)]">
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3.5 rounded-2xl shadow-xl shadow-blue-900/50 ring-1 ring-white/10">
              <Wallet size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black truncate tracking-tight leading-none mb-1">{shopName}</h1>
              <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest opacity-60">Elite Accounting System</span>
            </div>
          </div>
          
          <nav className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18} />} label="داشبورد" />
            <NavItem active={activeTab === 'cashbox'} onClick={() => setActiveTab('cashbox')} icon={<Briefcase size={18} />} label="صندوق نقد" />
            <NavItem active={activeTab === 'bankAccounts'} onClick={() => setActiveTab('bankAccounts')} icon={<Landmark size={18} />} label="حسابات بانکی" />
            <NavItem active={activeTab === 'exchange'} onClick={() => setActiveTab('exchange')} icon={<ArrowRightLeft size={18} />} label="تبادل و بیلانس" />
            <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={18} />} label="مشتریان" />
            <NavItem active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<BookOpen size={18} />} label="روزنامهچه" />
            <NavItem active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} icon={<CheckCircle size={18} />} label="تائیدات" badge={transactions.filter(t => t.status === TransactionStatus.PENDING).length}/>
            <NavItem active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<PieChart size={18} />} label="دارائی‌ها" />
            <NavItem active={activeTab === 'anonymous'} onClick={() => setActiveTab('anonymous')} icon={<HelpCircle size={18} />} label="وجوه نامشخص" />
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={18} />} label="تنظیمات" />
          </nav>

          <div className="pt-6 border-t border-white/5 space-y-4">
             <button onClick={() => setIsLoggedIn(false)} className="w-full flex items-center gap-4 text-slate-500 hover:text-rose-400 transition-all p-3 group">
              <div className="bg-slate-900 p-2 rounded-xl group-hover:bg-rose-500/10 transition-colors">
                <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> 
              </div>
              <span className="font-bold text-xs uppercase tracking-tight">خروج از پنل</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 px-12 py-5 flex justify-between items-center shadow-sm relative z-20">
          <div className="flex items-center gap-6">
             <h2 className="text-xl font-black text-slate-900 tracking-tight">سیستم یکپارچه مدیریت مالی</h2>
             <div className="h-4 w-px bg-slate-200"></div>
             <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">Pro Edition v3.5</span>
          </div>
          
          <div className="flex items-center gap-10">
              <div className="flex items-center gap-6 border-r border-slate-100 pr-8">
                  <div className="text-left">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">موجودی نقد (USD)</p>
                    <p className="text-xl font-black text-emerald-600 leading-none tabular-nums">
                      {(stats.cashBox['USD'] || 0).toLocaleString()} <span className="text-[10px]">$</span>
                    </p>
                  </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-left">
                   <p className="text-[10px] font-black text-slate-900 leading-none">{currentUser?.fullName}</p>
                   <p className="text-[8px] font-black text-slate-400 uppercase mt-1">Authorized Admin</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white flex items-center justify-center text-slate-500 font-black shadow-inner shadow-slate-300">
                  {currentUser?.fullName.charAt(0)}
                </div>
              </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 relative">
          <div className="px-12 py-10 w-full max-w-[2200px] mx-auto min-h-screen">
              {activeTab === 'dashboard' && <Dashboard stats={stats} transactions={transactions} globalRates={globalRates} setGlobalRates={setGlobalRates} bankAccounts={bankAccounts} />}
              {activeTab === 'customers' && <CustomerManager customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} globalRates={globalRates} />}
              {activeTab === 'bankAccounts' && <BankManager bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} transactions={transactions} setTransactions={setTransactions} customers={customers} />}
              {activeTab === 'journal' && <Journal transactions={transactions} customers={customers} />}
              {activeTab === 'approvals' && <Approvals transactions={transactions} setTransactions={setTransactions} customers={customers} setCustomers={setCustomers} />}
              {activeTab === 'assets' && <AssetCalculator customers={customers} stats={stats} globalRates={globalRates} />}
              {activeTab === 'anonymous' && <AnonymousDeposits transactions={transactions} setTransactions={setTransactions} customers={customers} />}
              {activeTab === 'cashbox' && <CashBoxManager transactions={transactions} stats={stats} currentUser={currentUser} customers={customers} shopName={shopName} />}
              {activeTab === 'exchange' && <ExchangeBalances transactions={transactions} globalRates={globalRates} />}
              {activeTab === 'settings' && <Settings users={users} setUsers={setUsers} customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} currentUser={currentUser} setCurrentUser={setCurrentUser} shopName={shopName} setShopName={setShopName} />}
          </div>
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl transition-all duration-300 group ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30 ring-1 ring-blue-400/50' : 'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}>
    <div className="flex items-center gap-3">
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
      <span className={`text-[13px] font-bold tracking-tight transition-all duration-300 ${active ? 'translate-x-1' : ''}`}>{label}</span>
    </div>
    {badge ? (
      <div className="relative">
        <div className="absolute inset-0 bg-rose-500 blur-sm opacity-50 animate-pulse"></div>
        <span className="relative bg-rose-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black">{badge}</span>
      </div>
    ) : null}
  </button>
);

export default App;
