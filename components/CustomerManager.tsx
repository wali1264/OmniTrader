
import React, { useState, useMemo } from 'react';
import { 
  Search, UserPlus, Users, FileText, Repeat, X, Calculator, 
  ChevronRight, Info, Plus, Minus, Hash, Percent, DollarSign, 
  Coins, CreditCard, Wallet, ArrowDownLeft, ArrowUpRight, CheckCircle2,
  AlertCircle, ArrowRight, Zap, InfoIcon
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
  const [showTransModal, setShowTransModal] = useState<{show: boolean, type: TransactionType}>({ show: false, type: TransactionType.RESID });
  const [showExchangeModal, setShowExchangeModal] = useState(false);

  // --- Exchange State with Profit/Fee Support ---
  const [exchangeData, setExchangeData] = useState({
    fromCurrency: 'USD',
    toCurrency: 'AFN',
    amount: 0,
    rate: 1,
    fee: 0,
    feeType: 'fixed' as 'fixed' | 'percent',
    description: ''
  });

  const [newTrans, setNewTrans] = useState({ amount: 0, currency: 'AFN', description: '' });
  const [newCustomer, setNewCustomer] = useState({ name: '', code: '' });

  // Calculations for display
  const exchangeCalculations = useMemo(() => {
    const rawTotal = exchangeData.amount * exchangeData.rate;
    const calculatedFee = exchangeData.feeType === 'fixed' 
      ? exchangeData.fee 
      : (rawTotal * (exchangeData.fee / 100));
    const netAmount = rawTotal - calculatedFee;
    
    return { rawTotal, calculatedFee, netAmount };
  }, [exchangeData]);

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

  const handleExchangeSubmit = () => {
    if (!selectedCustomer || exchangeData.amount <= 0 || exchangeData.rate <= 0) return;

    const timestamp = Date.now();
    const batchId = 'EXCH-' + Math.random().toString(36).substr(2, 5).toUpperCase();
    const { netAmount, calculatedFee } = exchangeCalculations;

    const exchangeTransactions: Transaction[] = [
      {
        id: `${batchId}-OUT`,
        customerId: selectedCustomer.id,
        type: TransactionType.EXCHANGE,
        amount: exchangeData.amount,
        currency: exchangeData.fromCurrency,
        description: exchangeData.description || `تبادله: کسر ${exchangeData.amount} ${exchangeData.fromCurrency} برای تبدیل به ${exchangeData.toCurrency}`,
        timestamp,
        status: TransactionStatus.PENDING,
        isBank: false
      },
      {
        id: `${batchId}-IN`,
        customerId: selectedCustomer.id,
        type: TransactionType.EXCHANGE,
        amount: exchangeData.amount,
        currency: exchangeData.fromCurrency,
        targetCurrency: exchangeData.toCurrency,
        exchangeRate: exchangeData.rate,
        convertedAmount: netAmount,
        profit: calculatedFee, // Saving the fee as profit
        description: exchangeData.description || `تبادله: واریز ${netAmount} ${exchangeData.toCurrency} (نرخ: ${exchangeData.rate} | فی: ${calculatedFee})`,
        timestamp,
        status: TransactionStatus.PENDING,
        isBank: false
      }
    ];

    setTransactions(prev => [...prev, ...exchangeTransactions]);
    setShowExchangeModal(false);
    setExchangeData({ fromCurrency: 'USD', toCurrency: 'AFN', amount: 0, rate: 1, fee: 0, feeType: 'fixed', description: '' });
    alert("تراکنش تبادله با موفقیت ثبت شد.");
  };

  const filteredCustomers = useMemo(() => customers.filter(c => c.name.includes(searchTerm) || c.code.includes(searchTerm)), [customers, searchTerm]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      <div className="lg:col-span-3">
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 p-6 sticky top-24">
          <div className="flex justify-between items-center mb-6 text-right">
            <h3 className="font-black text-slate-800 flex items-center gap-2">مشتریان <Users size={20} className="text-blue-600" /></h3>
            <button onClick={() => setShowAddModal(true)} className="p-2.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg"><UserPlus size={20} /></button>
          </div>
          <div className="relative mb-6 text-right">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="جستجو نام یا کد..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pr-12 pl-4 text-sm font-bold outline-none focus:bg-white transition-all text-right" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-2 max-h-[calc(100vh-340px)] overflow-y-auto custom-scrollbar">
            {filteredCustomers.map(c => (
              <button key={c.id} onClick={() => setSelectedCustomer(c)} className={`w-full p-5 rounded-2xl text-right transition-all group ${selectedCustomer?.id === c.id ? 'bg-slate-950 text-white shadow-xl' : 'bg-white border border-slate-50 hover:bg-slate-50'}`}>
                <div className="flex justify-between items-start">
                   <p className="font-black text-sm">{c.name}</p>
                   <span className="text-[9px] opacity-60 font-mono">{c.code}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-9">
        {!selectedCustomer ? (
          <div className="h-full min-h-[500px] bg-white rounded-[3rem] border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-slate-300">
            <Users size={64} className="mb-4 opacity-20" />
            <p className="font-black text-xl text-center">یک مشتری از لیست سمت راست<br/>انتخاب کنید.</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-100">{selectedCustomer.name.charAt(0)}</div>
                  <div className="text-right">
                    <h2 className="text-2xl font-black text-slate-900">{selectedCustomer.name}</h2>
                    <p className="text-xs font-black text-slate-400">شناسه دفتر: {selectedCustomer.code}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowTransModal({ show: true, type: TransactionType.RESID })} className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-emerald-700 shadow-lg">رسید نقد</button>
                  <button onClick={() => setShowTransModal({ show: true, type: TransactionType.BOARD })} className="bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-rose-700 shadow-lg">بورد نقد</button>
                  <button onClick={() => setShowExchangeModal(true)} className="bg-slate-950 text-white px-6 py-4 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg hover:bg-black transition-all active:scale-95"><Repeat size={18} /> تبادله ارز</button>
                </div>
              </div>
              <div className="mt-12 pt-10 border-t border-slate-50 grid grid-cols-2 lg:grid-cols-5 gap-4">
                {SUPPORTED_CURRENCIES.map(curr => (
                  <div key={curr.code} className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:bg-white transition-all group text-right">
                    <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest flex items-center justify-end gap-1">
                      {curr.label}
                    </p>
                    <p className={`text-xl font-black ${(customerBalances[curr.code] || 0) < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {(customerBalances[curr.code] || 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[3rem] border border-slate-100">
               <h3 className="text-xl font-black mb-8 px-4 flex items-center justify-end gap-3"><FileText className="text-slate-400" /> تراکنش‌های اخیر مشتری</h3>
               <div className="overflow-x-auto">
                 <table className="w-full text-right text-sm">
                    <thead className="text-slate-400 border-b border-slate-50 font-black">
                      <tr><th className="pb-6 px-6">تاریخ</th><th className="pb-6 px-6">نوع</th><th className="pb-6 px-6">مبلغ</th><th className="pb-6 px-6">شرح</th><th className="pb-6 px-6">وضعیت</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {transactions.filter(t => t.customerId === selectedCustomer.id).sort((a,b) => b.timestamp - a.timestamp).slice(0, 10).map(t => (
                        <tr key={t.id} className="hover:bg-slate-50/50 transition-colors text-right">
                          <td className="py-6 px-6 text-xs text-slate-400 font-bold">{new Date(t.timestamp).toLocaleDateString('fa-IR')}</td>
                          <td className="py-6 px-6 font-black text-xs">{t.type}</td>
                          <td className="py-6 px-6 font-black">
                            {t.amount.toLocaleString()} 
                            <span className="text-[10px] opacity-40 mr-1 uppercase">{t.currency}</span>
                          </td>
                          <td className="py-6 px-6 text-slate-500 text-xs truncate max-w-[250px]">{t.description}</td>
                          <td className="py-6 px-6 text-center">
                             <span className={`text-[9px] font-black px-3 py-1.5 rounded-xl ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : t.status === TransactionStatus.PENDING ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                               {t.status === TransactionStatus.APPROVED ? 'تائید شده' : t.status === TransactionStatus.PENDING ? 'انتظار' : 'رد شده'}
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

      {/* مودال تبادله با سیستم فی و سود صراف */}
      {showExchangeModal && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-right">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-xl shadow-2xl animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">تبادله ارز و تعیین سود</h3>
                <button onClick={() => setShowExchangeModal(false)} className="p-3 bg-slate-50 rounded-full hover:bg-rose-50 transition-all"><X size={20}/></button>
             </div>
             
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">ارز مبدأ (برداشت)</label>
                      <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none" 
                        value={exchangeData.fromCurrency} 
                        onChange={e => setExchangeData({...exchangeData, fromCurrency: e.target.value})}>
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">ارز مقصد (واریز)</label>
                      <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none" 
                        value={exchangeData.toCurrency} 
                        onChange={e => setExchangeData({...exchangeData, toCurrency: e.target.value})}>
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">مبلغ مبدأ</label>
                      <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none text-right" placeholder="0" 
                        value={exchangeData.amount || ''} 
                        onChange={e => setExchangeData({...exchangeData, amount: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">نرخ تبادله</label>
                      <input type="number" step="0.0001" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none text-right" placeholder="1.00" 
                        value={exchangeData.rate || ''} 
                        onChange={e => setExchangeData({...exchangeData, rate: Number(e.target.value)})} />
                   </div>
                </div>

                {/* بخش سود و فی صراف */}
                <div className="bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">تعیین فی / سود صرافی</span>
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-100">
                       <button onClick={() => setExchangeData({...exchangeData, feeType: 'fixed'})} className={`px-4 py-1 rounded-lg text-[9px] font-black transition-all ${exchangeData.feeType === 'fixed' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>مبلغ ثابت</button>
                       <button onClick={() => setExchangeData({...exchangeData, feeType: 'percent'})} className={`px-4 py-1 rounded-lg text-[9px] font-black transition-all ${exchangeData.feeType === 'percent' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>درصدی (%)</button>
                    </div>
                  </div>
                  <div className="relative">
                    <input 
                      type="number" 
                      className="w-full p-4 bg-white border border-slate-200 rounded-xl font-black outline-none text-right" 
                      placeholder={exchangeData.feeType === 'fixed' ? "مبلغ فی به ارز مقصد" : "درصد فی (مثلاً 0.5)"}
                      value={exchangeData.fee || ''}
                      onChange={e => setExchangeData({...exchangeData, fee: Number(e.target.value)})}
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">
                       {exchangeData.feeType === 'fixed' ? exchangeData.toCurrency : <Percent size={14}/>}
                    </div>
                  </div>
                </div>

                {/* ماشین حساب نهایی */}
                {exchangeData.amount > 0 && exchangeData.rate > 0 && (
                  <div className="p-6 bg-slate-950 text-white rounded-[2.5rem] shadow-xl space-y-4">
                    <div className="flex justify-between items-center opacity-60">
                      <span className="text-xs font-bold">مجموع ناخالص:</span>
                      <span className="font-mono">{exchangeCalculations.rawTotal.toLocaleString()} {exchangeData.toCurrency}</span>
                    </div>
                    <div className="flex justify-between items-center text-rose-400">
                      <span className="text-xs font-bold">سود صراف (کسر فی):</span>
                      <span className="font-mono italic">-{exchangeCalculations.calculatedFee.toLocaleString()} {exchangeData.toCurrency}</span>
                    </div>
                    <div className="pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-sm font-black">خالص دریافتی مشتری:</span>
                      <span className="text-2xl font-black text-emerald-400">{exchangeCalculations.netAmount.toLocaleString()} {exchangeData.toCurrency}</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">شرح تراکنش (اختیاری)</label>
                   <input type="text" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-right" placeholder="توضیحات را اینجا بنویسید..." 
                    value={exchangeData.description} 
                    onChange={e => setExchangeData({...exchangeData, description: e.target.value})} />
                </div>

                <button 
                  onClick={handleExchangeSubmit} 
                  disabled={exchangeData.amount <= 0 || exchangeData.rate <= 0}
                  className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3">
                  تائید و ثبت تبادله <ArrowRight size={24} />
                </button>
             </div>
          </div>
        </div>
      )}

      {/* مودال‌های پایه واریز و برداشت نقد */}
      {showTransModal.show && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-right">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in duration-200">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900">ثبت سند نقد ({showTransModal.type})</h3>
                <button onClick={() => setShowTransModal({show:false, type:TransactionType.RESID})} className="p-3 bg-slate-50 rounded-full hover:bg-rose-50 transition-all"><X size={20}/></button>
             </div>
             <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">مبلغ</label>
                      <input type="number" className="w-full p-5 bg-slate-50 rounded-2xl text-lg font-black border border-slate-100 outline-none focus:bg-white text-right" placeholder="0" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} />
                   </div>
                   <div className="space-y-2 text-right">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">واحد پول</label>
                      <select className="w-full p-5 bg-slate-50 rounded-2xl font-black border border-slate-100 outline-none cursor-pointer text-right" value={newTrans.currency} onChange={e => setNewTrans({...newTrans, currency: e.target.value})}>
                         {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                      </select>
                   </div>
                </div>
                <div className="space-y-2 text-right">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">توضیحات</label>
                   <textarea className="w-full p-5 bg-slate-50 rounded-2xl text-sm font-bold min-h-[120px] border border-slate-100 outline-none focus:bg-white text-right" placeholder="جزئیات را اینجا وارد کنید..." value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                </div>
                <button onClick={() => {
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
                }} className={`w-full py-6 rounded-2xl font-black text-white text-xl shadow-xl transition-all active:scale-95 ${showTransModal.type === TransactionType.RESID ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700' : 'bg-rose-600 shadow-rose-100 hover:bg-rose-700'}`}>ثبت سند نقد</button>
             </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-right">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black mb-8 text-slate-900 text-right">افتتاح دفتر حساب جدید</h3>
            <div className="space-y-6 text-right">
              <div className="space-y-2 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 text-right">نام مشتری</label>
                <input type="text" className="w-full p-5 bg-slate-50 rounded-2xl font-bold border border-slate-100 outline-none focus:bg-white text-right" placeholder="مثلاً: احمد محمدی" value={newCustomer.name} onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
              </div>
              <div className="space-y-2 text-right">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 text-right">کد شناسایی</label>
                <input type="text" className="w-full p-5 bg-slate-50 rounded-2xl font-black border border-slate-100 outline-none focus:bg-white text-right" placeholder="1001" value={newCustomer.code} onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})} />
              </div>
              <button onClick={() => {
                if(!newCustomer.name) return;
                const customer: Customer = { id: Math.random().toString(36).substr(2, 9), code: newCustomer.code || (customers.length + 101).toString(), name: newCustomer.name, phones: [], status: 'active', notes: '', balances: {} };
                setCustomers(prev => [...prev, customer]);
                setShowAddModal(false);
                setNewCustomer({name: '', code: ''});
              }} className="w-full bg-blue-600 text-white py-6 rounded-2xl font-black text-lg shadow-xl hover:bg-blue-700 transition-all active:scale-95">ثبت و ایجاد دفتر</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
