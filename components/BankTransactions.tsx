
import React, { useState, useMemo } from 'react';
import { 
  Landmark, ArrowDownLeft, ArrowUpRight, Search, User, 
  CreditCard, Hash, FileText, CheckCircle, Info, Filter, List, Clock
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, Customer, SUPPORTED_CURRENCIES, BankAccount } from '../types';

const getSystemNow = () => Date.now();

interface BankTransactionsProps {
  customers: Customer[];
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  bankAccounts: BankAccount[];
}

const BankTransactions: React.FC<BankTransactionsProps> = ({ customers, transactions, setTransactions, bankAccounts }) => {
  const [activeType, setActiveType] = useState<TransactionType>(TransactionType.RESID);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  
  const [formData, setFormData] = useState({
    amount: 0,
    currency: 'IRT_BANK',
    customerId: '',
    bankAccountId: '',
    sourceAccount: '',
    cardLastFour: '',
    trackingId: '',
    description: ''
  });

  const filteredCustomers = useMemo(() => {
    const term = searchCustomer.trim();
    if (!term) return [];
    return customers.filter(c => 
      c.name.includes(term) || 
      c.code.includes(term)
    );
  }, [customers, searchCustomer]);

  const bankHistory = useMemo(() => {
    return transactions
      .filter(t => t.isBank)
      .filter(t => {
        const customer = customers.find(c => c.id === t.customerId);
        const bank = bankAccounts.find(b => b.id === t.bankAccountId);
        return !historySearch || 
          customer?.name.includes(historySearch) ||
          bank?.bankName.includes(historySearch) ||
          t.amount.toString().includes(historySearch) ||
          t.trackingId?.includes(historySearch) ||
          t.bankFrom?.includes(historySearch) ||
          t.cardLastFour?.includes(historySearch);
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, historySearch, customers, bankAccounts]);

  const currentBalances = useMemo(() => {
    return bankAccounts.map(account => {
      const approved = transactions.filter(t => t.bankAccountId === account.id && t.status === TransactionStatus.APPROVED);
      const resid = approved.filter(t => t.type === TransactionType.RESID).reduce((sum, t) => sum + t.amount, 0);
      const board = approved.filter(t => t.type === TransactionType.BOARD).reduce((sum, t) => sum + t.amount, 0);
      return { id: account.id, balance: account.balance + resid - board, name: account.bankName, currency: account.currency };
    });
  }, [bankAccounts, transactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.customerId || !formData.bankAccountId) {
      alert("لطفاً مبلغ، مشتری و حساب بانکی مقصد را مشخص کنید.");
      return;
    }

    const selectedBank = bankAccounts.find(b => b.id === formData.bankAccountId);

    const transaction: Transaction = {
      id: 'BANK-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      customerId: formData.customerId,
      type: activeType,
      amount: Number(formData.amount),
      currency: selectedBank?.currency || formData.currency,
      bankAccountId: formData.bankAccountId,
      trackingId: formData.trackingId,
      bankFrom: formData.sourceAccount,
      bankTo: selectedBank?.bankName || '',
      cardLastFour: formData.cardLastFour,
      description: formData.description || (activeType === TransactionType.RESID ? 'واریز بانکی' : 'برداشت بانکی'),
      timestamp: getSystemNow(),
      status: TransactionStatus.PENDING,
      isBank: true 
    };

    setTransactions(prev => [...prev, transaction]);
    setFormData({ amount: 0, currency: 'IRT_BANK', customerId: '', bankAccountId: '', sourceAccount: '', cardLastFour: '', trackingId: '', description: '' });
    setSearchCustomer('');
    alert("سند بانکی با موفقیت ثبت و به تائیدات ارسال شد.");
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-700 pb-20 space-y-10">
      
      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-blue-50 text-blue-600 rounded-[2rem]">
            <Landmark size={40} />
          </div>
          <div className="text-right">
            <h3 className="text-3xl font-black text-slate-900">تراکنش‌های بانکی</h3>
            <p className="text-sm text-slate-400 mt-2 font-medium italic">ثبت مستقیم اسناد بانکی و مدیریت حواله‌ها.</p>
          </div>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-[1.8rem]">
          <button onClick={() => setActiveType(TransactionType.RESID)} className={`px-10 py-4 rounded-[1.5rem] font-black text-sm transition-all flex items-center gap-2 ${activeType === TransactionType.RESID ? 'bg-white text-emerald-600 shadow-lg' : 'text-slate-500'}`}>
            <ArrowDownLeft size={18} /> رسید (واریز)
          </button>
          <button onClick={() => setActiveType(TransactionType.BOARD)} className={`px-10 py-4 rounded-[1.5rem] font-black text-sm transition-all flex items-center gap-2 ${activeType === TransactionType.BOARD ? 'bg-white text-rose-600 shadow-lg' : 'text-slate-500'}`}>
            <ArrowUpRight size={18} /> بورد (برداشت)
          </button>
        </div>
      </div>

      {/* نمایش موجودی حساب‌ها */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {currentBalances.map(b => (
          <div key={b.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{b.name}</p>
            <p className="text-sm font-black text-blue-600 tnum">{b.balance.toLocaleString()} <span className="text-[8px] text-slate-400">{b.currency}</span></p>
          </div>
        ))}
        {bankAccounts.length === 0 && <div className="col-span-full p-4 bg-amber-50 rounded-xl text-center text-[10px] font-bold text-amber-600">ابتدا یک حساب بانکی در بخش "مدیریت بانک" ایجاد کنید.</div>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 items-start">
        
        <div className="xl:col-span-5 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
           <form onSubmit={handleSubmit} className="space-y-8 text-right">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۱. مبلغ تراکنش</label>
                 <div className="flex gap-2">
                    <input type="number" className="flex-1 p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] text-3xl font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-right" placeholder="0" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۲. نام یا کد مشتری</label>
                  <div className="relative">
                      <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="text" className="w-full p-5 pr-14 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold outline-none text-right" placeholder="جستجو مشتری..." value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} />
                  </div>
                  {filteredCustomers.length > 0 && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-100 rounded-3xl shadow-2xl max-h-48 overflow-y-auto p-2 text-right">
                      {filteredCustomers.map(c => (
                        <button key={c.id} type="button" onClick={() => { setFormData({...formData, customerId: c.id}); setSearchCustomer(c.name); }} className="w-full p-4 hover:bg-slate-50 text-right rounded-2xl flex items-center justify-between group">
                            <span className="font-black text-slate-800">{c.name}</span>
                            <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg">کد: {c.code}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۳. حساب بانکی مقصد (صرافی)</label>
                  <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black text-sm outline-none text-right" value={formData.bankAccountId} onChange={e => setFormData({...formData, bankAccountId: e.target.value})}>
                      <option value="">-- انتخاب حساب بانکی --</option>
                      {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} ({b.currency})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mr-1 flex items-center gap-1 italic"><CreditCard size={12}/> ۴. ۴ رقم آخر کارت</label>
                    <div className="relative">
                       <CreditCard className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300 group-focus-within:text-blue-600 transition-colors" size={20} />
                       <input type="text" maxLength={4} className="w-full p-5 pr-12 bg-blue-50/50 border border-blue-100 rounded-[1.5rem] font-black font-mono text-center text-lg outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="0000" value={formData.cardLastFour} onChange={e => setFormData({...formData, cardLastFour: e.target.value.replace(/\D/g, '')})} />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۵. شماره پیگیری / سریال</label>
                    <input type="text" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-black font-mono text-sm outline-none text-right" placeholder="Ref Number" value={formData.trackingId} onChange={e => setFormData({...formData, trackingId: e.target.value})} />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۶. توضیحات تکمیلی</label>
                 <textarea className="w-full p-5 bg-slate-50 border border-slate-100 rounded-[1.5rem] font-bold text-sm min-h-[100px] outline-none text-right" placeholder="توضیحات..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <button type="submit" disabled={bankAccounts.length === 0} className={`w-full py-6 rounded-[2rem] font-black text-xl text-white shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${activeType === TransactionType.RESID ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'}`}>
                 ثبت و ارسال به تائیدات <CheckCircle size={24} />
              </button>
           </form>
        </div>

        <div className="xl:col-span-7 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col min-h-[800px]">
           <div className="flex justify-between items-center mb-10 shrink-0">
              <div className="flex items-center gap-4">
                 <div className="p-4 bg-slate-50 text-slate-600 rounded-2xl"><List size={24} /></div>
                 <h3 className="text-xl font-black text-slate-900">تاریخچه اسناد بانکی</h3>
              </div>
              <div className="relative w-72">
                 <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                 <input type="text" placeholder="جستجو در حواله‌ها..." className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pr-12 pl-4 text-xs font-bold outline-none text-right" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
              </div>
           </div>

           <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              {bankHistory.map(t => {
                const customer = customers.find(c => c.id === t.customerId);
                const bank = bankAccounts.find(b => b.id === t.bankAccountId);
                return (
                  <div key={t.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-4 group hover:bg-white hover:shadow-xl transition-all border-r-4 border-r-blue-500">
                     <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black ${t.type === TransactionType.RESID ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                           {t.type === TransactionType.RESID ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                        </div>
                        <div className="text-right">
                           <p className="font-black text-slate-900 text-base">{customer?.name || '---'} <span className="text-[10px] text-blue-500">({bank?.bankName || '---'})</span></p>
                           <div className="flex items-center gap-2 mt-1">
                              {t.cardLastFour && <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg flex items-center gap-1 text-right"><CreditCard size={10}/> **** {t.cardLastFour}</span>}
                              <span className="text-[10px] text-slate-400 font-bold">{new Date(t.timestamp).toLocaleTimeString('fa-IR')}</span>
                           </div>
                        </div>
                     </div>

                     <div className="flex flex-col items-end">
                        <p className="text-xl font-black text-slate-900">{t.amount.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">{t.currency}</span></p>
                        <div className="flex items-center gap-3 mt-1">
                           {t.trackingId && <span className="text-[9px] font-mono text-slate-400">سریال: {t.trackingId}</span>}
                           <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-500/10 text-emerald-600' : t.status === TransactionStatus.PENDING ? 'bg-amber-500/10 text-amber-600' : 'bg-rose-500/10 text-rose-600'}`}>
                              {t.status === TransactionStatus.APPROVED ? 'تائید' : t.status === TransactionStatus.PENDING ? 'انتظار' : 'رد'}
                           </span>
                        </div>
                     </div>
                  </div>
                );
              })}

              {bankHistory.length === 0 && (
                <div className="py-20 text-center text-slate-300 italic flex flex-col items-center gap-4">
                   <FileText size={48} className="opacity-20" />
                   <p>هیچ رکورد بانکی یافت نشد.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default BankTransactions;
