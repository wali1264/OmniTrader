
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, BookOpen, CheckCircle, LogOut, Wallet, 
  Settings as SettingsIcon, Briefcase, PieChart, Landmark, Sparkles, Zap,
  ArrowRightLeft, CreditCard, Printer, ShieldCheck, Percent, Code2, ShieldAlert, CalendarRange
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

// تنظیم زمان سیستم به ۶ ساعت قبل (۲۱.۶ میلیون میلی‌ثانیه)
const SYSTEM_TIME_OFFSET = -21600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;
const MASTER_PASSWORD = '1234566';

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
        <div className="w-full max-w-sm bg-[#0f172a] p-10 rounded-2xl border border-slate-800 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className={`w-14 h-14 ${appStatus === 'LOCKED' ? 'bg-rose-600' : 'bg-blue-600'} rounded-xl flex items-center justify-center text-white shadow-lg`}>
              {appStatus === 'LOCKED' ? <ShieldAlert size={28} /> : <ShieldCheck size={28} />}
            </div>
          </div>
          <h1 className="text-xl font-bold text-white text-center mb-6">ورود به سیستم صرافی</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" placeholder="شناسه کاربری" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-5 text-white outline-none focus:border-blue-500 text-right" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" placeholder="گذرواژه" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-5 text-white outline-none focus:border-blue-500 text-right" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-xl">تائید و ورود</button>
            {loginError && <p className="text-rose-500 text-center text-xs font-bold mt-4">{loginError}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Vazirmatn'] text-right" dir="rtl">
      <aside className="w-64 bg-[#0f172a] text-white flex flex-col shrink-0 print:hidden overflow-y-auto custom-scrollbar">
        <div className="p-6">
          <div className="flex flex-col items-center gap-2 mb-8 pb-6 border-b border-slate-800">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm mb-2"><Briefcase size={20} /></div>
            <h1 className="text-[11px] font-black text-slate-100 uppercase tracking-wide">{shopName}</h1>
          </div>
          <nav className="space-y-1">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={16} />} label="داشبورد" />
            <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={16} />} label="مشتریان" />
            <NavItem active={activeTab === 'walkin'} onClick={() => setActiveTab('walkin')} icon={<Zap size={16} />} label="راه‌روی" />
            <NavItem active={activeTab === 'exchange'} onClick={() => setActiveTab('exchange')} icon={<ArrowRightLeft size={16} />} label="تبادلات" />
            <NavItem active={activeTab === 'bankTransactions'} onClick={() => setActiveTab('bankTransactions')} icon={<CreditCard size={16} />} label="بانک‌ها" />
            <NavItem active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} icon={<Percent size={16} />} label="کمیشن" />
            <NavItem active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<BookOpen size={16} />} label="روزنامچه" />
            <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<Printer size={16} />} label="گزارشات" />
            <NavItem active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} icon={<CheckCircle size={16} />} label="تائیدات" badge={transactions.filter(t => t.status === TransactionStatus.PENDING).length}/>
            <div className="h-px bg-slate-800 my-4 opacity-40"></div>
            <NavItem active={activeTab === 'cashbox'} onClick={() => setActiveTab('cashbox')} icon={<Wallet size={16} />} label="صندوق" />
            <NavItem active={activeTab === 'bankAccounts'} onClick={() => setActiveTab('bankAccounts')} icon={<Landmark size={16} />} label="مدیریت بانک" />
            <NavItem active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<PieChart size={16} />} label="دارایی‌ها (تراز)" />
            <NavItem active={activeTab === 'periodicBalances'} onClick={() => setActiveTab('periodicBalances')} icon={<CalendarRange size={16} />} label="تراز دوره‌ای" />
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={16} />} label="تنظیمات" />
          </nav>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-4">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{shopName}</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <span className="block text-[11px] font-bold text-slate-800">{currentUser?.fullName}</span>
                <span className="block text-[9px] font-bold text-slate-400 uppercase">{currentUser?.role}</span>
             </div>
             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-blue-600 border border-slate-200">{currentUser?.fullName.charAt(0)}</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:p-0">
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
          {activeTab === 'settings' && <Settings users={users} setUsers={setUsers} customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} currentUser={currentUser} setCurrentUser={setCurrentUser} shopName={shopName} setShopName={setShopName} appStatus={appStatus} setAppStatus={setAppStatus} isMasterSession={isMasterSession} />}
          {activeTab === 'reports' && <ReportManager transactions={transactions} customers={customers} shopName={shopName} />}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'}`}>
    <div className="flex items-center gap-3">
      {icon} <span className="text-[11px] font-bold">{label}</span>
    </div>
    {badge ? <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-lg font-bold">{badge}</span> : null}
  </button>
);

export default App;
