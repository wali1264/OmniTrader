
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, BookOpen, CheckCircle, LogOut, Wallet, 
  Settings as SettingsIcon, Briefcase, PieChart, Landmark, Sparkles, Zap,
  ArrowRightLeft, CreditCard, Printer, UserPlus, ShieldCheck, Percent, Code2, Lock, ShieldAlert
} from 'lucide-react';
import { Customer, Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, User, GlobalRate, BankAccount } from './types';
import Dashboard from './components/Dashboard';
import CustomerManager from './components/CustomerManager';
import Journal from './components/Journal';
import Approvals from './components/Approvals';
import Settings from './components/Settings';
import AssetCalculator from './components/AssetCalculator';
import CashBoxManager from './components/CashBoxManager';
import BankManager from './components/BankManager';
import ExchangeBalances from './components/ExchangeBalances';
import BankTransactions from './components/BankTransactions';
import ReportManager from './components/ReportManager';
import WalkinManager from './components/WalkinManager';
import CommissionManager from './components/CommissionManager';

const SYSTEM_TIME_OFFSET = 3600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;
const MASTER_PASSWORD = 'ADMIN@2026';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'bankAccounts' | 'journal' | 'approvals' | 'assets' | 'cashbox' | 'settings' | 'exchange' | 'bankTransactions' | 'reports' | 'walkin' | 'commission'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMasterSession, setIsMasterSession] = useState(false); // وضعیت ورود با رمز عبور ارشد
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [shopName, setShopName] = useState(() => localStorage.getItem('s_shopName') || 'صرافی جاوید (Sarrafi Pro)');
  
  const [appStatus, setAppStatus] = useState<'ACTIVE' | 'LOCKED'>(() => {
    return (localStorage.getItem('s_appStatus') as 'ACTIVE' | 'LOCKED') || 'ACTIVE';
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('s_users');
    const parsed = saved ? JSON.parse(saved) : [];
    return parsed.length ? parsed : [{ id: 'admin-0', username: 'Meraj', password: '11223344', role: 'admin', fullName: 'معراج (مدیر)' }];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('s_customers');
    return saved ? JSON.parse(saved) : [];
  });

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
    const saved = localStorage.getItem('s_bankAccounts');
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('s_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  const [globalRates, setGlobalRates] = useState<GlobalRate[]>(() => {
    const saved = localStorage.getItem('s_rates');
    return saved ? JSON.parse(saved) : [
      { currencyCode: 'USD', rateToAfn: 0, lastUpdated: getSystemNow(), source: 'Manual' },
      { currencyCode: 'PKR', rateToAfn: 0, lastUpdated: getSystemNow(), source: 'Manual' },
      { currencyCode: 'IRT_CASH', rateToAfn: 0, lastUpdated: getSystemNow(), source: 'Manual' },
      { currencyCode: 'IRT_BANK', rateToAfn: 0, lastUpdated: getSystemNow(), source: 'Manual' }
    ];
  });

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
    const approvedCash = approved.filter(t => !t.isBank);
    
    const cashBox: Record<string, number> = {};
    SUPPORTED_CURRENCIES.forEach(curr => {
      const resid = approvedCash.filter(t => t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      const board = approvedCash.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      const exchangeIn = approvedCash.filter(t => t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
      const exchangeOut = approvedCash.filter(t => t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      cashBox[curr.code] = (resid + exchangeIn) - (board + exchangeOut);
    });

    const totalCashProfit = approved.filter(t => !t.isBank).reduce((sum, t) => sum + (t.netProfit || 0), 0);
    const totalBankProfit = approved.filter(t => t.isBank).reduce((sum, t) => sum + (t.netProfit || 0), 0);
    
    return { cashBox, totalCashProfit, totalBankProfit };
  }, [transactions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // ورود با رمز عبور عمومی (Master Password)
    if (loginForm.password === MASTER_PASSWORD) {
      const superAdmin = users.find(u => u.id === 'admin-0') || users[0];
      setCurrentUser(superAdmin);
      setIsLoggedIn(true);
      setIsMasterSession(true); // فعالسازی دسترسی ارشد
      setAppStatus('ACTIVE');
      setLoginError('');
      return;
    }

    if (appStatus === 'LOCKED') {
      setLoginError('سیستم غیرفعال شده است. لطفاً با مدیر کل تماس بگیرید.');
      return;
    }

    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) { 
      setCurrentUser(user); 
      setIsLoggedIn(true); 
      setIsMasterSession(false); // ورود عادی
      setLoginError(''); 
    } else { 
      setLoginError('نام کاربری یا رمز عبور اشتباه است.'); 
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setIsMasterSession(false);
    setCurrentUser(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 font-['Vazirmatn']" dir="rtl">
        <div className="w-full max-w-sm bg-[#0f172a] p-10 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-full h-1 ${appStatus === 'LOCKED' ? 'bg-rose-600' : 'bg-blue-600'}`}></div>
          
          <div className="flex justify-center mb-8">
            <div className={`w-14 h-14 ${appStatus === 'LOCKED' ? 'bg-rose-600 shadow-rose-900/20' : 'bg-blue-600 shadow-blue-900/20'} rounded-xl flex items-center justify-center text-white shadow-lg`}>
              {appStatus === 'LOCKED' ? <ShieldAlert size={28} /> : <ShieldCheck size={28} />}
            </div>
          </div>

          <h1 className="text-xl font-bold text-white text-center mb-1">
            {appStatus === 'LOCKED' ? 'سامانه غیرفعال است' : 'پنل کاربری سیستم مدیریت'}
          </h1>
          
          {appStatus === 'LOCKED' && (
             <p className="text-[10px] text-rose-400 font-bold text-center mb-6 uppercase tracking-tight">System Status: Restricted Access</p>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" required placeholder="شناسه کاربری" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3.5 px-5 text-white outline-none focus:border-blue-500 transition-all text-right text-sm" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" required placeholder="رمز عبور" className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3.5 px-5 text-white outline-none focus:border-blue-500 transition-all text-right text-sm" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button type="submit" className={`w-full ${appStatus === 'LOCKED' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'} text-white py-4 rounded-xl font-bold text-sm shadow-xl transition-all`}>
              {appStatus === 'LOCKED' ? 'ورود با کد بازگشایی' : 'تائید و ورود به سامانه'}
            </button>
            {loginError && <p className="text-rose-500 text-center text-xs font-bold mt-4">{loginError}</p>}
          </form>
          
          <div className="mt-8 pt-6 border-t border-slate-800 text-center animate-in fade-in slide-in-from-bottom-2 duration-700">
             <div className="flex items-center justify-center gap-2 text-blue-500 mb-1 opacity-90">
                <Code2 size={14} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">POWERED BY</span>
             </div>
             <p className="text-[10px] font-black text-blue-400 uppercase tracking-tight leading-relaxed">Meraj Salehi Production and Programming Company</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Vazirmatn']" dir="rtl">
      <aside className="w-60 bg-[#0f172a] text-white flex flex-col shrink-0 print:hidden">
        <div className="p-6 flex flex-col h-full">
          <div className="flex flex-col items-center gap-2 mb-8 pb-6 border-b border-slate-800">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-sm mb-2"><Briefcase size={20} /></div>
            <div className="text-center">
              <h1 className="text-[11px] font-black text-slate-100 uppercase tracking-wide">{shopName}</h1>
            </div>
          </div>
          <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar pr-0">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={16} />} label="داشبورد آماری" />
            <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={16} />} label="دفتر کل مشتریان" />
            <NavItem active={activeTab === 'walkin'} onClick={() => setActiveTab('walkin')} icon={<Zap size={16} />} label="مشتری راه‌روی" />
            <NavItem active={activeTab === 'exchange'} onClick={() => setActiveTab('exchange')} icon={<ArrowRightLeft size={16} />} label="تبادلات ارزی" />
            <NavItem active={activeTab === 'bankTransactions'} onClick={() => setActiveTab('bankTransactions')} icon={<CreditCard size={16} />} label="عملیات بانکی" />
            <NavItem active={activeTab === 'commission'} onClick={() => setActiveTab('commission')} icon={<Percent size={16} />} label="جمع‌آوری کمیشن" />
            <NavItem active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<BookOpen size={16} />} label="روزنامچه کل" />
            <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<Printer size={16} />} label="گزارش‌گیری و چاپ" />
            <NavItem active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} icon={<CheckCircle size={16} />} label="تائیدات نهایی" badge={transactions.filter(t => t.status === TransactionStatus.PENDING).length}/>
            <div className="h-px bg-slate-800 my-4 opacity-40"></div>
            <NavItem active={activeTab === 'cashbox'} onClick={() => setActiveTab('cashbox')} icon={<Wallet size={16} />} label="مدیریت صندوق" />
            <NavItem active={activeTab === 'bankAccounts'} onClick={() => setActiveTab('bankAccounts')} icon={<Landmark size={16} />} label="مدیریت بانک‌ها" />
            <NavItem active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<PieChart size={16} />} label="تراز دارایی‌ها" />
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={16} />} label="تنظیمات سیستم" />
          </nav>
          
          <div className="mt-4 pt-4 border-t border-slate-800/50 mb-4 px-2">
             <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">DEVELOPED BY</p>
             <p className="text-[8px] font-black text-blue-400 uppercase leading-tight">Meraj Salehi Production and Programming Company</p>
          </div>

          <button onClick={handleLogout} className="flex items-center gap-3 text-slate-500 hover:text-rose-400 p-3 rounded-xl hover:bg-slate-900 transition-all mt-auto">
            <LogOut size={16} /> <span className="text-[11px] font-bold">خروج از پنل</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center print:hidden">
          <div className="flex items-center gap-4">
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
               <p className="text-[10px] font-bold text-slate-500 uppercase">وضعیت سیستم: <span className={appStatus === 'LOCKED' ? 'text-rose-600' : 'text-emerald-600'}>{appStatus === 'LOCKED' ? 'غیرفعال' : 'فعال'}</span></p>
            </div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{shopName}</h2>
          </div>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <span className="block text-[11px] font-bold text-slate-800">{currentUser?.fullName}</span>
                <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{currentUser?.role === 'admin' ? 'SYSTEM ADMINISTRATOR' : 'OPERATOR'}</span>
             </div>
             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-blue-600 border border-slate-200">{currentUser?.fullName.charAt(0)}</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:p-0">
          {activeTab === 'dashboard' && <Dashboard stats={stats} transactions={transactions} globalRates={globalRates} setGlobalRates={setGlobalRates} bankAccounts={bankAccounts} />}
          {activeTab === 'customers' && <CustomerManager customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} globalRates={globalRates} setGlobalRates={setGlobalRates} />}
          {activeTab === 'walkin' && <WalkinManager transactions={transactions} setTransactions={setTransactions} customers={customers} setCustomers={setCustomers} shopName={shopName} currentUser={currentUser} />}
          {activeTab === 'exchange' && <ExchangeBalances transactions={transactions} setTransactions={setTransactions} globalRates={globalRates} customers={customers} />}
          {activeTab === 'bankTransactions' && <BankTransactions customers={customers} transactions={transactions} setTransactions={setTransactions} />}
          {activeTab === 'commission' && <CommissionManager transactions={transactions} customers={customers} />}
          {activeTab === 'journal' && <Journal transactions={transactions} customers={customers} globalRates={globalRates} />}
          {activeTab === 'approvals' && <Approvals transactions={transactions} setTransactions={setTransactions} customers={customers} setCustomers={setCustomers} />}
          {activeTab === 'cashbox' && <CashBoxManager transactions={transactions} stats={stats} currentUser={currentUser} customers={customers} shopName={shopName} />}
          {activeTab === 'bankAccounts' && <BankManager bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} transactions={transactions} setTransactions={setTransactions} customers={customers} />}
          {activeTab === 'assets' && <AssetCalculator customers={customers} stats={stats} globalRates={globalRates} />}
          {activeTab === 'settings' && <Settings users={users} setUsers={setUsers} customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} currentUser={currentUser} setCurrentUser={setCurrentUser} shopName={shopName} setShopName={setShopName} appStatus={appStatus} setAppStatus={setAppStatus} isMasterSession={isMasterSession} />}
          {activeTab === 'reports' && <ReportManager transactions={transactions} customers={customers} shopName={shopName} />}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'}`}>
    <div className="flex items-center gap-3">
      {icon} <span className="text-[11px] font-bold">{label}</span>
    </div>
    {badge ? <span className="bg-rose-600 text-white text-[9px] px-1.5 py-0.5 rounded-lg font-bold shadow-sm">{badge}</span> : null}
  </button>
);

export default App;
