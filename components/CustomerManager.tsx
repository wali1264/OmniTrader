
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, UserPlus, ArrowUpRight, ArrowDownLeft, 
  Users, FileText, Repeat, X, Calculator, Equal, ChevronRight, AlertTriangle, TrendingUp, Info, DollarSign
} from 'lucide-react';
import { Customer, Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, GlobalRate } from '../types';

interface CustomerManagerProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  globalRates: GlobalRate[];
}

const InlineCalculator = ({ onResult, onClose }: { onResult: (val: number) => void, onClose: () => void }) => {
  const [expr, setExpr] = useState('');
  const calculate = () => {
    try {
      const result = Function(`"use strict"; return (${expr.replace(/[^-()\d/*+.]/g, '')})`)();
      if (!isNaN(result)) onResult(result);
    } catch (e) { alert("عبارت نامعتبر"); }
  };
  const buttons = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '+'];
  return (
    <div className="absolute z-50 bottom-full mb-2 right-0 bg-slate-900 p-4 rounded-3xl shadow-2xl border border-white/10 w-48 animate-in zoom-in">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[8px] font-black text-slate-500 uppercase">Quick Calc</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={12}/></button>
      </div>
      <input type="text" className="w-full bg-black/40 border border-white/5 rounded-xl p-2 mb-3 text-left font-mono text-white text-sm outline-none" value={expr} onChange={(e) => setExpr(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && calculate()} autoFocus />
      <div className="grid grid-cols-4 gap-1.5">
        {buttons.map(b => (
          <button key={b} onClick={() => setExpr(prev => prev + b)} className="p-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-bold">{b === '*' ? '×' : b === '/' ? '÷' : b}</button>
        ))}
        <button onClick={calculate} className="col-span-1 p-2 bg-blue-600 text-white rounded-lg flex items-center justify-center"><Equal size={14}/></button>
      </div>
    </div>
  );
};

const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, setCustomers, transactions, setTransactions, globalRates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState<{show: boolean, type: TransactionType}>({ show: false, type: TransactionType.RESID });
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [activeCalc, setActiveCalc] = useState<'buy' | 'sell' | 'fee' | null>(null);

  const [exchangeForm, setExchangeForm] = useState({
    amount: 0,
    baseCurrency: 'USD',
    quoteCurrency: 'AFN',
    buyRate: 0,   // نرخی که با مشتری حساب می‌کنیم (Customer Rate)
    sellRate: 0,  // نرخ واقعی بازار/دفتری (Market Rate)
    fee: 0,       // کارمزد معامله به افغانی
    description: ''
  });

  const [newTrans, setNewTrans] = useState({ amount: 0, currency: 'AFN', description: '' });
  const [newCustomer, setNewCustomer] = useState({ name: '', code: '' });

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

  // منطق محاسباتی دقیق صرافی
  const calcResults = useMemo(() => {
    const totalBuy = exchangeForm.amount * exchangeForm.buyRate;   // چیزی که به مشتری می‌دهیم (یا از او کسر می‌کنیم)
    const totalSell = exchangeForm.amount * exchangeForm.sellRate; // ارزش واقعی ارز دریافتی در بازار
    const netProfit = totalSell - totalBuy - exchangeForm.fee;     // سود خالص نهایی
    return { totalBuy, totalSell, netProfit };
  }, [exchangeForm]);

  useEffect(() => {
    if (showExchangeModal) {
      const rate = globalRates.find(r => r.currencyCode === exchangeForm.baseCurrency)?.rateToAfn || 0;
      setExchangeForm(prev => ({ 
        ...prev, 
        buyRate: rate, 
        sellRate: rate + 0.5 // به صورت پیش‌فرض نیم واحد مارجین فروش
      }));
    }
  }, [showExchangeModal, exchangeForm.baseCurrency, globalRates]);

  const handleExchangeSubmit = () => {
    if (!selectedCustomer) return;
    if (exchangeForm.amount > (customerBalances[exchangeForm.baseCurrency] || 0)) {
      alert("خطا: موجودی کافی نیست."); return;
    }

    const transaction: Transaction = {
      id: 'EX-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      customerId: selectedCustomer.id,
      type: TransactionType.EXCHANGE,
      amount: exchangeForm.amount,
      currency: exchangeForm.baseCurrency,
      targetCurrency: exchangeForm.quoteCurrency,
      buyRate: exchangeForm.buyRate,
      sellRate: exchangeForm.sellRate,
      fee: exchangeForm.fee,
      totalBuy: calcResults.totalBuy,
      totalSell: calcResults.totalSell,
      netProfit: calcResults.netProfit,
      profit: calcResults.netProfit, 
      convertedAmount: calcResults.totalBuy, 
      description: exchangeForm.description || `تبادله ${exchangeForm.amount} ${exchangeForm.baseCurrency} به افغانی بر پایه سود خالص`,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING,
      isBank: false
    };

    setTransactions(prev => [...prev, transaction]);
    setShowExchangeModal(false);
    alert("سند تبادله با موفقیت ثبت و آماده تائید مدیریت شد.");
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
      status: TransactionStatus.PENDING,
      isBank: false
    };
    setTransactions(prev => [...prev, transaction]);
    setShowTransModal({ show: false, type: TransactionType.RESID });
    setNewTrans({ amount: 0, currency: 'AFN', description: '' });
  };

  const filteredCustomers = useMemo(() => customers.filter(c => c.name.includes(searchTerm) || c.code.includes(searchTerm)), [customers, searchTerm]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      <div className="lg:col-span-3">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-black text-slate-800 flex items-center gap-2"><Users size={20} className="text-blue-600" /> مشتریان</h3>
            <button onClick={() => setShowAddModal(true)} className="p-2.5 bg-blue-600 text-white rounded-2xl"><UserPlus size={20} /></button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="جستجو..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto custom-scrollbar">
            {filteredCustomers.map(c => (
              <button key={c.id} onClick={() => setSelectedCustomer(c)} className={`w-full p-5 rounded-2xl text-right transition-all ${selectedCustomer?.id === c.id ? 'bg-slate-950 text-white shadow-xl' : 'bg-white border border-slate-50 hover:bg-slate-50'}`}>
                <div className="flex justify-between items-start">
                   <p className="font-black text-sm">{c.name}</p>
                   <span className="text-[9px] opacity-60">{c.code}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-9">
        {!selectedCustomer ? (
          <div className="h-full min-h-[500px] bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
            <Users size={64} className="mb-4" />
            <p className="font-black text-xl">یک مشتری انتخاب کنید.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black">{selectedCustomer.name.charAt(0)}</div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{selectedCustomer.name}</h2>
                    <p className="text-xs font-black text-slate-400">کد دفتری: {selectedCustomer.code}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowTransModal({ show: true, type: TransactionType.RESID })} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs flex items-center gap-2"><ArrowDownLeft size={18} /> رسید نقد</button>
                  <button onClick={() => setShowTransModal({ show: true, type: TransactionType.BOARD })} className="bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs flex items-center gap-2"><ArrowUpRight size={18} /> بورد نقد</button>
                  <button onClick={() => setShowExchangeModal(true)} className="bg-slate-950 text-white px-6 py-4 rounded-2xl font-black text-xs flex items-center gap-2"><Repeat size={18} /> تبادله ارز</button>
                </div>
              </div>
              <div className="mt-12 pt-10 border-t border-slate-50 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {SUPPORTED_CURRENCIES.map(curr => (
                  <div key={curr.code} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest">{curr.label}</p>
                    <p className={`text-xl font-black ${(customerBalances[curr.code] || 0) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>{(customerBalances[curr.code] || 0).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100">
               <h3 className="text-xl font-black mb-8 px-4">تراکنش‌های اخیر مشتری</h3>
               <table className="w-full text-right text-sm">
                  <thead className="text-slate-400 border-b border-slate-50 font-black">
                    <tr><th className="pb-6 px-6">تاریخ</th><th className="pb-6 px-6">نوع</th><th className="pb-6 px-6">مبلغ</th><th className="pb-6 px-6">شرح</th><th className="pb-6 px-6">وضعیت</th></tr>
                  </thead>
                  <tbody>
                    {transactions.filter(t => t.customerId === selectedCustomer.id).sort((a,b) => b.timestamp - a.timestamp).map(t => (
                      <tr key={t.id} className="border-b border-slate-50">
                        <td className="py-6 px-6 text-xs text-slate-400">{new Date(t.timestamp).toLocaleDateString('fa-IR')}</td>
                        <td className="py-6 px-6 font-black text-xs">{t.type}</td>
                        <td className="py-6 px-6 font-black">{t.amount.toLocaleString()} <span className="text-[10px] opacity-40">{t.currency}</span></td>
                        <td className="py-6 px-6 text-slate-500 text-xs truncate max-w-[200px]">{t.description}</td>
                        <td className="py-6 px-6">
                           <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{t.status === TransactionStatus.APPROVED ? 'تائید' : 'انتظار'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
        )}
      </div>

      {showExchangeModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-4xl shadow-2xl animate-in zoom-in">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl"><TrendingUp size={28} /></div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">محاسبه و ثبت سود خالص تبادله</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">فرمول: (مقدار × نرخ فروش بازار) - (مقدار × نرخ خرید مشتری) - کارمزد</p>
                </div>
              </div>
              <button onClick={() => setShowExchangeModal(false)} className="p-3 hover:bg-rose-50 rounded-full transition-all"><X size={24}/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-8 items-start">
              {/* بخش مشتری - خرید از مشتری */}
              <div className="space-y-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Users size={12}/> جزئیات مشتری (Buy)</label>
                  <span className="text-[10px] font-bold text-slate-400">موجودی: {customerBalances[exchangeForm.baseCurrency]?.toLocaleString()}</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase">ارز پایه</label>
                     <select className="w-full p-4 bg-white rounded-2xl font-black border border-slate-200 outline-none" value={exchangeForm.baseCurrency} onChange={e => setExchangeForm({...exchangeForm, baseCurrency: e.target.value})}>
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                     </select>
                   </div>
                   <div className="space-y-2">
                     <label className="text-[9px] font-black text-slate-400 uppercase">مقدار ارز</label>
                     <input type="number" className="w-full p-4 bg-white rounded-2xl font-bold border border-slate-200 text-base outline-none" placeholder="0" value={exchangeForm.amount || ''} onChange={e => setExchangeForm({...exchangeForm, amount: Number(e.target.value)})} />
                   </div>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[9px] font-black text-emerald-600 uppercase mr-1 flex justify-between">نرخ توافقی مشتری (Buy Rate) <button onClick={() => setActiveCalc('buy')} className="text-blue-600"><Calculator size={14}/></button></label>
                  <div className="relative">
                    <input type="number" step="0.001" className="w-full p-5 bg-white rounded-2xl font-black border border-slate-200 text-sm outline-none" value={exchangeForm.buyRate} onChange={e => setExchangeForm({...exchangeForm, buyRate: Number(e.target.value)})} />
                    {activeCalc === 'buy' && <InlineCalculator onClose={() => setActiveCalc(null)} onResult={(v) => { setExchangeForm({...exchangeForm, buyRate: v}); setActiveCalc(null); }} />}
                  </div>
                  <p className="text-[9px] text-slate-400 italic">مبلغ کسر شده از مشتری بر اساس این نرخ است.</p>
                </div>

                <div className="p-5 bg-white rounded-2xl border border-slate-100 shadow-inner">
                   <p className="text-[9px] font-black text-slate-400 uppercase mb-1">جمع پرداختی صرافی (Total Buy)</p>
                   <p className="text-xl font-black text-slate-700">{calcResults.totalBuy.toLocaleString()} <span className="text-[10px]">AFN</span></p>
                </div>
              </div>

              {/* بخش مارکت - فروش واقعی */}
              <div className="space-y-6 p-8 bg-blue-50/20 rounded-[2.5rem] border border-blue-100">
                <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-2"><TrendingUp size={12}/> ارزش واقعی بازار (Sell)</label>
                
                <div className="space-y-2 relative">
                  <label className="text-[9px] font-black text-blue-600 uppercase mr-1 flex justify-between">نرخ دفتری/مارکت (Sell Rate) <button onClick={() => setActiveCalc('sell')} className="text-blue-600"><Calculator size={14}/></button></label>
                  <div className="relative">
                    <input type="number" step="0.001" className="w-full p-5 bg-white rounded-2xl font-black border border-slate-200 text-sm outline-none" value={exchangeForm.sellRate} onChange={e => setExchangeForm({...exchangeForm, sellRate: Number(e.target.value)})} />
                    {activeCalc === 'sell' && <InlineCalculator onClose={() => setActiveCalc(null)} onResult={(v) => { setExchangeForm({...exchangeForm, sellRate: v}); setActiveCalc(null); }} />}
                  </div>
                  <p className="text-[9px] text-slate-400 italic">ارزش واقعی این ارز در مارکت صرافی.</p>
                </div>

                <div className="space-y-2 relative">
                  <label className="text-[9px] font-black text-slate-400 uppercase mr-1 flex justify-between">کارمزد معامله (Fee in AFN) <button onClick={() => setActiveCalc('fee')} className="text-blue-600"><Calculator size={14}/></button></label>
                  <div className="relative">
                    <input type="number" className="w-full p-5 bg-white rounded-2xl font-black border border-slate-200 text-sm outline-none" value={exchangeForm.fee} onChange={e => setExchangeForm({...exchangeForm, fee: Number(e.target.value)})} />
                    {activeCalc === 'fee' && <InlineCalculator onClose={() => setActiveCalc(null)} onResult={(v) => { setExchangeForm({...exchangeForm, fee: v}); setActiveCalc(null); }} />}
                  </div>
                </div>

                <div className={`p-6 rounded-2xl border-2 transition-all shadow-lg ${calcResults.netProfit < 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase">سود عملیاتی خالص</span>
                    {calcResults.netProfit < 0 && <span className="flex items-center gap-1 text-rose-600 text-[10px] font-black animate-pulse"><AlertTriangle size={14}/> ضرر تبادله!</span>}
                  </div>
                  <p className={`text-3xl font-black text-center ${calcResults.netProfit < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{calcResults.netProfit.toLocaleString()} <span className="text-xs uppercase">AFN</span></p>
                </div>
              </div>
            </div>

            <div className="mb-8">
               <label className="text-[10px] font-black text-slate-400 uppercase mr-1">شرح تراکنش</label>
               <input type="text" placeholder="مثلاً: جابجایی دالر به افغانی بر اساس مارکت" className="w-full p-4 bg-slate-50 rounded-2xl font-bold border border-slate-100 outline-none focus:bg-white" value={exchangeForm.description} onChange={e => setExchangeForm({...exchangeForm, description: e.target.value})} />
            </div>
            
            <button onClick={handleExchangeSubmit} disabled={exchangeForm.amount <= 0} className="w-full bg-slate-950 text-white py-6 rounded-3xl font-black text-xl shadow-2xl hover:bg-black transition-all disabled:opacity-50 flex items-center justify-center gap-4 active:scale-95">
              تائید نهایی و ثبت سند سود <ChevronRight size={24}/>
            </button>
          </div>
        </div>
      )}

      {/* مودال‌های پایه بدون تغییر */}
      {showTransModal.show && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">ثبت سند نقدی</h3>
                <button onClick={() => setShowTransModal({show:false, type:TransactionType.RESID})} className="p-3 bg-slate-50 rounded-full hover:bg-rose-50"><X size={20}/></button>
             </div>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مبلغ</label>
                      <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl text-lg font-black border border-slate-100 outline-none" placeholder="0" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">واحد پول</label>
                      <select className="w-full p-5 bg-slate-50 rounded-2xl font-black border border-slate-100 outline-none" value={newTrans.currency} onChange={e => setNewTrans({...newTrans, currency: e.target.value})}>
                         {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                   </div>
                </div>
                <textarea className="w-full p-5 bg-slate-50 rounded-2xl text-sm font-bold min-h-[100px] border border-slate-100 outline-none" placeholder="شرح تراکنش..." value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                <button onClick={handleAddTransaction} className={`w-full py-6 rounded-2xl font-black text-white text-xl shadow-xl transition-all ${showTransModal.type === TransactionType.RESID ? 'bg-emerald-600' : 'bg-rose-600'}`}>ثبت نهایی سند</button>
             </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl">
            <h3 className="text-2xl font-black mb-8 text-slate-900">حساب مشتری جدید</h3>
            <div className="space-y-6">
              <input type="text" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border border-slate-100 outline-none" placeholder="نام مشتری" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
              <input type="text" className="w-full p-5 bg-slate-50 rounded-2xl font-black border border-slate-100 outline-none" placeholder="کد دفتری" value={newCustomer.code} onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})} />
              <button onClick={() => {
                if(!newCustomer.name) return;
                const customer: Customer = { id: Math.random().toString(36).substr(2, 9), code: newCustomer.code || (customers.length + 101).toString(), name: newCustomer.name, phones: [], status: 'active', notes: '', balances: {} };
                setCustomers(prev => [...prev, customer]);
                setShowAddModal(false);
                setNewCustomer({name: '', code: ''});
              }} className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black shadow-lg">ایجاد دفتر حساب</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
