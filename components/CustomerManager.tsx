import React, { useState, useMemo } from 'react';
import { 
  Search, Users, FileText, X, 
  Plus, ArrowRightLeft,
  TrendingUp, TrendingDown, AlertCircle, Hash, Lock, Unlock, Calculator, RefreshCw, Landmark, Wallet
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

export default function CustomerManager({ 
  customers, 
  setCustomers, 
  transactions, 
  setTransactions, 
  globalRates, 
  setGlobalRates 
}: CustomerManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transModalState, setTransModalState] = useState<{show: boolean, type: TransactionType}>({ show: false, type: TransactionType.RESID });
  
  const [newTrans, setNewTrans] = useState({ 
    amount: 0, 
    currency: 'AFN', 
    description: '',
    targetCurrency: 'USD',
    exchangeRate: 0,
    exchangeOp: 'multiply' as 'multiply' | 'divide',
    netProfit: 0
  });
  
  const [newCustomer, setNewCustomer] = useState({ name: '', code: '', phone: '' });

  const getCustomerAccounting = (customer: Customer) => {
    const data: Record<string, { debit: number, credit: number, balance: number }> = {};
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED && t.customerId === customer.id);
    
    SUPPORTED_CURRENCIES.forEach(curr => {
      const initialVal = customer.balances[curr.code] || 0;
      
      const debit = (initialVal > 0 ? initialVal : 0) + 
                    approved.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0) +
                    approved.filter(t => t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
      
      const credit = (initialVal < 0 ? Math.abs(initialVal) : 0) +
                     approved.filter(t => t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0) +
                     approved.filter(t => t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
      
      data[curr.code] = {
        debit,
        credit,
        balance: debit - credit
      };
    });
    return data;
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.includes(searchTerm) || c.code.includes(searchTerm));
  }, [customers, searchTerm]);

  const accounting = useMemo(() => {
    if (!selectedCustomer) return {};
    return getCustomerAccounting(selectedCustomer);
  }, [selectedCustomer, transactions]);

  const toggleLockCustomer = () => {
    if (!selectedCustomer) return;
    const isCurrentlyLocked = !!selectedCustomer.isLocked;
    const action = isCurrentlyLocked ? 'بازگشایی' : 'قید کردن (تصفیه)';
    if (confirm(`آیا از ${action} حساب ${selectedCustomer.name} مطمئن هستید؟`)) {
      setCustomers(prev => prev.map(c => c.id === selectedCustomer.id ? { ...c, isLocked: !isCurrentlyLocked } : c));
      setSelectedCustomer({ ...selectedCustomer, isLocked: !isCurrentlyLocked });
    }
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
      balances: SUPPORTED_CURRENCIES.reduce((acc, curr) => ({ ...acc, [curr.code]: 0 }), {}),
      isLocked: false
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
    if (selectedCustomer.isLocked) {
      alert("⚠️ این حساب قید شده است.");
      return;
    }

    const transaction: Transaction = {
      id: 'TR-' + Math.random().toString(36).substr(2, 7).toUpperCase(),
      customerId: selectedCustomer.id,
      type: transModalState.type,
      amount: Number(newTrans.amount),
      currency: newTrans.currency,
      description: newTrans.description || `${transModalState.type} نقد`,
      timestamp: getSystemNow(),
      status: TransactionStatus.PENDING,
      isBank: false
    };

    if (transModalState.type === TransactionType.EXCHANGE) {
      if (newTrans.exchangeRate <= 0) {
        alert("لطفاً نرخ تبادله را وارد کنید.");
        return;
      }
      transaction.targetCurrency = newTrans.targetCurrency;
      transaction.exchangeRate = newTrans.exchangeRate;
      transaction.convertedAmount = newTrans.exchangeOp === 'multiply' 
        ? newTrans.amount * newTrans.exchangeRate 
        : newTrans.amount / newTrans.exchangeRate;
      transaction.netProfit = newTrans.netProfit;
    }

    setTransactions(prev => [...prev, transaction]);
    setTransModalState({ show: false, type: TransactionType.RESID });
    setNewTrans({ amount: 0, currency: 'AFN', description: '', targetCurrency: 'USD', exchangeRate: 0, exchangeOp: 'multiply', netProfit: 0 });
  };

  const previewConverted = useMemo(() => {
    if (newTrans.amount <= 0 || newTrans.exchangeRate <= 0) return 0;
    return newTrans.exchangeOp === 'multiply' 
      ? newTrans.amount * newTrans.exchangeRate 
      : newTrans.amount / newTrans.exchangeRate;
  }, [newTrans.amount, newTrans.exchangeRate, newTrans.exchangeOp]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full text-right font-['Vazirmatn'] pb-10">
      {/* Sidebar */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-widest">لیست حسابات</h3>
            <button onClick={() => setShowAddModal(true)} className="p-2 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-black transition-all"><Plus size={16} /></button>
          </div>
          <div className="relative mb-4">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="جستجو..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-3 text-[11px] font-bold outline-none focus:bg-white transition-all text-right" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
            {filteredCustomers.map(c => (
              <button 
                key={c.id} 
                onClick={() => setSelectedCustomer(c)} 
                className={`w-full p-4 rounded-2xl text-right transition-all border ${selectedCustomer?.id === c.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-transparent hover:bg-slate-50'}`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {c.isLocked && <Lock size={12} className={selectedCustomer?.id === c.id ? 'text-white' : 'text-rose-600'} />}
                    <p className="font-black text-[12px]">{c.name}</p>
                  </div>
                  <p className={`text-[10px] font-mono ${selectedCustomer?.id === c.id ? 'text-blue-100' : 'text-slate-400'}`}>{c.code}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-9">
        {!selectedCustomer ? (
          <div className="h-full min-h-[500px] bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-slate-300">
            <Users size={64} className="mb-6 opacity-10" />
            <p className="font-black text-sm uppercase tracking-widest">یک مشتری را انتخاب کنید</p>
          </div>
        ) : (
          <div className="space-y-6 fade-entry">
            {/* Customer Header */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6 text-right">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-black border border-blue-100 shadow-inner">{selectedCustomer.name.charAt(0)}</div>
                  {selectedCustomer.isLocked && <div className="absolute -top-2 -right-2 bg-rose-600 text-white p-2 rounded-full shadow-lg border-4 border-white animate-bounce"><Lock size={14} /></div>}
                </div>
                <div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-slate-900">{selectedCustomer.name}</h2>
                    <button 
                      onClick={toggleLockCustomer}
                      className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black border shadow-sm ${selectedCustomer.isLocked ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100 hover:bg-rose-50 hover:text-rose-600'}`}
                    >
                      {selectedCustomer.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                      {selectedCustomer.isLocked ? 'حساب قید شده' : 'قید بیلانس'}
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 mt-1 font-bold uppercase tracking-widest">Account ID: {selectedCustomer.code}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  disabled={selectedCustomer.isLocked}
                  onClick={() => setTransModalState({show: true, type: TransactionType.RESID})} 
                  className={`px-5 py-4 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-lg ${selectedCustomer.isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50' : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'}`}
                >
                  <TrendingUp size={16} /> رسید
                </button>
                <button 
                  disabled={selectedCustomer.isLocked}
                  onClick={() => setTransModalState({show: true, type: TransactionType.BOARD})} 
                  className={`px-5 py-4 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-lg ${selectedCustomer.isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50' : 'bg-rose-600 text-white hover:bg-rose-700 active:scale-95'}`}
                >
                  <TrendingDown size={16} /> بورد
                </button>
                <button 
                  disabled={selectedCustomer.isLocked}
                  onClick={() => setTransModalState({show: true, type: TransactionType.EXCHANGE})} 
                  className={`px-5 py-4 rounded-2xl font-black text-xs flex items-center gap-2 transition-all shadow-lg ${selectedCustomer.isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}
                >
                  <ArrowRightLeft size={16} /> تبادله
                </button>
              </div>
            </div>

            {/* Balances Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SUPPORTED_CURRENCIES.map(curr => {
                const info = accounting[curr.code] || { debit: 0, credit: 0, balance: 0 };
                const isCustomerDebtor = info.balance > 0;
                const isShopDebtor = info.balance < 0;

                return (
                  <div key={curr.code} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col group hover:shadow-md transition-all">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{curr.label}</span>
                       <span className="text-[8px] font-black px-2 py-0.5 rounded bg-blue-100 text-blue-600 uppercase font-mono">{curr.code}</span>
                    </div>
                    <div className="p-6 space-y-4 text-right">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">بدهکار (Debit):</span>
                          <span className="text-xs font-black text-rose-600 tabular-nums">{info.debit.toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-slate-400">بستانکار (Credit):</span>
                          <span className="text-xs font-black text-emerald-600 tabular-nums">{info.credit.toLocaleString()}</span>
                       </div>
                       <div className="pt-4 border-t border-slate-50 flex justify-between items-baseline">
                          <span className="text-[11px] font-black text-slate-900">بیلانس:</span>
                          <div className="text-left">
                            <p className={`text-2xl font-black tabular-nums ${isCustomerDebtor ? 'text-rose-700' : isShopDebtor ? 'text-emerald-700' : 'text-slate-300'}`}>
                              {Math.abs(info.balance).toLocaleString()}
                            </p>
                            <span className={`text-[9px] font-black uppercase ${isCustomerDebtor ? 'text-rose-400' : isShopDebtor ? 'text-emerald-400' : 'text-slate-300'}`}>
                               {isCustomerDebtor ? '(مشتری بدهکار)' : isShopDebtor ? '(صراف بدهکار)' : 'تصفیه'}
                            </span>
                          </div>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* History Ledger */}
            <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <FileText size={18} className="text-blue-500" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">روزنامچه اختصاصی مشتری</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-[12px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-slate-500 border-b border-slate-100 uppercase">
                      <th className="p-5 font-black">تاریخ</th>
                      <th className="p-5 font-black text-center">بدهکار (-)</th>
                      <th className="p-5 font-black text-center">بستانکار (+)</th>
                      <th className="p-5 font-black">شرح معامله (توضیحات نقدینگی)</th>
                      <th className="p-5 font-black text-center">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {transactions
                      .filter(t => t.customerId === selectedCustomer.id)
                      .sort((a,b) => b.timestamp - a.timestamp)
                      .slice(0, 30)
                      .map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5 text-slate-400 tabular-nums">
                            {new Date(t.timestamp).toLocaleDateString('fa-IR')} 
                          </td>
                          <td className="p-5 text-center font-black text-rose-600 tabular-nums">
                            {t.type === TransactionType.BOARD ? `${t.amount.toLocaleString()} ${t.currency}` : t.type === TransactionType.EXCHANGE ? `${t.amount.toLocaleString()} ${t.currency}` : '---'}
                          </td>
                          <td className="p-5 text-center font-black text-emerald-600 tabular-nums">
                            {t.type === TransactionType.RESID ? `${t.amount.toLocaleString()} ${t.currency}` : t.type === TransactionType.EXCHANGE ? `${(t.convertedAmount || 0).toLocaleString()} ${t.targetCurrency}` : '---'}
                          </td>
                          <td className="p-5 text-right">
                            <div className="flex flex-col gap-1">
                              <span className="text-slate-800 font-bold">{t.description || 'بدون شرح'}</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${t.isBank ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                  {t.isBank ? <Landmark size={8} className="inline mr-1"/> : <Wallet size={8} className="inline mr-1"/>}
                                  {t.isBank ? 'بانکی' : 'نقدینگی'}
                                </span>
                                {t.exchangeRate && (
                                  <span className="text-[8px] font-black text-blue-400 border border-blue-50 px-1.5 py-0.5 rounded">
                                    نرخ: {t.exchangeRate}
                                  </span>
                                )}
                                {t.trackingId && (
                                  <span className="text-[8px] font-mono text-slate-400">Ref: {t.trackingId}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-5 text-center">
                            <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {t.status === TransactionStatus.APPROVED ? 'تائید' : 'انتظار'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Transaction Modal */}
      {transModalState.show && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-300 text-right">
            <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
              {transModalState.type === TransactionType.RESID ? <TrendingUp className="text-emerald-600" /> : transModalState.type === TransactionType.BOARD ? <TrendingDown className="text-rose-600" /> : <ArrowRightLeft className="text-blue-600" />}
              {transModalState.type === TransactionType.RESID ? 'ثبت رسید' : transModalState.type === TransactionType.BOARD ? 'ثبت بورد' : 'ثبت تبادله ارزی'}
            </h3>
            <div className="space-y-6 font-['Vazirmatn']">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">مبلغ {transModalState.type === TransactionType.EXCHANGE ? '(ارز مبدأ)' : ''}</label>
                <div className="flex gap-2">
                  <input type="number" className="flex-1 p-5 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black outline-none focus:bg-white transition-all text-right" placeholder="0" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} />
                  <select className="w-28 px-2 py-4 bg-slate-100 rounded-2xl font-black text-[11px] outline-none cursor-pointer" value={newTrans.currency} onChange={e => setNewTrans({...newTrans, currency: e.target.value})}>
                    {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {transModalState.type === TransactionType.EXCHANGE && (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">به ارز (ارز مقصد)</label>
                    <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none" value={newTrans.targetCurrency} onChange={e => setNewTrans({...newTrans, targetCurrency: e.target.value})}>
                      {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest">نرخ تبادله</label>
                      <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button type="button" onClick={() => setNewTrans({...newTrans, exchangeOp: 'multiply'})} className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all ${newTrans.exchangeOp === 'multiply' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}>×</button>
                        <button type="button" onClick={() => setNewTrans({...newTrans, exchangeOp: 'divide'})} className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all ${newTrans.exchangeOp === 'divide' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400'}`}>÷</button>
                      </div>
                    </div>
                    <input type="number" step="0.0001" className="w-full p-5 bg-blue-50 border border-blue-100 rounded-2xl font-black text-xl text-center outline-none" value={newTrans.exchangeRate || ''} onChange={e => setNewTrans({...newTrans, exchangeRate: Number(e.target.value)})} placeholder="0.00" />
                  </div>
                  
                  <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">حاصل محاسبه زنده:</p>
                    <p className="text-xl font-black text-slate-700 tabular-nums">
                      {previewConverted.toLocaleString()} <span className="text-[10px] font-bold text-blue-600 uppercase">{newTrans.targetCurrency}</span>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">مفاد معامله (AFN)</label>
                    <input type="number" className="w-full p-5 bg-emerald-50 border border-emerald-100 rounded-2xl font-black text-lg text-center outline-none" value={newTrans.netProfit || ''} onChange={e => setNewTrans({...newTrans, netProfit: Number(e.target.value)})} placeholder="0" />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">توضیحات</label>
                <textarea className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-xs min-h-[100px] outline-none focus:bg-white text-right" placeholder="شرح..." value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={handleAddTransaction} className={`flex-1 py-5 rounded-2xl font-black text-lg text-white shadow-xl transition-all ${transModalState.type === TransactionType.RESID ? 'bg-emerald-600' : transModalState.type === TransactionType.BOARD ? 'bg-rose-600' : 'bg-blue-600'}`}>ثبت تراکنش</button>
                <button onClick={() => setTransModalState({show: false, type: TransactionType.RESID})} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm">لغو</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black mb-8 flex items-center gap-3 text-slate-900"><Users className="text-blue-600" /> ایجاد حساب مشتری</h3>
            <div className="space-y-6 text-right font-['Vazirmatn']">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">نام کامل</label>
                <input type="text" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black text-sm outline-none focus:bg-white text-right" placeholder="نام مشتری" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">کد شناسایی</label>
                <input type="text" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black font-mono text-sm outline-none focus:bg-white text-right" placeholder="C-100" value={newCustomer.code} onChange={e => setNewCustomer({...newCustomer, code: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={handleSaveNewCustomer} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all">ایجاد حساب</button>
                <button onClick={() => setShowAddModal(false)} className="px-8 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm">لغو</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
