import React, { useState, useMemo } from 'react';
import { Customer, Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, GlobalRate } from '../types';

// Utility for icons from lucide-react
import { 
  Search as SearchIcon, 
  Plus as PlusIcon, 
  X as XIcon, 
  Users as UsersIcon, 
  ArrowRightLeft, 
  Calculator, 
  Percent,
  ChevronDown
} from 'lucide-react';

const getSystemNow = () => Date.now();

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
    currency: 'USD', 
    description: '',
    targetCurrency: 'AFN',
    exchangeRate: 0,
    exchangeOp: 'multiply' as 'multiply' | 'divide',
    netProfit: 0
  });
  
  const [newCustomer, setNewCustomer] = useState({ name: '', code: '', phone: '' });

  const exchangeCurrencies = useMemo(() => {
    return SUPPORTED_CURRENCIES.filter(c => c.code !== 'IRT_BANK');
  }, []);

  const calculatedExchangeResult = useMemo(() => {
    if (newTrans.amount <= 0 || newTrans.exchangeRate <= 0) return 0;
    return newTrans.exchangeOp === 'multiply' 
      ? newTrans.amount * newTrans.exchangeRate 
      : newTrans.amount / newTrans.exchangeRate;
  }, [newTrans.amount, newTrans.exchangeRate, newTrans.exchangeOp]);

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
      data[curr.code] = { debit, credit, balance: debit - credit };
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

  const handleSaveNewCustomer = () => {
    if (!newCustomer.name || !newCustomer.code) {
      alert("نام و کد مشتری الزامی است.");
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
    setNewCustomer({ name: '', code: '', phone: '' });
    setShowAddModal(false);
  };

  const handleAddTransaction = () => {
    if (!selectedCustomer || newTrans.amount <= 0) return;
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
      transaction.targetCurrency = newTrans.targetCurrency;
      transaction.exchangeRate = newTrans.exchangeRate;
      transaction.convertedAmount = calculatedExchangeResult;
      transaction.netProfit = newTrans.netProfit;
      transaction.description = newTrans.description || `تبادله ${newTrans.amount} ${newTrans.currency} به ${newTrans.targetCurrency} با نرخ ${newTrans.exchangeRate}`;
    }
    setTransactions(prev => [...prev, transaction]);
    setTransModalState({ show: false, type: TransactionType.RESID });
    setNewTrans({ ...newTrans, amount: 0, description: '', exchangeRate: 0, currency: 'USD', targetCurrency: 'AFN' });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full text-right font-['Vazirmatn'] pb-10">
      <div className="lg:col-span-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-black text-slate-800 text-[11px] uppercase tracking-widest">لیست حسابات</h3>
            <button onClick={() => setShowAddModal(true)} className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black transition-all">
              <PlusIcon size={16} />
            </button>
          </div>
          <div className="relative mb-4">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input type="text" placeholder="جستجو..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pr-10 pl-3 text-[11px] font-bold outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-1 max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
            {filteredCustomers.map(c => (
              <button key={c.id} onClick={() => setSelectedCustomer(c)} className={`w-full p-4 rounded-2xl text-right transition-all border ${selectedCustomer?.id === c.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                <div className="flex justify-between items-center">
                  <p className="font-black text-[12px]">{c.name}</p>
                  <p className={`text-[10px] font-mono ${selectedCustomer?.id === c.id ? 'text-blue-100' : 'text-slate-400'}`}>{c.code}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-9">
        {!selectedCustomer ? (
          <div className="h-full min-h-[500px] bg-white rounded-3xl border border-slate-200 flex flex-col items-center justify-center text-slate-300">
            <UsersIcon size={64} className="mb-6 opacity-10" />
            <p className="font-black text-sm uppercase tracking-widest">یک مشتری را انتخاب کنید</p>
          </div>
        ) : (
          <div className="space-y-6 fade-entry">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6 text-right">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl font-black">{selectedCustomer.name.charAt(0)}</div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900">{selectedCustomer.name}</h2>
                  <p className="text-[10px] font-mono text-slate-400 mt-1 uppercase">ID: {selectedCustomer.code}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setTransModalState({show: true, type: TransactionType.RESID})} className="px-5 py-4 rounded-2xl bg-emerald-600 text-white font-black text-xs">رسید</button>
                <button onClick={() => setTransModalState({show: true, type: TransactionType.BOARD})} className="px-5 py-4 rounded-2xl bg-rose-600 text-white font-black text-xs">بورد</button>
                <button onClick={() => setTransModalState({show: true, type: TransactionType.EXCHANGE})} className="px-5 py-4 rounded-2xl bg-blue-600 text-white font-black text-xs flex items-center gap-2">
                  <ArrowRightLeft size={14} /> تبادله
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SUPPORTED_CURRENCIES.map(curr => {
                const info = accounting[curr.code] || { debit: 0, credit: 0, balance: 0 };
                return (
                  <div key={curr.code} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase">{curr.label}</span>
                    <div className="mt-4 space-y-2">
                       <div className="flex justify-between text-[10px]"><span>بدهکار (بورد):</span><span className="text-rose-600 font-bold">{info.debit.toLocaleString()}</span></div>
                       <div className="flex justify-between text-[10px]"><span>بستانکار (رسید):</span><span className="text-emerald-600 font-bold">{info.credit.toLocaleString()}</span></div>
                       <div className={`pt-2 border-t text-lg font-black ${info.balance > 0 ? 'text-rose-600' : info.balance < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                         {Math.abs(info.balance).toLocaleString()} 
                         <span className="text-[10px] uppercase mr-1">{curr.code}</span>
                         <span className="text-[9px] mr-1">({info.balance > 0 ? 'بدهکار' : info.balance < 0 ? 'بستانکار' : 'تسویه'})</span>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* مدال ثبت مشتری جدید */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl text-right animate-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black">ثبت مشتری جدید</h3>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <XIcon size={20} />
              </button>
            </div>
            <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 mr-1">نام و تخلص</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold outline-none focus:border-blue-500 transition-all" placeholder="نام مشتری" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 mr-1">کد شناسایی (منحصر به فرد)</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold outline-none focus:border-blue-500 transition-all" placeholder="مثلا: 101" value={newCustomer.code} onChange={e => setNewCustomer({...newCustomer, code: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 mr-1">شماره تماس</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-right font-bold outline-none focus:border-blue-500 transition-all" placeholder="07xxxxxxx" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                </div>
                <div className="flex gap-4 mt-8">
                    <button onClick={handleSaveNewCustomer} className="flex-1 bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg hover:bg-black transition-all">ذخیره مشتری</button>
                    <button onClick={() => setShowAddModal(false)} className="px-6 bg-slate-100 text-slate-500 py-4 rounded-xl font-bold">لغو</button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* مدال ثبت تراکنش */}
      {transModalState.show && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className={`bg-white rounded-[2rem] p-8 w-full ${transModalState.type === TransactionType.EXCHANGE ? 'max-w-xl' : 'max-w-md'} shadow-2xl text-right relative font-['Vazirmatn']`}>
            {/* دکمه بستن در بالای مدال مطابق تصویر */}
            <button onClick={() => setTransModalState({...transModalState, show: false})} className="absolute top-6 left-6 p-2 text-slate-300 hover:text-slate-500 transition-all"><XIcon size={22}/></button>
            
            {transModalState.type === TransactionType.EXCHANGE ? (
              <div className="space-y-8">
                {/* هدر مدال */}
                <div className="flex items-center justify-center gap-3">
                   <h3 className="text-lg font-black text-slate-800">ماشین حساب تبدیل ارزی</h3>
                   <div className="p-2 bg-slate-900/5 rounded-lg text-slate-800"><Calculator size={20} /></div>
                </div>

                <div className="space-y-6">
                  {/* ردیف انتخاب ارزها */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-400 mr-2">ارز مبدأ</label>
                       <div className="relative">
                         <select className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-2xl font-black text-sm appearance-none outline-none focus:border-blue-500 transition-all" value={newTrans.currency} onChange={e => setNewTrans({...newTrans, currency: e.target.value})}>
                            {exchangeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                         </select>
                         <ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-400 mr-2">ارز مقصد</label>
                       <div className="relative">
                         <select className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-2xl font-black text-sm appearance-none outline-none focus:border-blue-500 transition-all" value={newTrans.targetCurrency} onChange={e => setNewTrans({...newTrans, targetCurrency: e.target.value})}>
                            {exchangeCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                         </select>
                         <ChevronDown size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                  </div>

                  {/* مبلغ ارز مبدأ */}
                  <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 mr-2">مبلغ ارز مبدأ</label>
                     <input type="number" className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-black text-2xl text-center outline-none focus:border-blue-500 transition-all text-blue-600" placeholder="0.00" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} />
                  </div>

                  {/* عملیات ضرب و تقسیم میانی مطابق تصویر */}
                  <div className="relative flex items-center justify-center py-2">
                     <div className="w-full h-px bg-slate-100 absolute"></div>
                     <div className="relative bg-white border border-slate-100 rounded-xl p-1 flex shadow-sm">
                        <button onClick={() => setNewTrans({...newTrans, exchangeOp: 'divide'})} className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg transition-all ${newTrans.exchangeOp === 'divide' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>÷</button>
                        <button onClick={() => setNewTrans({...newTrans, exchangeOp: 'multiply'})} className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg transition-all ${newTrans.exchangeOp === 'multiply' ? 'bg-slate-900 text-white' : 'text-slate-400'}`}>×</button>
                     </div>
                  </div>

                  {/* نرخ تبدیل ارز */}
                  <div className="space-y-2">
                     <label className="text-[11px] font-black text-slate-400 mr-2">نرخ تبدیل ارز</label>
                     <input type="number" className="w-full p-5 bg-white border border-slate-200 rounded-2xl font-black text-2xl text-center outline-none focus:border-blue-500 transition-all text-slate-800" placeholder="0.0000" value={newTrans.exchangeRate || ''} onChange={e => setNewTrans({...newTrans, exchangeRate: Number(e.target.value)})} />
                  </div>

                  {/* بخش خروجی نهایی و سود */}
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-[#f0fdf4] p-5 rounded-2xl border border-emerald-100 text-center">
                        <p className="text-[10px] font-black text-emerald-600 uppercase mb-2">سود تبادله (AFN)</p>
                        <div className="flex items-center justify-center gap-1">
                          <input type="number" className="w-full bg-transparent border-none text-center font-black text-xl text-emerald-700 outline-none" value={newTrans.netProfit || 0} onChange={e => setNewTrans({...newTrans, netProfit: Number(e.target.value)})} />
                        </div>
                     </div>
                     <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center flex flex-col justify-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">خروجی نهایی</p>
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-black text-xl text-slate-800 tabular-nums">{calculatedExchangeResult.toLocaleString()}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">{newTrans.targetCurrency}</span>
                        </div>
                     </div>
                  </div>

                  {/* دکمه ثبت نهایی */}
                  <button onClick={handleAddTransaction} className="w-full py-5 bg-[#0f172a] text-white rounded-2xl font-black text-base shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 mt-4">
                     ثبت قطعی سند تبدیل ارز
                  </button>
                </div>
              </div>
            ) : (
              // استایل بورد و رسید معمولی
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-black text-slate-900">ثبت {transModalState.type}</h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-1 uppercase">مبلغ</label>
                    <input type="number" className="w-full p-4 bg-slate-50 border rounded-xl text-right font-black outline-none focus:border-blue-500" placeholder="0" value={newTrans.amount || ''} onChange={e => setNewTrans({...newTrans, amount: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-1 uppercase">واحد پول</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-xl font-bold outline-none" value={newTrans.currency} onChange={e => setNewTrans({...newTrans, currency: e.target.value})}>
                        {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 mr-1 uppercase">توضیحات معامله</label>
                    <textarea className="w-full p-4 bg-slate-50 border rounded-xl text-right font-medium min-h-[100px] outline-none" placeholder="شرح معامله..." value={newTrans.description} onChange={e => setNewTrans({...newTrans, description: e.target.value})} />
                  </div>
                  <div className="flex gap-4 mt-6">
                    <button onClick={handleAddTransaction} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black shadow-lg hover:bg-blue-700 transition-all">ثبت نهایی</button>
                    <button onClick={() => setTransModalState({...transModalState, show: false})} className="px-6 bg-slate-100 text-slate-500 py-4 rounded-xl font-bold">لغو</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}