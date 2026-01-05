
import React, { useState, useMemo } from 'react';
import { 
  Landmark, Plus, ArrowDownLeft, ArrowUpRight, 
  Search, X, CreditCard, ArrowLeft, 
  ChevronRight, List, CheckCircle, Clock, UserPlus, HelpCircle, ArrowRightLeft, Save, Percent
} from 'lucide-react';
import { BankAccount, Transaction, TransactionType, TransactionStatus, Customer, SUPPORTED_CURRENCIES } from '../types';

interface BankManagerProps {
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
}

const BankManager: React.FC<BankManagerProps> = ({ bankAccounts, setBankAccounts, transactions, setTransactions, customers }) => {
  const [activeBank, setActiveBank] = useState<BankAccount | null>(null);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'ops' | 'pending'>('ops');
  const [activeMode, setActiveMode] = useState<TransactionType>(TransactionType.RESID);
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showAssignModal, setShowAssignModal] = useState<Transaction | null>(null);
  const [pendingSearch, setPendingSearch] = useState('');
  
  const [newBank, setNewBank] = useState({ name: '', number: '', balance: 0, currency: 'IRT_BANK' });
  const [transferData, setTransferData] = useState({ sourceBankId: '', targetBankId: '', amount: 0, commissionPercent: 0, description: '' });
  const [formData, setFormData] = useState({
    amount: 0,
    customerId: '',
    bankFrom: '',
    cardLastFour: '',
    trackingId: '',
    description: ''
  });

  const currentBankBalance = useMemo(() => {
    if (!activeBank) return 0;
    const approved = transactions.filter(t => t.bankAccountId === activeBank.id && t.status === TransactionStatus.APPROVED);
    const resid = approved.filter(t => t.type === TransactionType.RESID).reduce((sum, t) => sum + t.amount, 0);
    const board = approved.filter(t => t.type === TransactionType.BOARD).reduce((sum, t) => sum + t.amount, 0);
    return activeBank.balance + resid - board;
  }, [activeBank, transactions]);

  const filteredCustomers = useMemo(() => {
    const term = searchCustomer.trim();
    if (!term) return [];
    return customers.filter(c => 
      c.name.includes(term) || 
      c.code.includes(term)
    );
  }, [customers, searchCustomer]);

  const pendingDeposits = useMemo(() => {
    if (!activeBank) return [];
    return transactions.filter(t => 
      t.bankAccountId === activeBank.id && 
      !t.customerId && 
      t.type === TransactionType.RESID &&
      (t.trackingId?.includes(pendingSearch) || t.cardLastFour?.includes(pendingSearch) || t.amount.toString().includes(pendingSearch))
    ).sort((a,b) => b.timestamp - a.timestamp);
  }, [transactions, activeBank, pendingSearch]);

  const handleAddBank = () => {
    if (!newBank.name || !newBank.number) return;
    const account: BankAccount = {
      id: 'BANK-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      bankName: newBank.name,
      accountNumber: newBank.number,
      balance: Number(newBank.balance),
      currency: newBank.currency
    };
    setBankAccounts(prev => [...prev, account]);
    setShowAddBankModal(false);
    setNewBank({ name: '', number: '', balance: 0, currency: 'IRT_BANK' });
  };

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferData.sourceBankId || !transferData.targetBankId || transferData.amount <= 0) return;
    if (transferData.sourceBankId === transferData.targetBankId) {
      alert("حساب مبدأ و مقصد نمی‌تواند یکی باشد.");
      return;
    }
    
    const sourceBank = bankAccounts.find(b => b.id === transferData.sourceBankId);
    const targetBank = bankAccounts.find(b => b.id === transferData.targetBankId);
    
    if (!sourceBank || !targetBank) return;

    const timestamp = Date.now();
    const transferGroupId = Math.random().toString(36).substr(2, 5).toUpperCase();
    
    const commissionAmount = (transferData.amount * transferData.commissionPercent) / 100;
    const netAmount = transferData.amount - commissionAmount;

    const sourceTransaction: Transaction = {
      id: `TX-OUT-${transferGroupId}`,
      type: TransactionType.BOARD,
      amount: transferData.amount,
      currency: sourceBank.currency,
      bankAccountId: sourceBank.id,
      isBank: true,
      description: `[انتقال بین بانکی] به حساب ${targetBank.bankName} - مبلغ اصلی: ${transferData.amount.toLocaleString()} - کمیشن (${transferData.commissionPercent}%): ${commissionAmount.toLocaleString()} - ${transferData.description}`,
      timestamp: timestamp,
      status: TransactionStatus.APPROVED
    };

    const targetTransaction: Transaction = {
      id: `TX-IN-${transferGroupId}`,
      type: TransactionType.RESID,
      amount: netAmount,
      currency: targetBank.currency,
      bankAccountId: targetBank.id,
      isBank: true,
      description: `[انتقال بین بانکی] از حساب ${sourceBank.bankName} - کمیشن کسر شده: ${commissionAmount.toLocaleString()} (${transferData.commissionPercent}%) - ${transferData.description}`,
      timestamp: timestamp + 1,
      status: TransactionStatus.APPROVED
    };

    setTransactions(prev => [...prev, sourceTransaction, targetTransaction]);
    setShowTransferModal(false);
    alert("انتقال با موفقیت انجام شد.");
  };

  const openTransferModal = () => {
    setTransferData({
      sourceBankId: activeBank?.id || '',
      targetBankId: '',
      amount: 0,
      commissionPercent: 0,
      description: ''
    });
    setShowTransferModal(true);
  };

  const handleSubmitTransaction = (e: React.FormEvent, isPending: boolean = false) => {
    e.preventDefault();
    if (!activeBank || formData.amount <= 0) return;
    if (!isPending && !formData.customerId) {
        alert("برای رسید قطعی انتخاب مشتری الزامی است.");
        return;
    }

    const transaction: Transaction = {
      id: 'BT-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      customerId: isPending ? undefined : formData.customerId,
      type: activeMode,
      amount: Number(formData.amount),
      currency: activeBank.currency,
      bankAccountId: activeBank.id,
      isBank: true,
      bankFrom: formData.bankFrom,
      bankTo: activeBank.bankName,
      cardLastFour: formData.cardLastFour,
      trackingId: formData.trackingId,
      description: formData.description || (isPending ? `واریزی در حال انتظار (مجهول)` : `رسید بانکی مشتری`),
      timestamp: Date.now(),
      status: TransactionStatus.PENDING
    };

    setTransactions(prev => [...prev, transaction]);
    setFormData({ amount: 0, customerId: '', bankFrom: '', cardLastFour: '', trackingId: '', description: '' });
    setSearchCustomer('');
    if (isPending) setActiveTab('pending');
    alert(isPending ? "به لیست واریزی‌های مجهول اضافه شد." : "سند ثبت و به لیست تائیدات ارسال شد.");
  };

  const handleAssignToCustomer = (customer: Customer) => {
    if (!showAssignModal) return;
    setTransactions(prev => prev.map(t => 
      t.id === showAssignModal.id 
        ? { ...t, customerId: customer.id, description: `[تخصیص یافته به ${customer.name}] ${t.description}` } 
        : t
    ));
    setShowAssignModal(null);
    setSearchCustomer('');
    alert(`مبلغ با موفقیت به حساب ${customer.name} منتقل شد.`);
  };

  const modalCommissionAmount = (transferData.amount * transferData.commissionPercent) / 100;
  const modalNetAmount = transferData.amount - modalCommissionAmount;

  if (!activeBank) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div>
              <h2 className="text-3xl font-black text-slate-900">مدیریت حسابات بانکی</h2>
              <p className="text-sm text-slate-400 mt-2 font-medium italic">یک حساب را برای شروع عملیات رسید یا برد انتخاب کنید.</p>
           </div>
           <button onClick={() => setShowAddBankModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-blue-700 transition-all">
              <Plus size={20} /> افزودن حساب بانکی
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bankAccounts.map(account => (
            <button key={account.id} onClick={() => setActiveBank(account)} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all text-right group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-2 h-full bg-blue-600 group-hover:w-4 transition-all"></div>
              <div className="flex justify-between items-start mb-10">
                 <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all"><Landmark size={32} /></div>
                 <ChevronRight className="text-slate-200 group-hover:text-blue-600 transition-all" />
              </div>
              <h3 className="text-2xl font-black text-slate-900">{account.bankName}</h3>
              <p className="text-sm font-mono text-slate-400 mt-2 tracking-widest">{account.accountNumber}</p>
              <div className="mt-8 pt-8 border-t border-slate-50 flex justify-between items-baseline">
                 <p className="text-[10px] font-black text-slate-400 uppercase">موجودی فعلی:</p>
                 <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">
                      {(transactions.filter(t => t.bankAccountId === account.id && t.status === TransactionStatus.APPROVED).reduce((sum, t) => sum + (t.type === TransactionType.RESID ? t.amount : -t.amount), account.balance)).toLocaleString()}
                    </span>
                    <span className="text-xs font-black text-blue-600">{account.currency}</span>
                 </div>
              </div>
            </button>
          ))}
        </div>

        {showAddBankModal && (
          <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-md shadow-2xl animate-in zoom-in">
                <h3 className="text-2xl font-black mb-8 text-slate-900">تعریف حساب بانکی جدید</h3>
                <div className="space-y-6 text-right">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">نام بانک</label>
                      <input type="text" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none" placeholder="مثلاً ملت" value={newBank.name} onChange={e => setNewBank({...newBank, name: e.target.value})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase">شماره حساب/کارت</label>
                      <input type="text" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black font-mono outline-none" placeholder="xxxx-xxxx-xxxx-xxxx" value={newBank.number} onChange={e => setNewBank({...newBank, number: e.target.value})} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase">موجودی اولیه</label>
                         <input type="number" className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none" value={newBank.balance || ''} onChange={e => setNewBank({...newBank, balance: Number(e.target.value)})} />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase">واحد پول</label>
                         <select className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-black outline-none" value={newBank.currency} onChange={e => setNewBank({...newBank, currency: e.target.value})}>
                            <option value="IRT_BANK">تومان بانکی</option>
                            <option value="USD">دالر</option>
                         </select>
                      </div>
                   </div>
                   <div className="flex gap-4 pt-4">
                      <button onClick={handleAddBank} className="flex-1 bg-blue-600 text-white py-5 rounded-2xl font-black text-lg">ایجاد حساب</button>
                      <button onClick={() => setShowAddBankModal(false)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black">لغو</button>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-left duration-500 pb-20">
      <div className="flex items-center gap-6">
         <button onClick={() => setActiveBank(null)} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
            <ArrowLeft size={24} />
         </button>
         <div className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-6">
               <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg"><Landmark size={28} /></div>
               <div>
                  <h2 className="text-2xl font-black text-slate-900">{activeBank.bankName}</h2>
                  <p className="text-xs font-mono text-slate-400 font-bold tracking-widest">{activeBank.accountNumber}</p>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={openTransferModal} className="bg-slate-50 text-slate-900 px-6 py-4 rounded-2xl font-black text-xs flex items-center gap-2 border border-slate-100 hover:bg-slate-100 transition-all">
                  <ArrowRightLeft size={16} /> انتقال بین بانکی
               </button>
               <div className="bg-amber-50 px-6 py-4 rounded-2xl border border-amber-100 text-center">
                  <p className="text-[9px] font-black text-amber-600 uppercase mb-1">واریزی‌های مجهول:</p>
                  <p className="text-xl font-black text-amber-700">{pendingDeposits.length} سند</p>
               </div>
               <div className="bg-slate-950 px-8 py-4 rounded-2xl text-white text-center">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">موجودی کل بانک:</p>
                  <div className="flex items-baseline justify-center gap-2">
                     <span className="text-2xl font-black">{currentBankBalance.toLocaleString()}</span>
                     <span className="text-[10px] font-black text-blue-400">{activeBank.currency}</span>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 max-w-md">
         <button onClick={() => setActiveTab('ops')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${activeTab === 'ops' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>ثبت تراکنش قطعی</button>
         <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}>واریزی‌های مجهول (در انتظار)</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
         
         {activeTab === 'ops' ? (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 animate-in fade-in duration-300">
                <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                <h3 className="text-xl font-black text-slate-900">ثبت سند بانکی مشتری</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button onClick={() => setActiveMode(TransactionType.RESID)} className={`px-6 py-2 rounded-lg font-black text-xs transition-all ${activeMode === TransactionType.RESID ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>رسید</button>
                    <button onClick={() => setActiveMode(TransactionType.BOARD)} className={`px-6 py-2 rounded-lg font-black text-xs transition-all ${activeMode === TransactionType.BOARD ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>برد</button>
                </div>
                </div>

                <form onSubmit={(e) => handleSubmitTransaction(e, false)} className="space-y-6 text-right">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5 relative">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">۱. مشتری</label>
                        <div className="relative">
                            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                            <input type="text" className="w-full p-4 pr-12 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" placeholder="جستجو..." value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} />
                        </div>
                        {filteredCustomers.length > 0 && (
                            <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto p-1">
                            {filteredCustomers.map(c => (
                                <button key={c.id} type="button" onClick={() => { setFormData({...formData, customerId: c.id}); setSearchCustomer(c.name); }} className="w-full p-3 hover:bg-slate-50 text-right rounded-lg text-xs font-bold transition-colors">{c.name} ({c.code})</button>
                            ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">۲. مبلغ ({activeBank.currency})</label>
                        <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold outline-none" placeholder="قلم خرد برای مبالغ بالا" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">۳. بانک ارسال کننده</label>
                        <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" placeholder="نام بانک مبدأ" value={formData.bankFrom} onChange={e => setFormData({...formData, bankFrom: e.target.value})} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mr-1 italic flex items-center gap-1"><CreditCard size={10}/> ۴. ۴ رقم کارت</label>
                        <input type="text" maxLength={4} className="w-full p-4 bg-blue-50/20 border border-blue-100 rounded-xl font-black font-mono text-center text-sm outline-none" placeholder="0000" value={formData.cardLastFour} onChange={e => setFormData({...formData, cardLastFour: e.target.value})} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">۵. شماره پیگیری / رفرنس</label>
                    <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black font-mono text-sm outline-none" placeholder="Tracking ID" value={formData.trackingId} onChange={e => setFormData({...formData, trackingId: e.target.value})} />
                </div>

                <div className="flex gap-4">
                    <button type="submit" className={`flex-1 py-5 rounded-2xl font-black text-white text-lg shadow-xl transition-all ${activeMode === TransactionType.RESID ? 'bg-emerald-600' : 'bg-rose-600'}`}>تائید و ثبت نهایی</button>
                    {activeMode === TransactionType.RESID && (
                        <button type="button" onClick={(e) => handleSubmitTransaction(e, true)} className="px-8 bg-amber-500 text-white rounded-2xl font-black text-xs shadow-lg shadow-amber-100">ثبت در مجهولین</button>
                    )}
                </div>
                </form>
            </div>
         ) : (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-8 animate-in slide-in-from-right duration-300">
                <div className="flex justify-between items-center border-b border-slate-50 pb-6">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="text-amber-500" size={24} />
                        <h3 className="text-xl font-black text-slate-900">واریزی‌های مجهول</h3>
                    </div>
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <input type="text" className="bg-slate-50 border border-slate-100 rounded-xl py-2 pr-10 pl-4 text-[10px] font-bold outline-none" placeholder="جستجو در مجهولین..." value={pendingSearch} onChange={e => setPendingSearch(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {pendingDeposits.map(t => (
                        <div key={t.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-amber-50/30 transition-all border-r-4 border-r-amber-400">
                            <div className="text-right">
                                <div className="flex items-center gap-2">
                                    <p className="text-lg font-black text-slate-900">{t.amount.toLocaleString()} <span className="text-[10px] text-blue-600 uppercase">{t.currency}</span></p>
                                    <span className="text-[8px] bg-white border border-slate-100 px-2 py-0.5 rounded-full font-bold text-slate-400">{new Date(t.timestamp).toLocaleTimeString('fa-IR')}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-2">
                                    {t.cardLastFour && <span className="text-[9px] font-black text-slate-500 flex items-center gap-1"><CreditCard size={10}/> **** {t.cardLastFour}</span>}
                                    {t.trackingId && <span className="text-[9px] font-mono text-slate-400">Ref: {t.trackingId}</span>}
                                </div>
                            </div>
                            <button onClick={() => setShowAssignModal(t)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-all">
                                <UserPlus size={14} /> تخصیص به مشتری
                            </button>
                        </div>
                    ))}
                    {pendingDeposits.length === 0 && (
                        <div className="py-20 text-center text-slate-300 italic flex flex-col items-center gap-4">
                            <CheckCircle size={48} className="text-emerald-500 opacity-20" />
                            <p>تمام واریزی‌ها تعیین تکلیف شده‌اند.</p>
                        </div>
                    )}
                </div>
            </div>
         )}

         <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col h-full max-h-[700px]">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-black text-slate-900">تاریخچه تراکنش‌های بانک</h3>
               <div className="p-2 bg-slate-50 rounded-xl"><List size={18} className="text-slate-400" /></div>
            </div>
            <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
               <table className="w-full text-right text-xs">
                  <thead className="sticky top-0 bg-white z-10">
                     <tr className="text-slate-400 border-b border-slate-50">
                        <th className="pb-4 font-black uppercase">طرف حساب</th>
                        <th className="pb-4 font-black uppercase text-left">مبلغ</th>
                        <th className="pb-4 font-black uppercase text-center">وضعیت</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {transactions.filter(t => t.bankAccountId === activeBank.id).sort((a,b) => b.timestamp - a.timestamp).map(t => {
                        const customer = customers.find(c => c.id === t.customerId);
                        return (
                           <tr key={t.id} className="hover:bg-slate-50/50 group transition-all">
                              <td className="py-5">
                                 <p className="font-black text-slate-800">{customer?.name || (t.customerId ? '---' : '⚠️ واریزی مجهول')}</p>
                                 <p className="text-[8px] font-mono text-slate-400 mt-1">{t.trackingId || 'بدون سریال'}</p>
                              </td>
                              <td className="py-5 font-black text-left">
                                 <div className={t.type === TransactionType.RESID ? 'text-emerald-600' : 'text-rose-600'}>
                                    {t.type === TransactionType.RESID ? '+' : '-'}{t.amount.toLocaleString()}
                                    <span className="text-[8px] mr-1 opacity-50 uppercase">{t.currency}</span>
                                 </div>
                              </td>
                              <td className="py-5 text-center">
                                 <span className={`px-2 py-1 rounded-lg text-[9px] font-black ${t.status === TransactionStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {t.status === TransactionStatus.APPROVED ? 'تائید' : 'انتظار'}
                                 </span>
                              </td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      {/* مودال انتقال بین بانکی */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in text-right">
              <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
                 <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><ArrowRightLeft size={24} /></div>
                    <h3 className="text-xl font-black text-slate-900">انتقال وجه بین بانکی</h3>
                 </div>
                 <button onClick={() => setShowTransferModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400"><X size={20}/></button>
              </div>

              <form onSubmit={handleTransfer} className="space-y-6">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">حساب مبدأ (فرستنده)</label>
                    <select 
                       className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                       value={transferData.sourceBankId}
                       onChange={e => setTransferData({...transferData, sourceBankId: e.target.value})}
                       required
                    >
                       <option value="">-- انتخاب بانک مبدأ --</option>
                       {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.currency})</option>
                       ))}
                    </select>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mr-1">حساب مقصد (گیرنده)</label>
                    <select 
                       className="w-full p-4 bg-white border border-blue-100 rounded-xl font-black text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                       value={transferData.targetBankId}
                       onChange={e => setTransferData({...transferData, targetBankId: e.target.value})}
                       required
                    >
                       <option value="">-- انتخاب بانک مقصد --</option>
                       {bankAccounts.map(b => (
                          <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.currency})</option>
                       ))}
                    </select>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">مبلغ انتقال</label>
                        <input 
                        type="number" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-lg outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-right"
                        placeholder="0"
                        value={transferData.amount || ''}
                        onChange={e => setTransferData({...transferData, amount: Number(e.target.value)})}
                        required
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest mr-1 flex items-center gap-1">
                            <Percent size={12} /> فیصدی کمیشن
                        </label>
                        <input 
                        type="number" 
                        step="0.01"
                        className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-xl font-black text-lg outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-center"
                        placeholder="0.00"
                        value={transferData.commissionPercent || ''}
                        onChange={e => setTransferData({...transferData, commissionPercent: Number(e.target.value)})}
                        />
                    </div>
                 </div>

                 {(transferData.amount > 0 && transferData.commissionPercent > 0) && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                        <div className="flex justify-between text-[10px] font-bold">
                            <span className="text-slate-400 uppercase">مبلغ کمیشن:</span>
                            <span className="text-rose-600 tabular-nums">{modalCommissionAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-[11px] font-black">
                            <span className="text-slate-900 uppercase">مبلغ خالص دریافتی مقصد:</span>
                            <span className="text-emerald-600 tabular-nums">{modalNetAmount.toLocaleString()}</span>
                        </div>
                    </div>
                 )}

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">شرح انتقال (بابت...)</label>
                    <textarea 
                       className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-xs outline-none focus:bg-white transition-all text-right"
                       placeholder="مثلاً: بابت جابجایی نقدینگی"
                       value={transferData.description}
                       onChange={e => setTransferData({...transferData, description: e.target.value})}
                    />
                 </div>

                 <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-900/10 flex items-center justify-center gap-3 hover:bg-blue-700 transition-all">
                    <Save size={20} /> تائید و جابجایی وجه
                 </button>
              </form>
           </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 text-right">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl animate-in zoom-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="text-3xl font-black">تخصیص به مشتری</h3>
                    <p className="text-sm text-slate-400 mt-1">مبلغ {showAssignModal.amount.toLocaleString()} {showAssignModal.currency} به حساب چه کسی ثبت شود؟</p>
                </div>
                <button onClick={() => setShowAssignModal(null)} className="p-3 bg-slate-100 rounded-full hover:bg-rose-50 hover:text-rose-500 transition-all"><X size={24} /></button>
            </div>
            
            <div className="relative mb-6">
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                <input type="text" placeholder="جستجوی مشتری..." className="w-full bg-slate-50 p-6 pr-14 rounded-3xl font-bold border border-slate-100 focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all" value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {filteredCustomers.map(c => (
                <button key={c.id} onClick={() => handleAssignToCustomer(c)} className="w-full p-6 bg-slate-50 rounded-3xl flex justify-between items-center hover:bg-blue-600 hover:text-white group transition-all">
                  <div className="text-right">
                    <p className="font-black text-lg group-hover:text-white">{c.name}</p>
                    <p className="text-[10px] opacity-60 font-bold uppercase mt-1">کد مشتری: {c.code}</p>
                  </div>
                  <ChevronRight size={24} className="opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
              {searchCustomer.trim() !== '' && filteredCustomers.length === 0 && (
                <div className="py-20 text-center text-slate-300 italic">مشتری یافت نشد.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankManager;
