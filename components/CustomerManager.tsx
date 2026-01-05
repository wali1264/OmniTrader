
import React, { useState, useMemo } from 'react';
import { 
  Search, Users, FileText, X, 
  Check, Plus, ArrowRightLeft,
  TrendingUp, TrendingDown, ChevronLeft, Calculator, AlertCircle, CreditCard, Hash
} from 'lucide-react';
import { Customer, Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, GlobalRate } from '../types';

interface CustomerManagerProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  globalRates: GlobalRate[];
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, setCustomers, transactions, setTransactions, globalRates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transModalState, setTransModalState] = useState<{show: boolean, type: TransactionType}>({ show: false, type: TransactionType.RESID });
  
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [exData, setExData] = useState<{from: string, to: string, amount: number, rate: number, op: 'multiply' | 'divide', profit: number}>({ 
    from: 'USD', 
    to: 'AFN', 
    amount: 0, 
    rate: 0,
    op: 'multiply',
    profit: 0
  });

  const [newTrans, setNewTrans] = useState({ amount: 0, currency: 'AFN', description: '' });
  const [newCustomer, setNewCustomer] = useState({ name: '', code: '', phone: '' });

  const getBalanceStatus = (value: number) => {
    if (value > 0) return { label: 'موجودی مشتری', color: 'text-emerald-600', bgColor: 'bg-emerald-50', icon: <TrendingUp size={24} /> };
    if (value < 0) return { label: 'بدهکاری مشتری', color: 'text-rose-600', bgColor: 'bg-rose-50', icon: <TrendingDown size={24} /> };
    return { label: 'تصفیه کامل', color: 'text-slate-400', bgColor: 'bg-slate-50', icon: <Check size={24} /> };
  };

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

  const totalConvertedBalance = useMemo(() => {
    if (!selectedCustomer) return 0;
    return Object.entries(selectedBalances).reduce((acc: number, [curr, bal]) => {
      const balanceValue = bal as number;
      if (curr === 'AFN') return acc + balanceValue;
      const rate = globalRates.find(r => r.currencyCode === curr)?.rateToAfn || 0;
      return acc + (balanceValue * (rate || 1));
    }, 0);
  }, [selectedBalances, globalRates, selectedCustomer]);

  const overallStatus = getBalanceStatus(totalConvertedBalance);

  const handleAddTransaction = () => {
    if (!selectedCustomer || newTrans.amount <= 0) return;
    const transaction: Transaction = {
      id: 'TR-' + Math.random().toString(36).substr(2, 7).toUpperCase(),
      customerId: selectedCustomer.id,
      type: transModalState.type,
      amount: Number(newTrans.amount),
      currency: newTrans.currency,
      description: newTrans.description || (transModalState.type === TransactionType.RESID ? 'رسید نقد' : 'برد نقد'),
      timestamp: Date.now(),
      status: TransactionStatus.PENDING,
      isBank: false
    };
    setTransactions(prev => [...prev, transaction]);
    setTransModalState({ show: false, type: TransactionType.RESID });
    setNewTrans({ amount: 0, currency: 'AFN', description: '' });
  };

  const handleCustomerExchange = () => {
    if (!selectedCustomer || exData.amount <= 0 || exData.rate <= 0) return;
    
    const finalConverted = exData.op === 'multiply' 
      ? exData.amount * exData.rate 
      : exData.amount / exData.rate;

    const transaction: Transaction = {
      id: 'EX-' + Math.random().toString(36).substr(2, 7).toUpperCase(),
      customerId: selectedCustomer.id,
      type: TransactionType.EXCHANGE,
      amount: exData.amount,
      currency: exData.from,
      targetCurrency: exData.to,
      exchangeRate: exData.rate,
      convertedAmount: finalConverted,
      netProfit: Number(exData.profit),
      description: `تبادله ${exData.amount} ${exData.from} به ${exData.to} با نرخ ${exData.rate} (${exData.op === 'multiply' ? 'ضرب' : 'تقسیم'}) - سود: ${exData.profit}`,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING,
      isBank: false
    };
    setTransactions(prev => [...prev, transaction]);
    setShowExchangeModal(false);
    setExData({ from: 'USD', to: 'AFN', amount: 0, rate: 0, op: 'multiply', profit: 0 });
  };

  const previewConverted = useMemo(() => {
    if (exData.amount <= 0 || exData.rate <= 0) return 0;
    return exData.op === 'multiply' 
      ? exData.amount * exData.rate 
      : exData.amount / exData.rate;
  }, [exData.amount, exData.rate, exData.op]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
      <div className="lg:col-span-3">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-5 sticky top-20">
          <div className="flex justify-between items-center mb-5">
            <h3 className="font-black text-slate-800 text-sm">دفتر مشتریان</h3>
            <button onClick={() => setShowAddModal(true)} className="p-2 bg-blue-600 text-white rounded-xl shadow-lg hover:scale-105 transition-all"><Plus size={16} /></button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
            <input type="text" placeholder="جستجو مشتری..." className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pr-9 pl-3 text-xs font-bold outline-none focus:bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-1">
            {filteredCustomers.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSelectedCustomer(c)} 
                className={`w-full p-4 rounded-xl text-right transition-all border ${selectedCustomer?.id === c.id ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-[1.02]' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                <p className="font-black text-[12px]">{c.name}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[9px] font-mono opacity-40">{c.code}</p>
                  {c.phones && c.phones[0] && <p className="text-[8px] opacity-40 font-bold">{c.phones[0]}</p>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-9">
        {!selectedCustomer ? (
          <div className="h-full min-h-[500px] bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
            <Users size={32} className="mb-4 opacity-20" />
            <p className="font-black text-lg">یک حساب را انتخاب کنید</p>
          </div>
        ) : (
          <div className="space-y-6 fade-entry">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center text-2xl font-black shadow-xl">{selectedCustomer.name.charAt(0)}</div>
                <div className="text-right">
                  <h2 className="text-xl font-black text-slate-900">{selectedCustomer.name}</h2>
                  <div className="flex gap-3 mt-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedCustomer.code}</p>
                    {selectedCustomer.phones && selectedCustomer.phones[0] && (
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">TEL: {selectedCustomer.phones[0]}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowExchangeModal(true)} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black text-[10px] shadow-lg flex items-center gap-2 hover:bg-black transition-all">
                  <ArrowRightLeft size={14} /> تبادله ارز
                </button>
                <button onClick={() => setTransModalState({ show: true, type: TransactionType.RESID })} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-[10px] shadow-lg">ثبت رسید (+)</button>
                <button onClick={() => setTransModalState({ show: true, type: TransactionType.BOARD })} className="bg-rose-600 text-white px-5 py-3 rounded-xl font-black text-[10px] shadow-lg">ثبت برد (-)</button>
              </div>
            </div>

            <div className={`p-8 rounded-[2.5rem] border ${overallStatus.bgColor} border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 transition-all`}>
               <div className="flex items-center gap-5">
                  <div className={`p-4 rounded-2xl bg-white shadow-sm ${overallStatus.color}`}>
                     {overallStatus.icon}
                  </div>
                  <div className="text-right">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">وضعیت نهایی کل حساب (معادل AFN)</p>
                     <h3 className={`text-3xl font-black tabular-nums ${overallStatus.color}`}>
                        {Math.abs(totalConvertedBalance).toLocaleString()}
                        <span className="text-sm mr-2 opacity-60">AFN</span>
                     </h3>
                  </div>
               </div>
               <div className="text-center md:text-left">
                  <span className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest bg-white shadow-sm ${overallStatus.color}`}>
                    {overallStatus.label}
                  </span>
                  <p className="text-[9px] text-slate-400 mt-3 font-bold flex items-center gap-1 justify-center md:justify-start">
                    <AlertCircle size={10} /> محاسبه شده بر اساس نرخ روز ارزها
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {SUPPORTED_CURRENCIES.map(curr => {
                const val = selectedBalances[curr.code] || 0;
                return (
                  <div key={curr.code} className="p-6 rounded-[2rem] border bg-white border-slate-100 shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{curr.label}</span>
                    <p className={`text-xl font-black tabular-nums mt-1 ${val > 0 ? 'text-emerald-600' : val < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                      {val.toLocaleString()}
                    </p>
                    <p className="text-[8px] font-black opacity-30 mt-1 uppercase">{val > 0 ? 'موجودی' : val < 0 ? 'بدهکار' : 'تصفیه'}</p>
                  </div>
                );
              })}
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
               <h3 className="text-sm font-black text-slate-900 mb-8 flex items-center gap-2">صورت حساب تفصیلی <FileText size={16} className="text-blue-600" /></h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-xs">
                    <thead className="text-slate-400 border-b border-slate-50">
                      <tr>
                        <th className="pb-4 px-4 font-black">تاریخ و زمان</th>
                        <th className="pb-4 px-4 font-black">نوعیت</th>
                        <th className="pb-4 px-4 font-black text-center">مبلغ</th>
                        <th className="pb-4 px-4 font-black">شرح و جزئیات</th>
                        <th className="pb-4 px-4 font-black text-center">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {transactions.filter(t => t.customerId === selectedCustomer.id).sort((a,b) => b.timestamp - a.timestamp).map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-5 px-4 text-slate-400 font-medium">
                            <div className="text-[10px]">{new Date(t.timestamp).toLocaleDateString('fa-IR')}</div>
                            <div className="text-[8px] opacity-60 tabular-nums">{new Date(t.timestamp).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</div>
                          </td>
                          <td className={`py-5 px-4 font-black ${t.type === TransactionType.RESID ? 'text-emerald-600' : t.type === TransactionType.BOARD ? 'text-rose-600' : 'text-blue-600'}`}>{t.type}</td>
                          <td className="py-5 px-4 font-black text-center tabular-nums text-[13px]">{t.amount.toLocaleString()} <span className="text-[9px] opacity-40 uppercase">{t.currency}</span></td>
                          <td className="py-5 px-4 text-slate-500 font-medium max-w-[250px]">
                            <p className="truncate font-bold text-slate-700">{t.description}</p>
                            {(t.trackingId || t.cardLastFour) && (
                              <div className="flex gap-2 mt-1.5">
                                {t.trackingId && (
                                  <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-200">
                                    <Hash size={8} /> {t.trackingId}
                                  </span>
                                )}
                                {t.cardLastFour && (
                                  <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-100">
                                    <CreditCard size={8} /> **** {t.cardLastFour}
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-5 px-4 text-center">
                             <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{t.status === TransactionStatus.APPROVED ? 'تائید شده' : 'در انتظار'}</span>
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

      {transModalState.show && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in text-right">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-900">ثبت {transModalState.type} جدید</h3>
                <button onClick={() => setTransModalState({show:false, type:TransactionType.RESID})} className="p-2 hover:bg-slate-50 rounded-full transition-all"><X size={18}/></button>
             </div>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase mr-1">مبلغ</label>
                      <input type="number" className="w-full p-4 bg-slate-50 rounded-xl text-lg font-black border border-slate-100 outline-none text-right" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase mr-1">واحد پول</label>
                      <select className="w-full p-4 bg-slate-50 rounded-xl font-black text-sm border border-slate-100 outline-none text-right" value={newTrans.currency} onChange={e => setNewTrans({...newTrans, currency: e.target.value})}>
                         {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase mr-1">شرح تراکنش</label>
                   <textarea className="w-full p-4 bg-slate-50 rounded-xl text-xs font-bold border border-slate-100 outline-none text-right min-h-[100px]" placeholder="توضیحات..." value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                </div>
                <button onClick={handleAddTransaction} className={`w-full py-5 rounded-xl font-black text-white text-lg shadow-xl ${transModalState.type === TransactionType.RESID ? 'bg-emerald-600' : 'bg-rose-600'}`}>ثبت نهایی</button>
             </div>
          </div>
        </div>
      )}

      {showExchangeModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[1.5rem] p-5 w-full max-w-md shadow-2xl animate-in zoom-in text-right">
             <div className="flex justify-between items-center mb-3 border-b border-slate-50 pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><ArrowRightLeft size={16} /></div>
                  <h3 className="text-base font-black text-slate-900">پنل تبادله اختصاصی مشتری</h3>
                </div>
                <button onClick={() => setShowExchangeModal(false)} className="p-1.5 hover:bg-slate-50 rounded-full transition-all text-slate-400"><X size={16}/></button>
             </div>
             
             <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase mr-1">ارز مبدأ</label>
                    <select className="w-full p-2 bg-slate-50 rounded-lg font-black text-xs border border-slate-100 outline-none" value={exData.from} onChange={e => setExData({...exData, from: e.target.value})}>
                      {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase mr-1">ارز مقصد</label>
                    <select className="w-full p-2 bg-slate-50 rounded-lg font-black text-xs border border-slate-100 outline-none" value={exData.to} onChange={e => setExData({...exData, to: e.target.value})}>
                      {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase mr-1">مبلغ مبدأ</label>
                    <input type="number" className="w-full p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-sm font-black outline-none" value={exData.amount || ''} onChange={e => setExData({...exData, amount: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-blue-600 uppercase mr-1">نرخ تبادله</label>
                    <div className="flex gap-1.5">
                      <input type="number" className="flex-1 p-2.5 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg text-sm font-black outline-none" value={exData.rate || ''} onChange={e => setExData({...exData, rate: Number(e.target.value)})} />
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                         <button type="button" onClick={() => setExData({...exData, op: 'multiply'})} title="ضرب" className={`px-2 py-1 rounded-md font-black text-[10px] transition-all ${exData.op === 'multiply' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}>×</button>
                         <button type="button" onClick={() => setExData({...exData, op: 'divide'})} title="تقسیم" className={`px-2 py-1 rounded-md font-black text-[10px] transition-all ${exData.op === 'divide' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-200'}`}>÷</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                   <label className="text-[9px] font-black text-emerald-600 uppercase mr-1">سود حاصله از تبادله (AFN)</label>
                   <input type="number" className="w-full p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-sm font-black outline-none text-emerald-700" placeholder="0" value={exData.profit || ''} onChange={e => setExData({...exData, profit: Number(e.target.value)})} />
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5">مبلغ نهایی دریافتنی:</p>
                  <p className="text-lg font-black text-slate-900">{previewConverted.toLocaleString()} <span className="text-[10px] text-blue-600 uppercase">{exData.to}</span></p>
                  <p className="text-[7px] font-bold text-slate-400 mt-0.5 italic">({exData.op === 'multiply' ? 'ضرب در نرخ' : 'تقسیم بر نرخ'})</p>
                </div>

                <button onClick={handleCustomerExchange} className="w-full bg-slate-900 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all">
                  ثبت تبادله <Check size={16} />
                </button>
             </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in text-right">
            <h3 className="text-xl font-black mb-8 text-slate-900">ایجاد حساب مشتری جدید</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-1">نام کامل مشتری</label>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-xl font-bold border border-slate-100 outline-none text-right focus:bg-white" placeholder="نام مشتری" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-1">کد اختصاصی</label>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-xl font-black border border-slate-100 outline-none text-right focus:bg-white font-mono" placeholder="C-1001" value={newCustomer.code} onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase mr-1">شماره تماس</label>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-xl font-bold border border-slate-100 outline-none text-right focus:bg-white" placeholder="07xxxxxxxx" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => {
                  if(!newCustomer.name) return;
                  const customer: Customer = { 
                    id: 'C-' + Math.random().toString(36).substr(2, 5).toUpperCase(), 
                    code: newCustomer.code || (customers.length + 101).toString(), 
                    name: newCustomer.name, 
                    phones: newCustomer.phone ? [newCustomer.phone] : [], 
                    status: 'active', 
                    notes: '', 
                    balances: {} 
                  };
                  setCustomers(prev => [...prev, customer]);
                  setShowAddModal(false);
                  setNewCustomer({name: '', code: '', phone: ''});
                }} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg">ایجاد حساب</button>
                <button onClick={() => setShowAddModal(false)} className="px-8 bg-slate-100 text-slate-400 font-bold rounded-xl">لغو</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
