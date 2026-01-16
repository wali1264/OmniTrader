
import React, { useState, useMemo } from 'react';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, Landmark, DollarSign, Coins, RefreshCw, Sparkles, Loader2, AlertTriangle, CreditCard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Transaction, GlobalRate, SUPPORTED_CURRENCIES, TransactionType, TransactionStatus, BankAccount } from '../types';

const SYSTEM_TIME_OFFSET = -21600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;

interface DashboardProps {
  stats: {
    cashBox: Record<string, number>;
    totalCashProfit: number;
    totalBankProfit: number;
  };
  transactions: Transaction[];
  globalRates: GlobalRate[];
  setGlobalRates: React.Dispatch<React.SetStateAction<GlobalRate[]>>;
  bankAccounts: BankAccount[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, transactions, globalRates, setGlobalRates, bankAccounts }) => {
  const fetchLatestRates = () => {
    alert("نرخ‌های لحظه‌ای بازار از تب 'دارایی‌ها' با استفاده از هوش مصنوعی قابل دریافت هستند.");
  };

  const dailyStats = useMemo(() => {
    const today = new Date(getSystemNow());
    today.setHours(0, 0, 0, 0);
    const approvedToday = transactions.filter(t => 
      t.status === TransactionStatus.APPROVED && 
      new Date(t.timestamp).setHours(0, 0, 0, 0) === today.getTime()
    );
    const incoming: Record<string, number> = {};
    const outgoing: Record<string, number> = {};
    SUPPORTED_CURRENCIES.forEach(curr => {
      incoming[curr.code] = approvedToday.filter(t => t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      outgoing[curr.code] = approvedToday.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
    });
    return { incoming, outgoing };
  }, [transactions]);

  const bankAccountBalances = useMemo(() => {
    return bankAccounts.map(account => {
      const approved = transactions.filter(t => t.bankAccountId === account.id && t.status === TransactionStatus.APPROVED);
      const resid = approved.filter(t => t.type === TransactionType.RESID).reduce((sum, t) => sum + t.amount, 0);
      const board = approved.filter(t => t.type === TransactionType.BOARD).reduce((sum, t) => sum + t.amount, 0);
      return { ...account, currentBalance: account.balance + resid - board };
    });
  }, [bankAccounts, transactions]);

  return (
    <div className="space-y-6 fade-entry">
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-amber-500" size={16} />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">وضعیت زمانی: <span className="text-slate-200">۶ ساعت قبل (UTC-6)</span></p>
        </div>
        <div className="text-left">
           <p className="text-[9px] font-black text-slate-500 uppercase tabular-nums">{new Date(getSystemNow()).toLocaleDateString('fa-IR', { weekday:'long', day:'numeric', month:'long' })}</p>
        </div>
      </div>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="صندوق افغانی" value={(stats.cashBox['AFN'] || 0).toLocaleString()} unit="AFN" icon={<Coins size={14} className="text-slate-400" />} />
        <StatCard title="مفاد نقدی" value={stats.totalCashProfit.toLocaleString()} unit="AFN" icon={<TrendingUp size={14} className="text-emerald-500" />} />
        <StatCard title="تومان نقدی" value={(stats.cashBox['IRT_CASH'] || 0).toLocaleString()} unit="IRT" icon={<Coins size={14} className="text-slate-400" />} />
        <StatCard title="مفاد بانکی" value={stats.totalBankProfit.toLocaleString()} unit="IRT" icon={<CreditCard size={14} className="text-amber-500" />} />
        <StatCard title="سرمایه خالص کل" value={(stats.totalCashProfit + stats.totalBankProfit * 0.01).toLocaleString()} unit="AFN" icon={<Sparkles size={14} className="text-white" />} highlight />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
            <h3 className="text-[12px] font-bold text-slate-800 uppercase tracking-widest">نقدینگی حساب‌های بانکی</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bankAccountBalances.map(account => (
              <div key={account.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex justify-between items-center transition-all hover:bg-white hover:border-slate-300">
                <p className="text-[11px] font-bold text-slate-900">{account.bankName}</p>
                <div className="text-left">
                  <p className="text-sm font-black text-slate-900 tnum">{account.currentBalance.toLocaleString()}</p>
                  <span className="text-[8px] font-black text-blue-600 uppercase">{account.currency}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 text-right">
           <h3 className="text-[10px] font-bold text-slate-900 border-b border-slate-50 pb-3 uppercase tracking-widest">خلاصه امروز (USD)</h3>
           <div className="space-y-3">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                 <span className="text-[10px] font-bold text-slate-600 uppercase">ورودی</span>
                 <span className="text-sm font-black tnum text-slate-800">{dailyStats.incoming['USD']?.toLocaleString()}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center">
                 <span className="text-[10px] font-bold text-slate-600 uppercase">خروجی</span>
                 <span className="text-sm font-black tnum text-slate-800">{dailyStats.outgoing['USD']?.toLocaleString()}</span>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, unit, icon, highlight }: any) => (
  <div className={`p-5 rounded-xl border transition-all text-right ${highlight ? 'bg-blue-600 text-white border-blue-700 shadow-xl' : 'bg-white border-slate-200 shadow-sm'}`}>
    <div className="flex justify-between items-start mb-4">
       <p className={`text-[9px] font-bold uppercase tracking-wider ${highlight ? 'text-blue-200' : 'text-slate-400'}`}>{title}</p>
       <div className={`p-2 rounded-lg ${highlight ? 'bg-white/10' : 'bg-slate-50'}`}>{icon}</div>
    </div>
    <div className="flex items-baseline gap-1 justify-end tnum">
      <h4 className="text-[1.25rem] font-black tracking-tighter">{value}</h4>
      <span className={`text-[8px] font-black uppercase ${highlight ? 'text-blue-300' : 'text-slate-400'}`}>{unit}</span>
    </div>
  </div>
);

export default Dashboard;
