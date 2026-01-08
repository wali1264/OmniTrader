
import React, { useState, useMemo } from 'react';
import { 
  Search, Users, FileText, X, 
  Check, Plus, ArrowRightLeft,
  TrendingUp, TrendingDown, ChevronLeft, Calculator, AlertCircle, CreditCard, Hash, Save, Settings, RefreshCw
} from 'lucide-react';
import { Customer, Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, GlobalRate } from '../types';

const SYSTEM_TIME_OFFSET = 3600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;

interface CustomerManagerProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  globalRates: GlobalRate[];
  setGlobalRates: React.Dispatch<React.SetStateAction<GlobalRate[]>>;
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, setCustomers, transactions, setTransactions, globalRates, setGlobalRates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transModalState, setTransModalState] = useState<{show: boolean, type: TransactionType}>({ show: false, type: TransactionType.RESID });
  
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exData, setExData] = useState<{from: string, to: string, amount: number, rate: number, operator: 'multiply' | 'divide', profit: number, profitCategory: string, description: string}>({ 
    from: 'USD', 
    to: 'AFN', 
    amount: 0, 
    rate: 0,
    operator: 'multiply',
    profit: 0,
    profitCategory: 'None',
    description: ''
  });

  const [newTrans, setNewTrans] = useState({ amount: 0, currency: 'AFN', description: '' });
  const [newCustomer, setNewCustomer] = useState({ name: '', code: '', phone: '' });

  const getCustomerAllBalances = (customer: Customer) => {
    const balances: Record<string, number> = {};
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED && t.customerId === customer.id);
    
    SUPPORTED_CURRENCIES.forEach(curr => {
      const initial = customer.balances[curr.code] || 0;
      const resid = approved.filter(t => t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      const board = approved.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      const exIn = approved.filter(t => t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
      const exOut = approved.filter(t => t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      balances[curr.code] = initial + resid - board - exOut + exIn;
    });
    return balances;
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.includes(searchTerm) || c.code.includes(searchTerm));
  }, [customers, searchTerm]);

  const selectedBalances = useMemo(() => {
    if (!selectedCustomer) return {};
    return getCustomerAllBalances(selectedCustomer);
  }, [selectedCustomer, transactions]);

  const handleSaveNewCustomer = () => {
    if (!newCustomer.name || !newCustomer.code) {
      alert("لطفاً نام و کد مشتری را وارد کنید.");
      return;
    }
    const customer: Customer = {
      id: 'CUST-' + Math.random().toString(36).substr(2, 7).toUpperCase(),
      code: newCustomer.code,
      name: newCustomer.name,
      phones: newCustomer.phone ? [newCustomer.phone] : [],
      status: 'active',
      notes: '',
      balances: SUPPORTED_CURRENCIES.reduce((acc, curr) => ({ ...acc, [curr.code]: 0 }), {})
    };
    setCustomers(prev => [...prev, customer]);
    setShowAddModal(false);
    setNewCustomer({ name: '', code: '', phone: '' });
  };

  const handleAddTransaction = () => {
    if (!selectedCustomer || newTrans.amount <= 0) {
      alert("لطفاً مبلغ معتبری وارد کنید.");
      return;
    }
    const transaction: Transaction = {
      id: 'TR-' + Math.random().toString(36).substr(2, 7).toUpperCase(),
      customerId: selectedCustomer.id,
      type: transModalState.type,
      amount: Number(newTrans.amount),
      currency: newTrans.currency,
      description: newTrans.description || (transModalState.type === TransactionType.RESID ? 'رسید نقد' : 'برد نقد'),
      timestamp: getSystemNow(),
      status: TransactionStatus.PENDING,
      isBank: false
    };
    setTransactions(prev => [...prev, transaction]);
    setTransModalState({ show: false, type: TransactionType.RESID });
    setNewTrans({ amount: 0, currency: 'AFN', description: '' });
    alert("تراکنش با موفقیت ثبت و در صف تائید قرار گرفت.");
  };

  const handleManualConversionRecord = () => {
    if (!selectedCustomer || exData.amount <= 0 || exData.rate <= 0) return;
    const finalConverted = exData.operator === 'multiply' ? exData.amount * exData.rate : exData.amount / exData.rate;
    const transaction: Transaction = {
      id: 'CNV-' + Math.random().toString(36).substr(2, 7).toUpperCase(),
      customerId: selectedCustomer.id,
      type: TransactionType.EXCHANGE,
      amount: exData.amount,
      currency: exData.from,
      targetCurrency: exData.to,
      exchangeRate: exData.rate,
      convertedAmount: finalConverted,
      netProfit: exData.profit,
      profitCategory: exData.profitCategory,
      description: exData.description || `تبدیل دستی: ${exData.amount} ${exData.from} به ${finalConverted.toFixed(2)} ${exData.to}`,
      timestamp: getSystemNow(),
      status: TransactionStatus.PENDING,
      isBank: false
    };
    setTransactions(prev => [...prev, transaction]);
    setShowExchangeModal(false);
    setExData({ from: 'USD', to: 'AFN', amount: 0, rate: 0, operator: 'multiply', profit: 0, profitCategory: 'None', description: '' });
  };

  const calculatedConvertedAmount = useMemo(() => {
    if (exData.amount <= 0 || exData.rate <= 0) return 0;
    return exData.operator === 'multiply' ? exData.amount * exData.rate : exData.amount / exData.rate;
  }, [exData.amount, exData.rate, exData.operator]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full text-right font-['Vazirmatn']">
      <div className="lg:col-span-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-[12px] uppercase tracking-wider">لیست مشتریان</h3>
            <button onClick={() => setShowAddModal(true)} className="p-1.5 bg-slate-900 text-white rounded-lg shadow-sm hover:bg-black transition-all"><Plus size={14} /></button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            <input type="text" placeholder="جستجوی کد یا نام..." className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pr-9 pl-3 text-[11px] font-bold outline-none focus:border-slate-400 focus:bg-white transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
            {filteredCustomers.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSelectedCustomer(c)} 
                className={`w-full p-3.5 rounded-xl text-right transition-all border ${selectedCustomer?.id === c.id ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-center">
                  <p className="font-bold text-[11px]">{c.name}</p>
                  <p className={`text-[9px] font-mono ${selectedCustomer?.id === c.id ? 'text-slate-400' : 'text-slate-400'}`}>{c.code}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-9">
        {!selectedCustomer ? (
          <div className="h-full min-h-[500px] bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-300">
            <Users size={40} className="mb-4 opacity-10" />
            <p className="font-bold text-xs uppercase tracking-widest">مشتری مورد نظر را انتخاب نمایید</p>
          </div>
        ) : (
          <div className="space-y-6 fade-entry">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4 text-right">
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center text-xl font-bold border border-slate-200">{selectedCustomer.name.charAt(0)}</div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">{selectedCustomer.name}</h2>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">System Identifier: {selectedCustomer.code}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowExchangeModal(true)} className="bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl font-bold text-[10px] hover:bg-slate-100 transition-all">تبدیل دستی</button>
                <button onClick={() => setTransModalState({ show: true, type: TransactionType.RESID })} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-900/10">ثبت رسید (+)</button>
                <button onClick={() => setTransModalState({ show: true, type: TransactionType.BOARD })} className="bg-rose-600 text-white px-5 py-2.5 rounded-xl font-bold text-[10px] hover:bg-rose-700 transition-all shadow-sm shadow-rose-900/10">ثبت بورد (-)</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {SUPPORTED_CURRENCIES.map(curr => {
                const val = selectedBalances[curr.code] || 0;
                return (
                  <div key={curr.code} className="p-4 rounded-xl border bg-white border-slate-200 shadow-sm text-right">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{curr.label}</span>
                    <p className={`text-base font-black tabular-nums tnum ${val > 0 ? 'text-emerald-700' : val < 0 ? 'text-rose-700' : 'text-slate-300'}`}>
                      {val.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-5 border-b border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-400" />
                    <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Statement of Account</h3>
                  </div>
                  <span className="bg-slate-50 text-slate-400 text-[9px] px-2 py-0.5 rounded-lg font-bold">LATEST RECORDS</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-[11px]">
                    <thead className="bg-slate-50/50 text-slate-400 uppercase">
                      <tr className="border-b border-slate-100">
                        <th className="p-4 font-bold text-right">Date & Time</th>
                        <th className="p-4 font-bold text-right">Type</th>
                        <th className="p-4 font-bold text-center">Unit</th>
                        <th className="p-4 font-bold text-center">Amount</th>
                        <th className="p-4 font-bold text-right">Description</th>
                        <th className="p-4 font-bold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.filter(t => t.customerId === selectedCustomer.id).sort((a,b) => b.timestamp - a.timestamp).map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-slate-400 font-bold tnum">
                            {new Date(t.timestamp).toLocaleDateString('fa-IR')} <span className="opacity-40 font-normal">| {new Date(t.timestamp).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className={`p-4 font-black ${t.type === TransactionType.RESID ? 'text-emerald-600' : t.type === TransactionType.BOARD ? 'text-rose-600' : 'text-slate-900'}`}>{t.type}</td>
                          <td className="p-4 font-black text-center text-slate-500 uppercase">{t.currency}</td>
                          <td className="p-4 font-black text-center tnum text-sm text-slate-900">{t.amount.toLocaleString()}</td>
                          <td className="p-4 text-slate-500 font-bold max-w-[220px] truncate">{t.description}</td>
                          <td className="p-4 text-center">
                             <span className={`text-[9px] font-black px-2 py-1 rounded-lg border ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{t.status === TransactionStatus.APPROVED ? 'APPROVED' : 'PENDING'}</span>
                          </td>
                        </tr>
                      ))}
                      {transactions.filter(t => t.customerId === selectedCustomer.id).length === 0 && (
                        <tr><td colSpan={6} className="p-12 text-center text-slate-300 font-bold uppercase italic text-[10px] tracking-widest">No transactions found for this period</td></tr>
                      )}
                    </tbody>
                 </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* مودال ثبت رسید یا بورد جدید */}
      {transModalState.show && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-200 text-right animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                   <div className={`p-2 rounded-lg text-white ${transModalState.type === TransactionType.RESID ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      {transModalState.type === TransactionType.RESID ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
                   </div>
                   <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">ثبت سند {transModalState.type} جدید</h3>
                </div>
                <button onClick={() => setTransModalState({...transModalState, show: false})} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             
             <div className="space-y-5">
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">واحد ارز</label>
                      <div className="grid grid-cols-3 gap-2">
                        {SUPPORTED_CURRENCIES.map(c => (
                           <button 
                             key={c.code} 
                             onClick={() => setNewTrans({...newTrans, currency: c.code})}
                             className={`py-2 rounded-lg text-[9px] font-black border transition-all ${newTrans.currency === c.code ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                           >
                             {c.code}
                           </button>
                        ))}
                      </div>
                   </div>

                   <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">مبلغ سند ({newTrans.currency})</label>
                      <input 
                        type="number" 
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black text-xl outline-none text-right tnum" 
                        placeholder="0.00"
                        value={newTrans.amount || ''} 
                        onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} 
                      />
                   </div>
                </div>

                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">شرح تراکنش</label>
                   <textarea 
                     className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-[11px] min-h-[100px] outline-none text-right" 
                     placeholder="مثلاً: بابت تسویه حواله..." 
                     value={newTrans.description} 
                     onChange={e => setNewTrans({...newTrans, description: e.target.value})}
                   />
                </div>

                <div className="pt-2">
                   <button 
                     onClick={handleAddTransaction} 
                     className={`w-full py-4 rounded-xl font-black text-[12px] text-white shadow-xl transition-all active:scale-95 ${transModalState.type === TransactionType.RESID ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/10' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-900/10'}`}
                   >
                     تائید و ثبت سند
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* مودال ثبت مشتری جدید */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-200 text-right animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">تعریف مشتری جدید</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">نام و نام خانوادگی</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none text-right focus:bg-white" placeholder="مثلاً: حاجی معراج" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">کد شناسایی مشتری</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-mono font-bold outline-none text-right focus:bg-white tnum" placeholder="001" value={newCustomer.code} onChange={e => setNewCustomer({...newCustomer, code: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">شماره تماس (اختیاری)</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none text-right focus:bg-white tnum" placeholder="07xxxxxxxx" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                </div>
                <div className="pt-4 flex gap-3">
                   <button onClick={handleSaveNewCustomer} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black text-[11px] uppercase shadow-md hover:bg-black transition-all flex items-center justify-center gap-2">
                     <Save size={16} /> ذخیره مشتری
                   </button>
                   <button onClick={() => setShowAddModal(false)} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-xl font-bold text-[11px]">لغو</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showExchangeModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl border border-slate-200 text-right animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-slate-900" />
                  <h3 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">ماشین حساب تبدیل ارزی</h3>
                </div>
                <button onClick={() => setShowExchangeModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
             </div>
             <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1 text-right">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">ارز مبدأ</label>
                      <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none" value={exData.from} onChange={e => setExData({...exData, from: e.target.value})}>
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1 text-right">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">ارز مقصد</label>
                      <select className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-black outline-none" value={exData.to} onChange={e => setExData({...exData, to: e.target.value})}>
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                      </select>
                   </div>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                   <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">مبلغ ارز مبدأ</label>
                      <input type="number" className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-black text-lg outline-none text-center tnum" placeholder="0.00" value={exData.amount || ''} onChange={e => setExData({...exData, amount: Number(e.target.value)})} />
                   </div>
                   
                   <div className="flex items-center gap-4 justify-center">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <div className="flex bg-white border border-slate-200 p-1 rounded-xl">
                        <button onClick={() => setExData({...exData, operator: 'multiply'})} className={`px-4 py-2 rounded-lg font-black text-sm transition-all ${exData.operator === 'multiply' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>×</button>
                        <button onClick={() => setExData({...exData, operator: 'divide'})} className={`px-4 py-2 rounded-lg font-black text-sm transition-all ${exData.operator === 'divide' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>÷</button>
                      </div>
                      <div className="h-px bg-slate-200 flex-1"></div>
                   </div>

                   <div className="flex flex-col gap-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">نرخ تبدیل ارز</label>
                      <input type="number" step="0.0001" className="w-full p-3.5 bg-white border border-slate-200 rounded-xl font-black text-lg outline-none text-center text-blue-600 tnum" placeholder="0.0000" value={exData.rate || ''} onChange={e => setExData({...exData, rate: Number(e.target.value)})} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl text-center">
                      <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">خروجی نهایی</label>
                      <div className="flex items-center justify-center gap-2">
                         <span className="text-xl font-black text-slate-900 tabular-nums tnum">{calculatedConvertedAmount.toLocaleString()}</span>
                         <span className="text-[9px] font-black text-slate-400 uppercase">{exData.to}</span>
                      </div>
                   </div>
                   <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-center">
                      <label className="text-[9px] font-black text-emerald-600 uppercase block mb-1">سود تبادله (AFN)</label>
                      <div className="flex items-center justify-center gap-2">
                         <input type="number" className="w-full bg-transparent text-center text-xl font-black text-emerald-700 outline-none placeholder:text-emerald-200 tnum" placeholder="0" value={exData.profit || ''} onChange={e => setExData({...exData, profit: Number(e.target.value)})} />
                      </div>
                   </div>
                </div>

                <button onClick={handleManualConversionRecord} className="w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[11px] uppercase shadow-lg hover:bg-black transition-all">ثبت قطعی سند تبدیل ارز</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
