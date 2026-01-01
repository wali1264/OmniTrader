
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, Plus, UserPlus, ArrowUpRight, ArrowDownLeft, 
  Users, FileText, ChevronLeft, Calculator, Check, X, Delete, 
  Repeat, ArrowRightLeft, Info, Wallet, AlertTriangle, ArrowDown, Hash
} from 'lucide-react';
import { Customer, Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, GlobalRate } from '../types';

interface CustomerManagerProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  bankAccounts: any[];
  globalRates: GlobalRate[];
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, setCustomers, transactions, setTransactions, globalRates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState<{show: boolean, type: TransactionType}>({ show: false, type: TransactionType.RESID });
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  
  // Calculator States
  const [calcTarget, setCalcTarget] = useState<'from' | 'to' | null>(null);
  const [calcExpression, setCalcExpression] = useState('');

  // Exchange Form State (Base AFN Logic)
  const [exchangeForm, setExchangeForm] = useState({
    fromCurrency: 'USD',
    toCurrency: 'AFN',
    amount: 0,
    fromRateToAfn: 0, 
    toRateToAfn: 1,   
    profit: 0,
    description: ''
  });

  const [newTrans, setNewTrans] = useState({ amount: 0, currency: 'AFN', description: '' });
  const [newCustomer, setNewCustomer] = useState({ name: '', phones: '', code: '' });

  // 1. Live Balance Engine
  const customerBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    if (!selectedCustomer) return balances;
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED && t.customerId === selectedCustomer.id);
    SUPPORTED_CURRENCIES.forEach(curr => {
      const initial = selectedCustomer.balances[curr.code] || 0;
      const incoming = approved.filter(t => (t.type === TransactionType.RESID && t.currency === curr.code) || (t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code)).reduce((sum, t) => sum + (t.type === TransactionType.EXCHANGE ? (t.convertedAmount || 0) : t.amount), 0);
      const outgoing = approved.filter(t => (t.type === TransactionType.BOARD && t.currency === curr.code) || (t.type === TransactionType.EXCHANGE && t.currency === curr.code)).reduce((sum, t) => sum + t.amount, 0);
      balances[curr.code] = initial + incoming - outgoing;
    });
    return balances;
  }, [selectedCustomer, transactions]);

  const availableSourceBalance = customerBalances[exchangeForm.fromCurrency] || 0;

  // 2. AFN Bridge Calculations
  const amountInAfn = useMemo(() => exchangeForm.amount * exchangeForm.fromRateToAfn, [exchangeForm.amount, exchangeForm.fromRateToAfn]);
  const finalTargetAmount = useMemo(() => (exchangeForm.toRateToAfn > 0 ? amountInAfn / exchangeForm.toRateToAfn : 0), [amountInAfn, exchangeForm.toRateToAfn]);

  useEffect(() => {
    if (showExchangeModal) {
      const fromRate = globalRates.find(r => r.currencyCode === exchangeForm.fromCurrency)?.rateToAfn || (exchangeForm.fromCurrency === 'AFN' ? 1 : 0);
      const toRate = globalRates.find(r => r.currencyCode === exchangeForm.toCurrency)?.rateToAfn || (exchangeForm.toCurrency === 'AFN' ? 1 : 0);
      setExchangeForm(prev => ({ ...prev, fromRateToAfn: fromRate, toRateToAfn: toRate }));
    }
  }, [showExchangeModal, exchangeForm.fromCurrency, exchangeForm.toCurrency, globalRates]);

  const handleExchangeInternal = () => {
    if (!selectedCustomer) return;
    if (exchangeForm.amount > availableSourceBalance) {
      alert(`خطا: موجودی کافی نیست! مانده مشتری: ${availableSourceBalance.toLocaleString()} ${exchangeForm.fromCurrency}`);
      return;
    }
    if (exchangeForm.amount <= 0 || exchangeForm.fromRateToAfn <= 0 || exchangeForm.toRateToAfn <= 0) {
      alert("لطفاً مقادیر و نرخ‌ها را به درستی وارد کنید.");
      return;
    }

    const transaction: Transaction = {
      id: 'EX-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      customerId: selectedCustomer.id,
      type: TransactionType.EXCHANGE,
      amount: Number(exchangeForm.amount),
      currency: exchangeForm.fromCurrency,
      targetCurrency: exchangeForm.toCurrency,
      exchangeRate: exchangeForm.fromRateToAfn,
      targetRate: exchangeForm.toRateToAfn,
      convertedAmount: finalTargetAmount,
      description: exchangeForm.description || `تبادل داخلی: ${exchangeForm.amount} ${exchangeForm.fromCurrency} به ${exchangeForm.toCurrency}`,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING,
      profit: Number(exchangeForm.profit)
    };

    setTransactions(prev => [...prev, transaction]);
    setShowExchangeModal(false);
    setExchangeForm(prev => ({ ...prev, amount: 0, profit: 0, description: '' }));
  };

  const handleAddTransaction = () => {
    if (!selectedCustomer || newTrans.amount <= 0) return;
    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: selectedCustomer.id,
      type: showTransModal.type,
      amount: Number(newTrans.amount),
      currency: newTrans.currency,
      description: newTrans.description,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING
    };
    setTransactions(prev => [...prev, transaction]);
    setShowTransModal({ show: false, type: TransactionType.RESID });
    setNewTrans({ amount: 0, currency: 'AFN', description: '' });
  };

  const solveCalc = () => {
    try {
      const sanitized = calcExpression.replace(/[^-+*/0-9.]/g, '').replace(/×/g, '*').replace(/÷/g, '/');
      const result = eval(sanitized);
      if (!isNaN(result)) {
        const field = calcTarget === 'from' ? 'fromRateToAfn' : 'toRateToAfn';
        setExchangeForm(prev => ({ ...prev, [field]: Number(result.toFixed(4)) }));
        setCalcTarget(null);
        setCalcExpression('');
      }
    } catch (e) { alert("خطا در محاسبه!"); }
  };

  const filteredCustomers = useMemo(() => 
    customers.filter(c => 
      c.name.includes(searchTerm) || 
      c.code.includes(searchTerm)
    ), [customers, searchTerm]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      {/* Sidebar: Customer List */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 flex items-center gap-2"><Users size={20} className="text-blue-600" /> لیست مشتریان</h3>
            <button onClick={() => { setNewCustomer({name:'', phones:'', code:(customers.length+101).toString()}); setShowAddModal(true); }} className="p-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg"><UserPlus size={20} /></button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="جستجوی نام یا کد مشتری..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto pr-1">
            {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
              <button key={c.id} onClick={() => setSelectedCustomer(c)} className={`w-full p-5 rounded-2xl text-right transition-all group ${selectedCustomer?.id === c.id ? 'bg-slate-950 text-white shadow-xl' : 'bg-white border border-slate-50 hover:bg-slate-50 text-slate-700'}`}>
                <div className="flex justify-between items-start">
                   <p className="font-black text-sm">{c.name}</p>
                   <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg ${selectedCustomer?.id === c.id ? 'bg-blue-600/20 text-blue-200' : 'bg-slate-100 text-slate-500'}`}>{c.code}</span>
                </div>
                <p className="text-[10px] opacity-50 font-mono mt-1">{c.phones[0] || 'بدون شماره'}</p>
              </button>
            )) : (
              <p className="text-center py-10 text-slate-300 text-xs italic">مشتری یافت نشد.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-9">
        {!selectedCustomer ? (
          <div className="h-full min-h-[500px] bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
            <FileText size={64} className="mb-4" />
            <p className="font-black text-xl">یک مشتری را انتخاب کنید یا مشتری جدید ثبت کنید.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-[2rem] bg-blue-600 text-white flex items-center justify-center text-4xl font-black shadow-2xl shadow-blue-200">{selectedCustomer.name.charAt(0)}</div>
                  <div>
                    <div className="flex items-center gap-3">
                       <h2 className="text-3xl font-black text-slate-900">{selectedCustomer.name}</h2>
                       <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-xs font-black">کد: {selectedCustomer.code}</span>
                    </div>
                    <p className="text-xs font-black text-slate-400 mt-2">{selectedCustomer.phones[0] || 'بدون شماره تماس'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 w-full md:w-auto">
                  <button onClick={() => setShowTransModal({ show: true, type: TransactionType.RESID })} className="flex-1 md:flex-none bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all"><ArrowDownLeft size={20} /> رسید</button>
                  <button onClick={() => setShowTransModal({ show: true, type: TransactionType.BOARD })} className="flex-1 md:flex-none bg-rose-600 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all"><ArrowUpRight size={20} /> برد</button>
                  <button onClick={() => setShowExchangeModal(true)} className="flex-1 md:flex-none bg-slate-950 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl hover:scale-105 transition-all"><Repeat size={20} /> تبادل داخلی</button>
                </div>
              </div>

              <div className="mt-12 pt-10 border-t border-slate-50 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {SUPPORTED_CURRENCIES.map(curr => {
                  const balance = customerBalances[curr.code] || 0;
                  return (
                    <div key={curr.code} className={`p-6 rounded-[2rem] border transition-all ${balance >= 0 ? 'bg-slate-50 border-slate-100' : 'bg-rose-50 border-rose-100'}`}>
                      <p className="text-[10px] font-black uppercase text-slate-400 mb-2">{curr.label}</p>
                      <p className={`text-xl font-black ${balance >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{balance.toLocaleString()}</p>
                      <p className={`text-[9px] font-bold mt-1 ${balance >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>{balance >= 0 ? 'طلبکار (+)' : 'بدهکار (-)'}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
               <h3 className="text-xl font-black text-slate-900 mb-8">ریز تراکنش‌های حساب</h3>
               <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead>
                    <tr className="text-slate-400 border-b border-slate-50">
                      <th className="pb-6 px-4 font-black text-[10px] uppercase tracking-widest">تاریخ</th>
                      <th className="pb-6 px-4 font-black text-[10px] uppercase tracking-widest">نوع</th>
                      <th className="pb-6 px-4 font-black text-[10px] uppercase tracking-widest">مبلغ اصلی</th>
                      <th className="pb-6 px-4 font-black text-[10px] uppercase tracking-widest text-blue-600">نتیجه تبدیل</th>
                      <th className="pb-6 px-4 font-black text-[10px] uppercase tracking-widest">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions.filter(t => t.customerId === selectedCustomer.id).sort((a,b) => b.timestamp - a.timestamp).map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-6 px-4 text-xs font-bold text-slate-400">{new Date(t.timestamp).toLocaleDateString('fa-IR')}</td>
                        <td className="py-6 px-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${t.type === TransactionType.RESID ? 'bg-emerald-50 text-emerald-600' : t.type === TransactionType.BOARD ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'}`}>{t.type}</span></td>
                        <td className="py-6 px-4 font-black text-slate-800">{t.amount.toLocaleString()} <span className="text-[10px] text-slate-400">{t.currency}</span></td>
                        <td className="py-6 px-4 font-black text-blue-600">{t.convertedAmount ? `${t.convertedAmount.toLocaleString()} ${t.targetCurrency}` : '---'}</td>
                        <td className="py-6 px-4">
                          <span className={`text-[10px] font-black ${t.status === TransactionStatus.APPROVED ? 'text-emerald-500' : t.status === TransactionStatus.PENDING ? 'text-amber-500' : 'text-rose-500'}`}>
                            {t.status === TransactionStatus.APPROVED ? 'تائید شده' : t.status === TransactionStatus.PENDING ? 'در انتظار' : 'رد شده'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* EXCHANGE MODAL */}
      {showExchangeModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-4xl shadow-2xl border border-slate-100 animate-in zoom-in duration-300 relative overflow-visible">
            
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem]"><Repeat size={32} /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">تبادل ارز پایه افغانی</h3>
                  <p className="text-sm text-slate-400 font-medium italic">تمامی نرخ‌ها بر مبنای ۱ واحد ارز به افغانی سنجیده می‌شوند.</p>
                </div>
              </div>
              <button onClick={() => { setShowExchangeModal(false); setCalcTarget(null); }} className="p-3 bg-slate-100 rounded-full hover:rotate-90 transition-all"><X size={24} /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-11 gap-8 items-stretch mb-10">
              {/* SOURCE SIDE */}
              <div className="md:col-span-5 space-y-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                 <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">از موجودی (مبدأ)</label>
                    <div className="text-[10px] font-black text-blue-600 bg-white px-3 py-1 rounded-full border border-blue-100 flex items-center gap-1">
                       <Wallet size={10}/> مانده: {availableSourceBalance.toLocaleString()}
                    </div>
                 </div>
                 <select className="w-full p-5 bg-white rounded-2xl font-black text-xl outline-none border border-slate-200" value={exchangeForm.fromCurrency} onChange={e => setExchangeForm({...exchangeForm, fromCurrency: e.target.value})}>
                    {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                 </select>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مبلغ تبدیل</label>
                    <input type="number" className="w-full p-5 bg-white rounded-2xl text-2xl font-black outline-none border border-slate-200" value={exchangeForm.amount || ''} placeholder="0" onChange={e => setExchangeForm({...exchangeForm, amount: Number(e.target.value)})} />
                 </div>
                 <div className="relative pt-2">
                    <label className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1 mb-2"><Calculator size={10}/> نرخ {exchangeForm.fromCurrency} به افغانی</label>
                    <div className="flex gap-2">
                       <input type="number" step="any" className="flex-1 p-4 bg-white rounded-xl text-lg font-black outline-none border border-slate-200" value={exchangeForm.fromRateToAfn || ''} onChange={e => setExchangeForm({...exchangeForm, fromRateToAfn: Number(e.target.value)})} />
                       <button onClick={() => { setCalcTarget('from'); setCalcExpression(''); }} className={`p-4 rounded-xl shadow-md transition-all ${calcTarget === 'from' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:text-blue-600'}`}><Calculator size={20} /></button>
                    </div>
                    {calcTarget === 'from' && <CalculatorPanel expression={calcExpression} onAdd={v => setCalcExpression(p => p+v)} onClear={() => setCalcExpression('')} onBackspace={() => setCalcExpression(p => p.slice(0,-1))} onSolve={solveCalc} onClose={() => setCalcTarget(null)} />}
                 </div>
              </div>

              {/* AFN BRIDGE CENTER */}
              <div className="md:col-span-1 flex flex-col items-center justify-center gap-4">
                 <div className="h-full w-px bg-slate-200 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
                       <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-xl border-4 border-white z-10">؋</div>
                       <div className="bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm whitespace-nowrap">
                          <p className="text-[9px] font-black text-slate-400 uppercase text-center">معادل به افغانی</p>
                          <p className="text-xs font-black text-blue-600 text-center">{amountInAfn.toLocaleString()}</p>
                       </div>
                    </div>
                 </div>
              </div>

              {/* TARGET SIDE */}
              <div className="md:col-span-5 space-y-6 p-8 bg-blue-50/50 rounded-[2.5rem] border border-blue-100">
                 <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">به موجودی (مقصد)</label>
                 <select className="w-full p-5 bg-white rounded-2xl font-black text-xl outline-none border border-blue-100" value={exchangeForm.toCurrency} onChange={e => setExchangeForm({...exchangeForm, toCurrency: e.target.value})}>
                    {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                 </select>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest">مبلغ نهایی دریافتی</label>
                    <div className="w-full p-5 bg-white rounded-2xl text-2xl font-black text-blue-700 border-2 border-blue-200 flex items-center justify-between shadow-inner">
                       <span>{finalTargetAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                       <span className="text-[10px] text-blue-300 font-bold uppercase">{exchangeForm.toCurrency}</span>
                    </div>
                 </div>
                 <div className="relative pt-2">
                    <label className="text-[9px] font-black text-blue-600 uppercase flex items-center gap-1 mb-2"><Calculator size={10}/> نرخ {exchangeForm.toCurrency} به افغانی</label>
                    <div className="flex gap-2">
                       <input type="number" step="any" className="flex-1 p-4 bg-white rounded-xl text-lg font-black outline-none border border-blue-100" value={exchangeForm.toRateToAfn || ''} onChange={e => setExchangeForm({...exchangeForm, toRateToAfn: Number(e.target.value)})} />
                       <button onClick={() => { setCalcTarget('to'); setCalcExpression(''); }} className={`p-4 rounded-xl shadow-md transition-all ${calcTarget === 'to' ? 'bg-blue-600 text-white' : 'bg-white text-slate-400 hover:text-blue-600'}`}><Calculator size={20} /></button>
                    </div>
                    {calcTarget === 'to' && <CalculatorPanel expression={calcExpression} onAdd={v => setCalcExpression(p => p+v)} onClear={() => setCalcExpression('')} onBackspace={() => setCalcExpression(p => p.slice(0,-1))} onSolve={solveCalc} onClose={() => setCalcTarget(null)} />}
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
               <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex gap-4 items-start">
                  <AlertTriangle size={24} className="text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                     <b>قاعده صرافی:</b> این عملیات فقط ترازهای مشتری را در دفاتر صرافی جابجا می‌کند. هیچ وجه نقدی از صندوق خارج نمی‌شود. تمام نرخ‌ها نسبت به واحد افغانی مبنای محاسبه هستند.
                  </p>
               </div>
               <div className="space-y-4">
                  <input type="number" placeholder="سود معامله (AFN)..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold outline-none" value={exchangeForm.profit || ''} onChange={e => setExchangeForm({...exchangeForm, profit: Number(e.target.value)})} />
                  <button onClick={handleExchangeInternal} className="w-full bg-slate-950 text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-3">
                    <Check size={28} /> ثبت قطعی معامله در دفتر
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add Customer */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><UserPlus size={28} className="text-blue-600" /> افتتاح دفتر جدید</h3>
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-1">نام کامل مشتری</label>
                <input type="text" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="مثلاً: احمد همدرد" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-1 flex justify-between">کد اختصاصی مشتری <span className="text-[8px] text-blue-500">(اختیاری)</span></label>
                <div className="relative">
                   <Hash className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                   <input type="text" className="w-full p-5 pr-12 bg-slate-50 border border-slate-100 rounded-2xl font-black font-mono outline-none focus:ring-2 focus:ring-blue-500" placeholder="101" value={newCustomer.code} onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-1">شماره تماس</label>
                <input type="text" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold font-mono outline-none focus:ring-2 focus:ring-blue-500" placeholder="07xxxxxxx" value={newCustomer.phones} onChange={(e) => setNewCustomer({...newCustomer, phones: e.target.value})} />
              </div>
              <div className="flex gap-4 mt-6">
                <button onClick={() => {
                  if (!newCustomer.name) { alert("نام مشتری الزامی است."); return; }
                  const customer: Customer = { 
                    id: Math.random().toString(36).substr(2, 9), 
                    code: newCustomer.code || (customers.length + 101).toString(), 
                    name: newCustomer.name, 
                    phones: [newCustomer.phones].filter(Boolean), 
                    status: 'active', 
                    notes: '', 
                    balances: {} 
                  };
                  setCustomers(prev => [...prev, customer]);
                  setShowAddModal(false);
                  setSelectedCustomer(customer);
                }} className="flex-[2] bg-slate-950 text-white py-6 rounded-[1.5rem] font-black text-xl shadow-2xl hover:bg-black transition-all">ایجاد حساب صرافی</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-6 rounded-[1.5rem] font-black">لغو</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Modals (Trans) */}
      {showTransModal.show && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl border border-slate-100 animate-in zoom-in duration-300">
             <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-slate-900">ثبت {showTransModal.type} حساب</h3>
                <button onClick={() => setShowTransModal({show:false, type:TransactionType.RESID})} className="p-2 bg-slate-100 rounded-full"><X size={20}/></button>
             </div>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مبلغ</label>
                      <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl text-2xl font-black outline-none border border-slate-100" placeholder="0" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">واحد</label>
                      <select className="w-full p-5 bg-slate-50 rounded-2xl font-black text-xl outline-none border border-slate-100" value={newTrans.currency} onChange={e => setNewTrans({...newTrans, currency: e.target.value})}>
                         {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                   </div>
                </div>
                <textarea className="w-full p-5 bg-slate-50 rounded-2xl text-sm font-bold min-h-[100px] outline-none border border-slate-100" placeholder="توضیحات..." value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                <button onClick={handleAddTransaction} className={`w-full py-6 rounded-[1.5rem] font-black text-white text-xl shadow-2xl transition-all ${showTransModal.type === TransactionType.RESID ? 'bg-emerald-600' : 'bg-rose-600'}`}>ارسال جهت تائید مدیریت</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// MINI CALCULATOR PANEL
const CalculatorPanel: React.FC<{
  expression: string;
  onAdd: (v: string) => void;
  onClear: () => void;
  onBackspace: () => void;
  onSolve: () => void;
  onClose: () => void;
}> = ({ expression, onAdd, onClear, onBackspace, onSolve, onClose }) => {
  return (
    <div className="absolute top-full right-0 mt-4 w-72 bg-slate-900 rounded-[2rem] p-6 shadow-2xl z-[100] border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="flex justify-between items-center mb-5">
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Keypad Engine</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={16}/></button>
      </div>
      <div className="bg-slate-800 rounded-2xl p-5 mb-5 text-left min-h-[80px] flex flex-col justify-center border border-slate-700/50">
        <p className="text-slate-500 text-[10px] font-mono mb-1 truncate">{expression || '0'}</p>
        <p className="text-white text-2xl font-black font-mono">
          {(() => {
            try { 
              const sanitized = expression.replace(/[^-+*/0-9.]/g, '').replace(/×/g, '*').replace(/÷/g, '/');
              const res = eval(sanitized);
              return isNaN(res) ? '0' : res; 
            } catch { return expression || '0'; }
          })()}
        </p>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <CalcBtn label="C" onClick={onClear} color="text-rose-400 bg-slate-800" />
        <CalcBtn label="÷" onClick={() => onAdd('/')} color="text-blue-400 bg-slate-800" />
        <CalcBtn label="×" onClick={() => onAdd('*')} color="text-blue-400 bg-slate-800" />
        <CalcBtn label={<Delete size={18}/>} onClick={onBackspace} color="text-slate-400 bg-slate-800" />
        <CalcBtn label="7" onClick={() => onAdd('7')} />
        <CalcBtn label="8" onClick={() => onAdd('8')} />
        <CalcBtn label="9" onClick={() => onAdd('9')} />
        <CalcBtn label="-" onClick={() => onAdd('-')} color="text-blue-400 bg-slate-800" />
        <CalcBtn label="4" onClick={() => onAdd('4')} />
        <CalcBtn label="5" onClick={() => onAdd('5')} />
        <CalcBtn label="6" onClick={() => onAdd('6')} />
        <CalcBtn label="+" onClick={() => onAdd('+')} color="text-blue-400 bg-slate-800" />
        <CalcBtn label="1" onClick={() => onAdd('1')} />
        <CalcBtn label="2" onClick={() => onAdd('2')} />
        <CalcBtn label="3" onClick={() => onAdd('3')} />
        <CalcBtn label="." onClick={() => onAdd('.')} />
        <div className="col-span-2"><CalcBtn label="0" onClick={() => onAdd('0')} width="w-full" /></div>
        <div className="col-span-2"><button onClick={onSolve} className="w-full h-14 rounded-2xl bg-blue-600 text-white font-black hover:bg-blue-700 transition-all text-sm shadow-xl shadow-blue-500/20 active:scale-95">تائید حاصل</button></div>
      </div>
    </div>
  );
};

const CalcBtn = ({ label, onClick, color = "text-slate-300 bg-slate-800/50 hover:bg-slate-700", width = "w-full" }: any) => (
  <button onClick={onClick} className={`${width} h-14 flex items-center justify-center rounded-2xl font-black text-lg ${color} transition-all active:scale-90`}>{label}</button>
);

export default CustomerManager;
