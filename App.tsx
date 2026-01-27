import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, BookOpen, CheckCircle, LogOut, Wallet, 
  Settings as SettingsIcon, Briefcase, PieChart, Landmark, Sparkles, Zap,
  ArrowRightLeft, CreditCard, Printer, ShieldCheck, Percent, Code2, ShieldAlert, CalendarRange, ChevronLeft
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, User, GlobalRate, BankAccount, Customer } from './types';
import Dashboard from './components/Dashboard';
import CustomerManager from './components/CustomerManager';
import Journal from './components/Journal';
import Approvals from './components/Approvals';
import Settings from './components/Settings';
import AssetCalculator from './components/AssetCalculator';
import CashBoxManager from './components/CashBoxManager';
import BankManager from './BankManager';
import ExchangeBalances from './components/ExchangeBalances';
import BankTransactions from './components/BankTransactions';
import ReportManager from './components/ReportManager';
import WalkinManager from './components/WalkinManager';
import CommissionManager from './components/CommissionManager';
import PeriodicBalances from './components/PeriodicBalances';

const SYSTEM_TIME_OFFSET = -21600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;
const MASTER_PASSWORD = '1234566';

// Fixed NavGroup definition using PropsWithChildren to ensure 'children' is correctly handled by the type checker
const NavGroup = ({ label, children }: React.PropsWithChildren<{ label: string }>) => (
  <div className="mb-6">
    <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">{label}</p>
    <div className="space-y-0.5">
      {children}
    </div>
  </div>
);

// Defined NavItemProps interface for better type safety
interface NavItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

// Fixed NavItem definition by replacing 'any' with NavItemProps
const NavItem = ({ active, onClick, icon, label, badge }: NavItemProps) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all group ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}>
    <div className="flex items-center gap-3">
      <div className={`transition-all ${active ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`}>
        {icon}
      </div>
      <span className={`text-[11px] font-bold tracking-tight transition-all ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>{label}</span>
    </div>
    {badge ? (
      <span className="bg-rose-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black shadow-inner ring-2 ring-white/10">{badge}</span>
    ) : (
      <ChevronLeft size={12} className={`opacity-0 transition-all ${active ? 'opacity-30' : 'group-hover:opacity-20'}`} />
    )}
  </button>
);

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'bankAccounts' | 'journal' | 'approvals' | 'assets' | 'cashbox' | 'settings' | 'exchange' | 'bankTransactions' | 'reports' | 'walkin' | 'commission' | 'periodicBalances'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMasterSession, setIsMasterSession] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [shopName, setShopName] = useState(() => localStorage.getItem('s_shopName') || 'صرافی جاوید (Sarrafi Pro)');
  const [appStatus, setAppStatus] = useState<'ACTIVE' | 'LOCKED'>(() => (localStorage.getItem('s_appStatus') as 'ACTIVE' | 'LOCKED') || 'ACTIVE');

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('s_users');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length ? parsed : [{ id: 'admin-0', username: 'Meraj', password: '11223344', role: 'admin', fullName: 'معراج (مدیر)' }];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => JSON.parse(localStorage.getItem('s_customers') || '[]'));
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => JSON.parse(localStorage.getItem('s_bankAccounts') || '[]'));
  const [transactions, setTransactions] = useState<Transaction[]>(() => JSON.parse(localStorage.getItem('s_transactions') || '[]'));
  const [globalRates, setGlobalRates] = useState<GlobalRate[]>(() => JSON.parse(localStorage.getItem('s_rates') || '[]'));

  useEffect(() => {
    localStorage.setItem('s_users', JSON.stringify(users));
    localStorage.setItem('s_customers', JSON.stringify(customers));
    localStorage.setItem('s_transactions', JSON.stringify(transactions));
    localStorage.setItem('s_rates', JSON.stringify(globalRates));
    localStorage.setItem('s_bankAccounts', JSON.stringify(bankAccounts));
    localStorage.setItem('s_shopName', shopName);
    localStorage.setItem('s_appStatus', appStatus);
  }, [users, customers, transactions, globalRates, shopName, bankAccounts, appStatus]);

  const stats = useMemo(() => {
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED);
    const cashBox: Record<string, number> = {};
    SUPPORTED_CURRENCIES.forEach(curr => {
      const resid = approved.filter(t => !t.isBank && t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      const board = approved.filter(t => !t.isBank && t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      const exchangeIn = approved.filter(t => !t.isBank && t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
      const exchangeOut = approved.filter(t => !t.isBank && t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      cashBox[curr.code] = (resid + exchangeIn) - (board + exchangeOut);
    });
    return { 
      cashBox, 
      totalCashProfit: approved.filter(t => !t.isBank).reduce((sum, t) => sum + (t.netProfit || 0), 0),
      totalBankProfit: approved.filter(t => t.isBank).reduce((sum, t) => sum + (t.netProfit || 0), 0)
    };
  }, [transactions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginForm.password === MASTER_PASSWORD) {
      setCurrentUser(users[0]);
      setIsLoggedIn(true);
      setIsMasterSession(true);
      setAppStatus('ACTIVE');
      return;
    }
    if (appStatus === 'LOCKED') { setLoginError('سیستم قفل است.'); return; }
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) { setCurrentUser(user); setIsLoggedIn(true); setIsMasterSession(false); } 
    else { setLoginError('خطا در ورود.'); }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 font-['Vazirmatn']" dir="rtl">
        <div className="w-full max-w-sm bg-[#0f172a] p-10 rounded-3xl border border-slate-800 shadow-2xl">
          <div className="flex justify-center mb-10">
            <div className={`w-16 h-16 ${appStatus === 'LOCKED' ? 'bg-rose-600' : 'bg-blue-600'} rounded-2xl flex items-center justify-center text-white shadow-xl ring-4 ring-slate-800/50`}>
              {appStatus === 'LOCKED' ? <ShieldAlert size={32} /> : <ShieldCheck size={32} />}
            </div>
          </div>
          <div className="text-center mb-8">
            <p className="text-[14px] font-black text-blue-400 uppercase tracking-widest mb-1">معراج</p>
            <h1 className="text-xl font-black text-white tracking-tight">پنل مدیریت صرافی</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5 text-right">
              <label className="text-[10px] font-bold text-slate-500 mr-2 uppercase tracking-widest">شناسه کاربری</label>
              <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3.5 px-5 text-white outline-none focus:border-blue-500 transition-all text-right font-bold" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            </div>
            <div className="space-y-1.5 text-right">
              <label className="text-[10px] font-bold text-slate-500 mr-2 uppercase tracking-widest">گذرواژه</label>
              <input type="password" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3.5 px-5 text-white outline-none focus:border-blue-500 transition-all text-right font-bold" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black shadow-lg transition-all active:scale-[0.98]">ورود ایمن</button>
            {loginError && <p className="text-rose-500 text-center text-xs font-black mt-4 bg-rose-500/10 py-2 rounded-lg">{loginError}</p>}
          </form>
          <div className="mt-12 pt-6 border-t border-slate-800/50 text-center">
            <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest leading-relaxed opacity-70">
              Meraj Salehi Programming and Production Company
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f1f5f9] overflow-hidden font-['Vazirmatn'] text-right" dir="rtl">
      {/* سایدبار رسمی */}
      <aside className="w-72 bg-[#0f172a] text-white flex flex-col shrink-0 print:hidden overflow-hidden shadow-2xl z-20">
        <div className="p-8 flex flex-col items-center border-b border-slate-800/50 bg-[#111a31]">
           <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4 ring-2 ring-white/10">
             <Briefcase size={28} />
           </div>
           <h1 className="text-sm font-black text-white text-center leading-tight">{shopName}</h1>
           <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-2">Enterprise Edition</p>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-1">
          <nav className="space-y-0.5">
            <NavGroup label="اصلی">
              <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18} />} label="داشبورد مدیریتی" />
              <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={18} />} label="بانک اطلاعات مشتریان" />
              <NavItem active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<BookOpen size={18} />} label="روزنامچه مالی" />
            </NavGroup>

            <NavGroup label="عملیات ارزی">
              <NavItem active={activeTab === 'walkin'} onClick={() => setActiveTab('walkin')} icon={<Zap size={18} />} label="معاملات بازار" />
              <NavItem active={activeTab === 'exchange'} onClick={() => setActiveTab('exchange')} icon={<ArrowRightLeft size={18} />} label="تبادلات ارزی" />
              <NavItem active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} icon={<Percent size={18} />} label="محاسبه کمیشن" />
            </NavGroup>

            <NavGroup label="بانک و نقدینگی">
              <NavItem active={activeTab === 'bankTransactions'} onClick={() => setActiveTab('bankTransactions')} icon={<CreditCard size={18} />} label="تراکنش‌های بانکی" />
              <NavItem active={activeTab === 'bankAccounts'} onClick={() => setActiveTab('bankAccounts')} icon={<Landmark size={18} />} label="مدیریت حساب‌های بانکی" />
              <NavItem active={activeTab === 'cashbox'} onClick={() => setActiveTab('cashbox')} icon={<Wallet size={18} />} label="مدیریت صندوق نقد" />
            </NavGroup>

            <NavGroup label="گزارشات و کنترل">
              <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<Printer size={18} />} label="صدور گزارشات" />
              <NavItem active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} icon={<CheckCircle size={18} />} label="تائیدات معلق" badge={transactions.filter(t => t.status === TransactionStatus.PENDING).length}/>
              <NavItem active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<PieChart size={18} />} label="تراز کل دارایی‌ها" />
              <NavItem active={activeTab === 'periodicBalances'} onClick={() => setActiveTab('periodicBalances')} icon={<CalendarRange size={18} />} label="تراز دوره‌ای حسابات" />
            </NavGroup>

            <NavGroup label="سیستم">
              <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={18} />} label="تنظیمات سامانه" />
            </NavGroup>
          </nav>
        </div>

        <div className="p-6 bg-[#0c1325] border-t border-slate-800/40 text-center">
          <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-widest leading-relaxed">
            Meraj Salehi Programming and Production Company
          </p>
        </div>
      </aside>

      {/* محتوای اصلی */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-10 py-4 flex justify-between items-center print:hidden shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest">{shopName}</h2>
          </div>
          <div className="flex items-center gap-6">
             <div className="text-right border-l pl-6 border-slate-100">
                <span className="block text-[11px] font-black text-slate-800">{currentUser?.fullName}</span>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-tight">{currentUser?.role} Account</span>
             </div>
             <div className="flex items-center gap-3 group cursor-pointer" onClick={() => setIsLoggedIn(false)}>
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-blue-600 border border-slate-100 transition-all group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-lg">
                   {currentUser?.fullName.charAt(0)}
                </div>
                <LogOut size={16} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar print:p-0 bg-[#f8fafc]">
          <div className="max-w-[1600px] mx-auto">
            {activeTab === 'dashboard' && <Dashboard stats={stats} transactions={transactions} globalRates={globalRates} setGlobalRates={() => {}} bankAccounts={bankAccounts} />}
            {activeTab === 'customers' && <CustomerManager customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} globalRates={globalRates} setGlobalRates={() => {}} />}
            {activeTab === 'walkin' && <WalkinManager transactions={transactions} setTransactions={setTransactions} shopName={shopName} currentUser={currentUser} />}
            {activeTab === 'exchange' && <ExchangeBalances transactions={transactions} setTransactions={setTransactions} globalRates={globalRates} customers={customers} />}
            {activeTab === 'bankTransactions' && <BankTransactions customers={customers} transactions={transactions} setTransactions={setTransactions} bankAccounts={bankAccounts} />}
            {activeTab === 'commission' && <CommissionManager transactions={transactions} customers={customers} />}
            {activeTab === 'journal' && <Journal transactions={transactions} customers={customers} globalRates={globalRates} />}
            {activeTab === 'approvals' && <Approvals transactions={transactions} setTransactions={setTransactions} customers={customers} setCustomers={setCustomers} />}
            {activeTab === 'cashbox' && <CashBoxManager transactions={transactions} stats={stats} currentUser={currentUser} customers={customers} shopName={shopName} />}
            {activeTab === 'bankAccounts' && <BankManager bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} transactions={transactions} setTransactions={setTransactions} customers={customers} />}
            {activeTab === 'assets' && <AssetCalculator customers={customers} stats={stats} globalRates={globalRates} />}
            {activeTab === 'periodicBalances' && <PeriodicBalances transactions={transactions} customers={customers} setCustomers={setCustomers} />}
            {activeTab === 'settings' && <Settings users={users} setUsers={setUsers} customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} globalRates={globalRates} setGlobalRates={setGlobalRates} currentUser={currentUser} setCurrentUser={setCurrentUser} shopName={shopName} setShopName={setShopName} appStatus={appStatus} setAppStatus={setAppStatus} isMasterSession={isMasterSession} />}
            {activeTab === 'reports' && <ReportManager transactions={transactions} customers={customers} shopName={shopName} />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;