
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
  const [showRatesModal, setShowRatesModal] = useState(false);
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

  const handleUpdateRate = (code: string, newRate: number) => {
    setGlobalRates(prev => prev.map(r => r.currencyCode === code ? { ...r, rateToAfn: newRate, lastUpdated: getSystemNow() } : r));
  };

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
    if (!selectedCustomer || newTrans.amount <= 0) return;
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full text-right">
      <div className="lg:col-span-3">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sticky top-20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-sm">لیست مشتریان</h3>
            <button onClick={() => setShowAddModal(true)} className="p-1.5 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700 transition-all"><Plus size={14} /></button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
            <input type="text" placeholder="جستجو..." className="w-full bg-slate-50 border border-slate-200 rounded py-2 pr-9 pl-3 text-[11px] font-medium outline-none focus:border-indigo-400 focus:bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto custom-scrollbar">
            {filteredCustomers.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSelectedCustomer(c)} 
                className={`w-full p-3 rounded-lg text-right transition-all border ${selectedCustomer?.id === c.id ? 'bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-center">
                  <p className="font-bold text-[11px]">{c.name}</p>
                  <p className="text-[9px] font-mono text-slate-400">{c.code}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-9">
        {!selectedCustomer ? (
          <div className="h-full min-h-[500px] bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center text-slate-400">
            <Users size={32} className="mb-4 opacity-10" />
            <p className="font-bold text-sm">یک مشتری را از لیست انتخاب کنید</p>
          </div>
        ) : (
          <div className="space-y-6 fade-entry">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4 text-right">
                <div className="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-bold border border-indigo-200">{selectedCustomer.name.charAt(0)}</div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedCustomer.name}</h2>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase">کد شناسایی: {selectedCustomer.code}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowExchangeModal(true)} className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-[10px] hover:bg-black transition-all">تبدیل دستی</button>
                <button onClick={() => setTransModalState({ show: true, type: TransactionType.RESID })} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] hover:bg-emerald-700 transition-all">ثبت رسید (+)</button>
                <button onClick={() => setTransModalState({ show: true, type: TransactionType.BOARD })} className="bg-rose-600 text-white px-4 py-2 rounded-lg font-bold text-[10px] hover:bg-rose-700 transition-all">ثبت برد (-)</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {SUPPORTED_CURRENCIES.map(curr => {
                const val = selectedBalances[curr.code] || 0;
                return (
                  <div key={curr.code} className="p-4 rounded-xl border bg-white border-slate-200 shadow-sm">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{curr.label}</span>
                    <p className={`text-base font-bold tabular-nums mt-1 ${val > 0 ? 'text-emerald-700' : val < 0 ? 'text-rose-700' : 'text-slate-400'}`}>
                      {val.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
                  <FileText size={16} className="text-slate-400" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">صورتحساب تفصیلی</h3>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-[11px]">
                    <thead className="bg-slate-50 text-slate-500 uppercase">
                      <tr>
                        <th className="p-3 font-bold">تاریخ و زمان</th>
                        <th className="p-3 font-bold">نوع</th>
                        <th className="p-3 font-bold text-center">واحد</th>
                        <th className="p-3 font-bold text-center">مبلغ</th>
                        <th className="p-3 font-bold">شرح</th>
                        <th className="p-3 font-bold text-center">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.filter(t => t.customerId === selectedCustomer.id).sort((a,b) => b.timestamp - a.timestamp).map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 text-slate-400 font-medium tnum">
                            {new Date(t.timestamp).toLocaleDateString('fa-IR')} <span className="text-[9px] opacity-60">| {new Date(t.timestamp).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</span>
                          </td>
                          <td className={`p-3 font-bold ${t.type === TransactionType.RESID ? 'text-emerald-600' : t.type === TransactionType.BOARD ? 'text-rose-600' : 'text-indigo-600'}`}>{t.type}</td>
                          <td className="p-3 font-bold text-center text-slate-500">{t.currency}</td>
                          <td className="p-3 font-bold text-center tnum text-sm">{t.amount.toLocaleString()}</td>
                          <td className="p-3 text-slate-600 font-medium max-w-[200px] truncate">{t.description}</td>
                          <td className="p-3 text-center">
                             <span className={`text-[9px] font-bold px-2 py-1 rounded border ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>{t.status === TransactionStatus.APPROVED ? 'تائید شده' : 'در انتظار'}</span>
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

      {/* مودال ثبت مشتری جدید */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-xl border border-slate-200 text-right">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase">تعریف مشتری جدید</h3>
                <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">نام و نام خانوادگی</label>
                   <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-sm font-bold outline-none text-right focus:border-indigo-500" placeholder="مثلاً: احمد رضایی" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">کد شناسایی مشتری</label>
                   <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-sm font-mono font-bold outline-none text-right focus:border-indigo-500" placeholder="مثلاً: 101" value={newCustomer.code} onChange={e => setNewCustomer({...newCustomer, code: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">شماره تماس (اختیاری)</label>
                   <input type="text" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-sm font-bold outline-none text-right focus:border-indigo-500" placeholder="09xxxxxxxxx" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                </div>
                <div className="pt-4 flex gap-3">
                   <button onClick={handleSaveNewCustomer} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-bold text-xs uppercase shadow-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2">
                     <Save size={14} /> ذخیره مشتری
                   </button>
                   <button onClick={() => setShowAddModal(false)} className="px-6 py-3 bg-slate-100 text-slate-500 rounded-lg font-bold text-xs">لغو</button>
                </div>
             </div>
          </div>
        </div>
      )}

      {showExchangeModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-xl border border-slate-200 text-right">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Calculator size={18} className="text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase">ماشین حساب تبدیل ارزی</h3>
                </div>
                <button onClick={() => setShowExchangeModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
             </div>
             <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1 text-right">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">از ارز</label>
                      <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold outline-none" value={exData.from} onChange={e => setExData({...exData, from: e.target.value})}>
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                   </div>
                   <div className="space-y-1 text-right">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">به ارز</label>
                      <select className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] font-bold outline-none" value={exData.to} onChange={e => setExData({...exData, to: e.target.value})}>
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                   </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                   <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">مبلغ ارز مبدأ</label>
                      <input type="number" className="w-full p-2.5 bg-white border border-slate-200 rounded font-bold text-sm outline-none text-center" placeholder="0.00" value={exData.amount || ''} onChange={e => setExData({...exData, amount: Number(e.target.value)})} />
                   </div>
                   
                   <div className="flex items-center gap-4 justify-center">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <div className="flex bg-white border border-slate-200 p-1 rounded-lg">
                        <button onClick={() => setExData({...exData, operator: 'multiply'})} className={`px-4 py-1.5 rounded font-black text-sm transition-all ${exData.operator === 'multiply' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>×</button>
                        <button onClick={() => setExData({...exData, operator: 'divide'})} className={`px-4 py-1.5 rounded font-black text-sm transition-all ${exData.operator === 'divide' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>÷</button>
                      </div>
                      <div className="h-px bg-slate-200 flex-1"></div>
                   </div>

                   <div className="flex flex-col gap-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">نرخ تبدیل</label>
                      <input type="number" step="0.0001" className="w-full p-2.5 bg-white border border-slate-200 rounded font-bold text-sm outline-none text-center text-indigo-600" placeholder="نرخ..." value={exData.rate || ''} onChange={e => setExData({...exData, rate: Number(e.target.value)})} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl text-center">
                      <label className="text-[9px] font-bold text-indigo-400 uppercase block mb-1">خروجی محاسبه شده</label>
                      <div className="flex items-center justify-center gap-2">
                         <span className="text-xl font-black text-indigo-900 tabular-nums">{calculatedConvertedAmount.toLocaleString()}</span>
                         <span className="text-[10px] font-bold text-indigo-500 uppercase">{exData.to}</span>
                      </div>
                   </div>
                   <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center">
                      <label className="text-[9px] font-bold text-emerald-600 uppercase block mb-1">مفاد از تبادله (سود)</label>
                      <div className="flex items-center justify-center gap-2">
                         <input type="number" className="w-full bg-transparent text-center text-xl font-black text-emerald-900 outline-none placeholder:text-emerald-200" placeholder="0" value={exData.profit || ''} onChange={e => setExData({...exData, profit: Number(e.target.value)})} />
                         <span className="text-[10px] font-bold text-emerald-500 uppercase">AFN</span>
                      </div>
                   </div>
                </div>

                <button onClick={handleManualConversionRecord} className="w-full bg-slate-900 text-white py-3.5 rounded-lg font-bold text-xs uppercase shadow-sm hover:bg-black transition-all">ثبت نهایی سند تبدیل</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
