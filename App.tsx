
import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Landmark, BookOpen, CheckCircle, LogOut, Wallet, 
  Settings as SettingsIcon, Briefcase, ArrowRightLeft, PieChart, HelpCircle, 
  Lock, User as UserIcon, KeyRound, Code2
} from 'lucide-react';
import { Customer, BankAccount, Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, User, GlobalRate } from './types';
import Dashboard from './components/Dashboard';
import CustomerManager from './components/CustomerManager';
import BankManager from './components/BankManager';
import Journal from './components/Journal';
import Approvals from './components/Approvals';
import Settings from './components/Settings';
import AssetCalculator from './components/AssetCalculator';
import AnonymousDeposits from './components/AnonymousDeposits';
import CashBoxManager from './components/CashBoxManager';
import ExchangeBalances from './components/ExchangeBalances';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'banks' | 'journal' | 'approvals' | 'assets' | 'anonymous' | 'cashbox' | 'exchange' | 'settings'>('dashboard');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // Shop Name State
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
    const saved = localStorage.getItem('s_banks');
    return saved ? JSON.parse(saved) : [{ id: 'b1', bankName: 'بانک صادرات', accountNumber: '010...123', balance: 0, currency: 'IRT_BANK' }];
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
    localStorage.setItem('s_banks', JSON.stringify(bankAccounts));
    localStorage.setItem('s_transactions', JSON.stringify(transactions));
    localStorage.setItem('s_rates', JSON.stringify(globalRates));
    localStorage.setItem('s_shopName', shopName);
  }, [users, customers, bankAccounts, transactions, globalRates, shopName]);

  const stats = useMemo(() => {
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED);
    
    const cashBox: Record<string, number> = {};
    SUPPORTED_CURRENCIES.forEach(curr => {
      const resid = approved.filter(t => !t.bankAccountId && ((t.type === TransactionType.RESID && t.currency === curr.code) || (t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code))).reduce((sum, t) => sum + (t.type === TransactionType.EXCHANGE ? (t.convertedAmount || 0) : t.amount), 0);
      const board = approved.filter(t => !t.bankAccountId && ((t.type === TransactionType.BOARD && t.currency === curr.code) || (t.type === TransactionType.EXCHANGE && t.currency === curr.code))).reduce((sum, t) => sum + t.amount, 0);
      cashBox[curr.code] = resid - board;
    });

    const bankSums: Record<string, number> = {};
    bankAccounts.forEach(bank => {
      const bankTrans = approved.filter(t => t.bankAccountId === bank.id);
      const resid = bankTrans.filter(t => t.type === TransactionType.RESID).reduce((sum, t) => sum + t.amount, 0);
      const board = bankTrans.filter(t => t.type === TransactionType.BOARD).reduce((sum, t) => sum + t.amount, 0);
      const currentBalance = bank.balance + resid - board;
      bankSums[bank.currency] = (bankSums[bank.currency] || 0) + currentBalance;
    });

    return { 
      cashBox, 
      bankSums, 
      totalProfit: approved.reduce((acc, t) => acc + (t.profit || 0), 0) 
    };
  }, [transactions, bankAccounts]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) { setCurrentUser(user); setIsLoggedIn(true); setLoginError(''); }
    else { setLoginError('نام کاربری یا رمز عبور اشتباه است.'); }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Vazirmatn']" dir="rtl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/10 via-slate-950 to-slate-950"></div>
        <div className="relative w-full max-w-md bg-white/5 backdrop-blur-2xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl">
          <div className="flex flex-col items-center mb-10 text-center text-white">
            <div className="bg-blue-600 p-5 rounded-3xl shadow-xl mb-6"><Lock size={32} /></div>
            <h1 className="text-2xl font-black">ورود به سیستم {shopName}</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <input type="text" required placeholder="نام کاربری" className="w-full bg-white/10 border border-white/10 rounded-2xl py-5 px-5 text-white outline-none" value={loginForm.username} onChange={e => setLoginForm({...loginForm, username: e.target.value})} />
            <input type="password" required placeholder="رمز عبور" className="w-full bg-white/10 border border-white/10 rounded-2xl py-5 px-5 text-white outline-none" value={loginForm.password} onChange={e => setLoginForm({...loginForm, password: e.target.value})} />
            {loginError && <p className="text-rose-500 text-xs font-bold text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-lg">تائید و ورود</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-['Vazirmatn']" dir="rtl">
      <aside className="w-72 bg-slate-950 text-white flex flex-col shrink-0 relative">
        <div className="p-8 flex flex-col h-full">
          <div className="flex items-center gap-4 mb-10">
            <div className="bg-blue-600 p-3 rounded-2xl"><Wallet size={28} /></div>
            <h1 className="text-xl font-black truncate">{shopName}</h1>
          </div>
          <nav className="space-y-1.5 flex-1 overflow-y-auto">
            <NavItem active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="داشبورد" />
            <NavItem active={activeTab === 'cashbox'} onClick={() => setActiveTab('cashbox')} icon={<Briefcase size={20} />} label="صندوق" />
            <NavItem active={activeTab === 'exchange'} onClick={() => setActiveTab('exchange')} icon={<ArrowRightLeft size={20} />} label="تبادل و بیلانس" />
            <NavItem active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} icon={<Users size={20} />} label="مشتریان" />
            <NavItem active={activeTab === 'banks'} onClick={() => setActiveTab('banks')} icon={<Landmark size={20} />} label="بانک‌ها" />
            <NavItem active={activeTab === 'journal'} onClick={() => setActiveTab('journal')} icon={<BookOpen size={20} />} label="روزنامهچه" />
            <NavItem active={activeTab === 'approvals'} onClick={() => setActiveTab('approvals')} icon={<CheckCircle size={20} />} label="تائیدات" badge={transactions.filter(t => t.status === TransactionStatus.PENDING && t.customerId).length}/>
            <NavItem active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={<PieChart size={20} />} label="دارائی‌ها" />
            <NavItem active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon size={20} />} label="تنظیمات" />
          </nav>
          <button onClick={() => setIsLoggedIn(false)} className="mt-auto flex items-center gap-3 text-slate-500 hover:text-white transition-all p-4 border-t border-white/5">
            <LogOut size={18} /> <span className="font-bold text-sm">خروج</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-10 py-5 flex justify-between items-center shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">پنل مدیریت {shopName}</h2>
          <div className="flex gap-8">
            <div className="text-left border-r border-slate-100 pr-6">
              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">صندوق (USD)</p>
              <p className="text-sm font-black text-emerald-600">{(stats.cashBox['USD'] || 0).toLocaleString()} $</p>
            </div>
          </div>
        </header>

        <div className="p-10 max-w-[1600px] mx-auto min-h-screen">
            {activeTab === 'dashboard' && <Dashboard stats={stats} bankAccounts={bankAccounts} transactions={transactions} globalRates={globalRates} setGlobalRates={setGlobalRates} />}
            {activeTab === 'customers' && <CustomerManager customers={customers} setCustomers={setCustomers} transactions={transactions} setTransactions={setTransactions} bankAccounts={bankAccounts} globalRates={globalRates} />}
            {activeTab === 'banks' && <BankManager bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} transactions={transactions} setTransactions={setTransactions} customers={customers} />}
            {activeTab === 'journal' && <Journal transactions={transactions} customers={customers} />}
            {activeTab === 'approvals' && <Approvals transactions={transactions} setTransactions={setTransactions} customers={customers} setCustomers={setCustomers} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} />}
            {activeTab === 'assets' && <AssetCalculator customers={customers} bankAccounts={bankAccounts} stats={stats} globalRates={globalRates} />}
            {activeTab === 'cashbox' && <CashBoxManager transactions={transactions} stats={stats} currentUser={currentUser} customers={customers} shopName={shopName} />}
            {activeTab === 'exchange' && <ExchangeBalances transactions={transactions} globalRates={globalRates} />}
            {activeTab === 'settings' && <Settings users={users} setUsers={setUsers} customers={customers} setCustomers={setCustomers} bankAccounts={bankAccounts} setBankAccounts={setBankAccounts} transactions={transactions} setTransactions={setTransactions} currentUser={currentUser} setCurrentUser={setCurrentUser} shopName={shopName} setShopName={setShopName} />}
        </div>
      </main>
    </div>
  );
};

const NavItem = ({ active, onClick, icon, label, badge }: any) => (
  <button onClick={onClick} className={`w-full flex items-center justify-between gap-3 px-5 py-3.5 rounded-2xl transition-all ${active ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-900'}`}>
    <div className="flex items-center gap-3">{icon} <span className="text-sm">{label}</span></div>
    {badge ? <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full">{badge}</span> : null}
  </button>
);

export default App;
