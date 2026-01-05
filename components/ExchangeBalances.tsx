
import React, { useMemo, useState, useEffect } from 'react';
import { 
  ArrowRightLeft, TrendingUp, Clock, 
  ChevronRight, ChevronLeft, Target, Activity, ShieldCheck, Coins, Sparkles,
  BarChart3, PieChart, TrendingDown, DollarSign, Info, Calculator, 
  ArrowRight, RefreshCw, CheckCircle2, AlertCircle, X, Landmark, Wallet
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, GlobalRate, BankAccount, Customer } from '../types';

interface ExchangeBalancesProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  globalRates: GlobalRate[];
  bankAccounts: BankAccount[];
  customers: Customer[];
}

const ExchangeBalances: React.FC<ExchangeBalancesProps> = ({ transactions, setTransactions, globalRates, bankAccounts, customers }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // States for Calculator
  const [fromCurr, setFromCurr] = useState('USD');
  const [toCurr, setToCurr] = useState('AFN');
  const [amount, setAmount] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [op, setOp] = useState<'multiply' | 'divide'>('multiply');
  const [isGuest, setIsGuest] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedBankId, setSelectedBankId] = useState('');

  useEffect(() => {
    if (fromCurr === 'USD' && toCurr === 'AFN') {
      const gRate = globalRates.find(r => r.currencyCode === 'USD')?.rateToAfn || 0;
      setRate(gRate);
      setOp('multiply');
    } else {
      setRate(0);
    }
  }, [fromCurr, toCurr, globalRates]);

  const convertedAmount = useMemo(() => {
    if (amount <= 0 || rate <= 0) return 0;
    return op === 'multiply' ? amount * rate : amount / rate;
  }, [amount, rate, op]);

  const filteredCustomers = useMemo(() => {
    const term = customerSearch.trim();
    if (!term) return [];
    return customers.filter(c => c.name.includes(term) || c.code.includes(term));
  }, [customers, customerSearch]);

  const handleExchange = () => {
    if (amount <= 0 || rate <= 0 || fromCurr === toCurr) {
      alert("لطفاً مقادیر را به درستی وارد کنید.");
      return;
    }
    if (!isGuest && !selectedCustomerId) {
      alert("مشتری را انتخاب کنید.");
      return;
    }
    if (isGuest && !guestName) {
      alert("نام مشتری راه‌روی را وارد کنید.");
      return;
    }

    const exchangeId = 'EX-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    const transaction: Transaction = {
      id: exchangeId,
      customerId: isGuest ? undefined : selectedCustomerId,
      guestName: isGuest ? guestName : undefined,
      type: TransactionType.EXCHANGE,
      amount: amount,
      currency: fromCurr,
      targetCurrency: toCurr,
      exchangeRate: rate,
      convertedAmount: convertedAmount,
      description: `تبادله ${amount} ${fromCurr} به ${toCurr} با نرخ ${rate} (${op === 'multiply' ? 'ضرب' : 'تقسیم'})`,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING,
      isBank: fromCurr.includes('BANK') || toCurr.includes('BANK') || selectedBankId !== '',
      bankAccountId: selectedBankId || undefined,
    };

    setTransactions(prev => [...prev, transaction]);
    setAmount(0);
    setGuestName('');
    setCustomerSearch('');
    setSelectedCustomerId('');
    alert("تبادله ثبت و برای تائید مدیر ارسال شد.");
  };

  const dailyStats = useMemo(() => {
    const todayTrans = transactions.filter(t => 
      t.status === TransactionStatus.APPROVED && 
      new Date(t.timestamp).toDateString() === selectedDate.toDateString()
    );

    let totalProfit = 0;
    todayTrans.forEach(t => {
      if (t.type === TransactionType.EXCHANGE) {
        totalProfit += (t.netProfit || 0);
      }
    });

    return { totalProfit, count: todayTrans.filter(t => t.type === TransactionType.EXCHANGE).length };
  }, [transactions, selectedDate]);

  return (
    <div className="space-y-8 pb-24">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8 h-fit sticky top-24">
           <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                <Calculator size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900">ماشین‌حساب تبادله صرافی</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Professional Exchange Module</p>
              </div>
           </div>

           <div className="space-y-6 text-right">
              <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                 <button onClick={() => setIsGuest(true)} className={`flex-1 py-3 rounded-xl font-black text-[11px] transition-all ${isGuest ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>مشتری راه‌روی</button>
                 <button onClick={() => setIsGuest(false)} className={`flex-1 py-3 rounded-xl font-black text-[11px] transition-all ${!isGuest ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>مشتری دائمی</button>
              </div>

              {isGuest ? (
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">نام مشتری راه‌روی</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="نام را وارد کنید..." value={guestName} onChange={e => setGuestName(e.target.value)} />
                </div>
              ) : (
                <div className="space-y-1.5 relative">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">جستجوی مشتری</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" placeholder="نام یا کد..." value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
                   {filteredCustomers.length > 0 && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto p-1">
                        {filteredCustomers.map(c => (
                           <button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className="w-full p-3 text-right text-xs font-bold hover:bg-slate-50 rounded-lg">{c.name} ({c.code})</button>
                        ))}
                      </div>
                   )}
                </div>
              )}

              <div className="space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">ارز مبدا (صرافی می‌گیرد)</span>
                 </div>
                 <div className="grid grid-cols-5 gap-2">
                    {SUPPORTED_CURRENCIES.map(c => (
                      <button key={c.code} onClick={() => setFromCurr(c.code)} className={`py-2 rounded-xl text-[10px] font-black transition-all border ${fromCurr === c.code ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400'}`}>{c.label}</button>
                    ))}
                 </div>
                 <input type="number" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black text-right outline-none focus:bg-white" placeholder="0.00" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} />
              </div>

              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <div className="p-2 bg-white rounded-lg text-blue-600 shadow-sm"><RefreshCw size={14} /></div>
                       <span className="text-[10px] font-black text-blue-900">نرخ تبدیل نهایی:</span>
                    </div>
                    <div className="flex bg-white p-1 rounded-xl border border-blue-100">
                       <button type="button" onClick={() => setOp('multiply')} className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${op === 'multiply' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>×</button>
                       <button type="button" onClick={() => setOp('divide')} className={`px-4 py-2 rounded-lg font-black text-xs transition-all ${op === 'divide' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}>÷</button>
                    </div>
                 </div>
                 <input type="number" className="w-full p-4 bg-white border border-blue-100 rounded-xl text-center font-black text-2xl outline-none text-blue-600" value={rate || ''} onChange={e => setRate(Number(e.target.value))} placeholder="0.00" />
              </div>

              <div className="space-y-3">
                 <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">ارز مقصد (مشتری می‌گیرد)</span>
                 </div>
                 <div className="grid grid-cols-5 gap-2">
                    {SUPPORTED_CURRENCIES.map(c => (
                      <button key={c.code} disabled={fromCurr === c.code} onClick={() => setToCurr(c.code)} className={`py-2 rounded-xl text-[10px] font-black transition-all border ${toCurr === c.code ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400 disabled:opacity-20'}`}>{c.label}</button>
                    ))}
                 </div>
                 <div className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-right">
                    <span className="text-2xl font-black text-slate-900 tabular-nums">{convertedAmount.toLocaleString()}</span>
                    <span className="text-[10px] font-black text-slate-400 mr-2 uppercase">{toCurr}</span>
                 </div>
              </div>

              <button onClick={handleExchange} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-900/10 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                 <ArrowRightLeft size={20} /> ثبت و تائید تبادله
              </button>
           </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
           <div className="bg-slate-950 p-10 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={120} /></div>
              <div className="relative z-10">
                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2">سود خالص امروز</p>
                 <h4 className="text-5xl font-black text-emerald-400 tabular-nums">{dailyStats.totalProfit.toLocaleString()} <span className="text-sm">AFN</span></h4>
              </div>
              <div className="relative z-10 flex gap-4">
                 <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center min-w-[120px]">
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">کل تبادلات</p>
                    <p className="text-2xl font-black">{dailyStats.count}</p>
                 </div>
              </div>
           </div>

           <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Clock size={20} className="text-slate-400" /> تاریخچه تبادلات
                 </h3>
                 <div className="flex items-center gap-3 bg-slate-50 p-1 rounded-xl">
                    <button onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() + 1);
                        setSelectedDate(d);
                    }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronRight size={16}/></button>
                    <span className="text-[11px] font-black text-slate-600">{selectedDate.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    <button onClick={() => {
                        const d = new Date(selectedDate);
                        d.setDate(d.getDate() - 1);
                        setSelectedDate(d);
                    }} className="p-2 hover:bg-white rounded-lg transition-all"><ChevronLeft size={16}/></button>
                 </div>
              </div>

              <div className="space-y-4">
                 {transactions.filter(t => t.type === TransactionType.EXCHANGE && new Date(t.timestamp).toDateString() === selectedDate.toDateString()).sort((a,b) => b.timestamp - a.timestamp).map(t => (
                   <div key={t.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] hover:bg-white hover:shadow-lg transition-all border-r-4 border-r-blue-500">
                      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                         <div className="flex items-center gap-6">
                            <div className="text-right">
                               <p className="font-black text-slate-900 text-sm">{t.guestName || customers.find(c => c.id === t.customerId)?.name}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] font-bold text-slate-400">{new Date(t.timestamp).toLocaleTimeString('fa-IR', {hour:'2-digit', minute:'2-digit'})}</span>
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                     {t.status === TransactionStatus.APPROVED ? 'تائید شده' : 'در انتظار'}
                                  </span>
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-8">
                            <div className="text-center">
                               <p className="text-[9px] font-black text-slate-400 uppercase">تبدیل شده</p>
                               <p className="text-sm font-black text-slate-900">-{t.amount.toLocaleString()} <span className="text-[10px] text-rose-500 uppercase">{t.currency}</span></p>
                            </div>
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><ArrowRight size={14}/></div>
                            <div className="text-center">
                               <p className="text-[9px] font-black text-slate-400 uppercase">دریافت شده</p>
                               <p className="text-sm font-black text-slate-900">+{t.convertedAmount?.toLocaleString()} <span className="text-[10px] text-emerald-500 uppercase">{t.targetCurrency}</span></p>
                            </div>
                         </div>

                         <div className="text-left border-r border-slate-200 pr-6">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Rate</p>
                            <p className="text-sm font-black text-blue-600">1 {t.exchangeRate}</p>
                         </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeBalances;
