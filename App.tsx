
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, BookOpen, CheckCircle, LogOut, Wallet, 
  Settings as SettingsIcon, Briefcase, PieChart, Landmark, Sparkles, Zap,
  ArrowRightLeft, CreditCard, Printer
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
import BankManager from './components/BankManager';
import GuestManager from './components/GuestManager';
import ExchangeBalances from './components/ExchangeBalances';
import BankTransactions from './components/BankTransactions';
import ReportManager from './components/ReportManager';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'bankAccounts' | 'journal' | 'approvals' | 'assets' | 'anonymous' | 'cashbox' | 'settings' | 'guest' | 'exchange' | 'bankTransactions' | 'reports'>('dashboard');
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
      const resid = approvedCash.filter(t => t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      const board = approvedCash.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      
      const exchangeIn = approvedCash.filter(t => t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
      const exchangeOut = approvedCash.filter(t => t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      
      cashBox[curr.code] = (resid + exchangeIn) - (board + exchangeOut);
    });

    const totalProfit = approved.filter(t => t.type === TransactionType.EXCHANGE).reduce((sum, t) => sum + (t.netProfit || 0), 0);

    return { cashBox, totalProfit };
  }, [transactions]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) { setCurrentUser(user); setIsLoggedIn(true); setLoginError(''); }
    else { setLoginError('نام کاربری یا رمز عبور اشتباه است.'); }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-['Vazirmatn'] relative overflow-hidden" dir="rtl">
        <div className="relative w-full max-w-sm bg-white/5 backdrop-blur-3xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-900/20">
              <Wallet size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white text-center mb-2">ورود به پنل صرافی</h1>
          <p className="text-slate-500 text-center text-[10px] mb-8 uppercase tracking-widest font-black">Secure Access Management</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="text" required placeholder="نام کاربری" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white outline-none focus:border-blue-500 transition-all" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" required placeholder="رمز عبور" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-5 text-white outline-none focus:border-blue-500 transition-all" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all mt-4">ورود به سیستم</button>
            {loginError && <p className="text-rose-500 text-center text-xs font-bold mt-4 animate-bounce">{loginError}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Vazirmatn']" dir="rtl">
      <aside className="w-64 bg-slate-950 text-white flex flex-col shrink-0 print:hidden">
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-10 p-2 bg-white/5 rounded-2xl">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg"><Sparkles size={20} /></div>
            <h1 className="text-sm font-black truncate">{shopName}</h1>
          </div>
          <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={18} />} label="داشبورد" />
            <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={18} />} label="دفتر مشتریان" />
            <NavItem active={activeTab === 'exchange'} onClick={() => setActiveTab('exchange')} icon={<ArrowRightLeft size={18} />} label="تبادله ارز" />
            <NavItem active={activeTab === 'bankTransactions'} onClick={() => setActiveTab('bankTransactions')} icon={<CreditCard size={18} />} label="تراکنش بانکی" />
            <NavItem active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<BookOpen size={18} />} label="روزنامهچه" />
            <NavItem active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<Printer size={18} />} label="گزارشات چاپی" />
            <NavItem active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} icon={<CheckCircle size={18} />} label="تائیدات" badge={transactions.filter(t => t.status === TransactionStatus.PENDING).length}/>
            <NavItem active={activeTab === 'cashbox'} onClick={() => setActiveTab('cashbox')} icon={<Briefcase size={18} />} label="صندوق نقد" />
            <NavItem active={activeTab === 'bankAccounts'} onClick={() => setActiveTab('bankAccounts')} icon={<Landmark size={18} />} label="بانک‌ها" />
            <NavItem active={activeTab === 'guest'} onClick={() => setActiveTab('guest')} icon={<Zap size={18} />} label="راه‌روی" />
            <NavItem active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<PieChart size={18} />} label="تراز دارائی" />
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={18} />} label="تنظیمات" />
          </nav>
          <button onClick={() => setIsLoggedIn(false)} className="flex items-center gap-3 text-slate-500 hover:text-rose-400 p-4 mt-auto rounded-xl hover:bg-white/5 transition-all">
            <LogOut size={18} /> <span className="text-xs font-black">خروج از حساب</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center shadow-sm print:hidden">
          <h2 className="text-lg font-black text-slate-900">پنل مدیریت صرافی هوشمند</h2>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <span className="block text-xs font-black text-slate-800">{currentUser?.fullName}</span>
                <span className="block text-[8px] font-black text-blue-600 uppercase tracking-widest">{currentUser?.role} Mode</span>
             </div>
             <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-blue-600 border border-slate-200 shadow-sm">{currentUser?.fullName.charAt(0)}</div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar print:p-0 print:overflow-visible">
          {activeTab === 'dashboard' && <Dashboard stats={stats} transactions={transactions} globalRates={globalRates} setGlobalRates={setGlobalRates} bankAccounts={bankAccounts} />}
          {activeTab === 'customers' && <CustomerManager customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} globalRates={globalRates} />}
          {activeTab === 'exchange' && <ExchangeBalances transactions={transactions} setTransactions={setTransactions} globalRates={globalRates} bankAccounts={bankAccounts} customers={customers} />}
          {activeTab === 'bankTransactions' && <BankTransactions customers={customers} transactions={transactions} setTransactions={setTransactions} />}
          {activeTab === 'journal' && <Journal transactions={transactions} customers={customers} />}
          {activeTab === 'approvals' && <Approvals transactions={transactions} setTransactions={setTransactions} customers={customers} setCustomers={setCustomers} />}
          {activeTab === 'cashbox' && <CashBoxManager transactions={transactions} stats={stats} currentUser={currentUser} customers={customers} shopName={shopName} />}
          {activeTab === 'bankAccounts' && <BankManager bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} transactions={transactions} setTransactions={setTransactions} customers={customers} />}
          {activeTab === 'guest' && <GuestManager setTransactions={setTransactions} bankAccounts={bankAccounts} />}
          {activeTab === 'assets' && <AssetCalculator customers={customers} stats={stats} globalRates={globalRates} />}
          {activeTab === 'settings' && <Settings users={users} setUsers={setUsers} customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} currentUser={currentUser} setCurrentUser={setCurrentUser} shopName={shopName} setShopName={setShopName} />}
          {activeTab === 'reports' && <ReportManager transactions={transactions} customers={customers} shopName={shopName} />}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/20 translate-x-1' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'}`}>
    <div className="flex items-center gap-3">
      {icon} <span className="text-[12px] font-black">{label}</span>
    </div>
    {badge ? <span className="bg-rose-600 text-white text-[8px] px-2 py-0.5 rounded-lg font-black shadow-lg">{badge}</span> : null}
  </button>
);

export default App;
