import React, { useState, useMemo } from 'react';
import { 
  Landmark, Plus, Search, X, CreditCard, ArrowLeft, 
  ChevronRight, List, CheckCircle, Clock, ArrowRightLeft, 
  Save, Percent, Trash2, AlertCircle, ShieldQuestion, Wallet,
  ArrowDown, ArrowUp, FileText, HelpCircle, Check, User
} from 'lucide-react';
import { BankAccount, Transaction, TransactionType, TransactionStatus, Customer, SUPPORTED_CURRENCIES } from './types';

const SYSTEM_TIME_OFFSET = -21600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;

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
  const [searchPending, setSearchPending] = useState('');
  
  const [newBank, setNewBank] = useState({ name: '', number: '', balance: 0, currency: 'IRT_BANK' });
  const [transferData, setTransferData] = useState({ 
    sourceBankId: '', 
    targetBankId: '', 
    manualTargetName: '',
    amount: 0, 
    commissionPercent: 0, 
    description: '' 
  });
  
  const [formData, setFormData] = useState({
    amount: 0,
    customerId: '',
    bankFrom: '',
    cardLastFour: '',
    trackingId: '',
    commissionPercent: 0,
    description: ''
  });

  const currentBankBalance = useMemo(() => {
    if (!activeBank) return 0;
    const approved = transactions.filter(t => t.bankAccountId === activeBank.id && t.status === TransactionStatus.APPROVED);
    const resid = approved.filter(t => t.type === TransactionType.RESID).reduce((sum, t) => sum + t.amount, 0);
    const board = approved.filter(t => t.type === TransactionType.BOARD).reduce((sum, t) => sum + t.amount, 0);
    return activeBank.balance + resid - board;
  }, [activeBank, transactions]);

  const pendingCount = useMemo(() => {
    if (!activeBank) return 0;
    return transactions.filter(t => t.bankAccountId === activeBank.id && !t.customerId && t.status === TransactionStatus.PENDING).length;
  }, [activeBank, transactions]);

  const filteredCustomers = useMemo(() => {
    const term = searchCustomer.trim();
    if (!term) return [];
    return customers.filter(c => c.name.includes(term) || c.code.includes(term));
  }, [customers, searchCustomer]);

  const bankHistory = useMemo(() => {
    if (!activeBank) return [];
    return transactions
      .filter(t => t.bankAccountId === activeBank.id && t.isBank)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, activeBank]);

  const pendingTransactions = useMemo(() => {
    if (!activeBank) return [];
    return transactions.filter(t => 
      t.bankAccountId === activeBank.id && 
      !t.customerId && 
      t.status === TransactionStatus.PENDING &&
      (t.description.includes(searchPending) || t.amount.toString().includes(searchPending) || t.trackingId?.includes(searchPending))
    );
  }, [transactions, activeBank, searchPending]);

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

  const handleInternalTransfer = () => {
    if (!transferData.sourceBankId || transferData.amount <= 0) {
      alert("لطفاً بانک مبدأ و مبلغ را وارد کنید.");
      return;
    }

    const sourceBank = bankAccounts.find(b => b.id === transferData.sourceBankId);
    if (!sourceBank) return;

    const now = getSystemNow();
    const commissionValue = (transferData.amount * (transferData.commissionPercent || 0)) / 100;
    const netAmount = transferData.amount - commissionValue;

    // اگر بانک مقصد انتخاب شده باشد (انتقال داخلی)
    if (transferData.targetBankId) {
      if (transferData.sourceBankId === transferData.targetBankId) {
        alert("بانک مبدأ و مقصد نمی‌توانند یکی باشند.");
        return;
      }
      const targetBank = bankAccounts.find(b => b.id === transferData.targetBankId);
      if (!targetBank) return;

      const outTrans: Transaction = {
        id: `TX-TR-OUT-${now}`,
        type: TransactionType.BOARD,
        amount: transferData.amount,
        currency: sourceBank.currency,
        bankAccountId: sourceBank.id,
        isBank: true,
        netProfit: commissionValue,
        description: `انتقال به بانک داخلی ${targetBank.bankName} ${transferData.description ? `- ${transferData.description}` : ''}`,
        timestamp: now,
        status: TransactionStatus.APPROVED
      };

      const inTrans: Transaction = {
        id: `TX-TR-IN-${now}`,
        type: TransactionType.RESID,
        amount: netAmount,
        currency: targetBank.currency,
        bankAccountId: targetBank.id,
        isBank: true,
        description: `دریافت از بانک داخلی ${sourceBank.bankName} ${transferData.description ? `- ${transferData.description}` : ''}`,
        timestamp: now + 1,
        status: TransactionStatus.APPROVED
      };

      setTransactions(prev => [...prev, outTrans, inTrans]);
    } 
    // اگر مقصد دستی وارد شده باشد (انتقال به همکار یا مشتری)
    else {
      const destinationLabel = transferData.manualTargetName || "حساب خارجی/همکار";
      const outTrans: Transaction = {
        id: `TX-EXT-OUT-${now}`,
        type: TransactionType.BOARD,
        amount: transferData.amount,
        currency: sourceBank.currency,
        bankAccountId: sourceBank.id,
        isBank: true,
        netProfit: commissionValue,
        description: `انتقال به [${destinationLabel}] ${transferData.description ? `- ${transferData.description}` : ''}`,
        timestamp: now,
        status: TransactionStatus.APPROVED
      };

      setTransactions(prev => [...prev, outTrans]);
    }

    setShowTransferModal(false);
    setTransferData({ sourceBankId: '', targetBankId: '', manualTargetName: '', amount: 0, commissionPercent: 0, description: '' });
    alert("عملیات انتقال با موفقیت انجام شد.");
  };

  const handleSubmitTransaction = (e: React.FormEvent, isAnonymous: boolean = false) => {
    if (e) e.preventDefault();
    if (!activeBank || formData.amount <= 0) return;
    
    const commissionAmount = (formData.amount * (formData.commissionPercent || 0)) / 100;
    const finalAmount = activeMode === TransactionType.RESID ? (formData.amount - commissionAmount) : formData.amount;

    const transaction: Transaction = {
      id: 'BT-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      customerId: isAnonymous ? undefined : formData.customerId,
      type: activeMode,
      amount: Number(finalAmount),
      netProfit: commissionAmount,
      currency: activeBank.currency,
      bankAccountId: activeBank.id,
      isBank: true,
      bankFrom: formData.bankFrom,
      cardLastFour: formData.cardLastFour,
      trackingId: formData.trackingId,
      description: formData.description,
      timestamp: getSystemNow(),
      status: TransactionStatus.PENDING
    };

    setTransactions(prev => [...prev, transaction]);
    setFormData({ amount: 0, customerId: '', bankFrom: '', cardLastFour: '', trackingId: '', commissionPercent: 0, description: '' });
    setSearchCustomer('');
    alert(isAnonymous ? "در لیست مجهولین ثبت شد." : "تراکنش قطعی با موفقیت ثبت شد.");
  };

  if (!activeBank) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <div className="text-right">
              <h2 className="text-3xl font-black text-slate-900">بانک‌های فعال</h2>
              <p className="text-sm text-slate-400 mt-2 font-medium">یک بانک را برای مدیریت تراکنش‌ها انتخاب کنید.</p>
           </div>
           <div className="flex gap-4">
              <button onClick={() => setShowTransferModal(true)} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-black transition-all">
                <ArrowRightLeft size={20} /> انتقال وجه (بین بانکی / همکار)
              </button>
              <button onClick={() => setShowAddBankModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl hover:bg-blue-700 transition-all">
                <Plus size={20} /> افزودن حساب بانکی
              </button>
           </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {bankAccounts.map(account => {
            const approved = transactions.filter(t => t.bankAccountId === account.id && t.status === TransactionStatus.APPROVED);
            const balance = approved.reduce((sum, t) => sum + (t.type === TransactionType.RESID ? t.amount : -t.amount), account.balance);
            return (
              <button key={account.id} onClick={() => setActiveBank(account)} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all text-right group relative overflow-hidden">
                <div className="absolute top-0 right-0 w-2 h-full bg-blue-600"></div>
                <div className="flex justify-between items-start mb-10">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Landmark size={32} /></div>
                  <ChevronRight className="text-slate-200" />
                </div>
                <h3 className="text-2xl font-black text-slate-900">{account.bankName}</h3>
                <p className="text-sm font-mono text-slate-400 mt-2 tracking-widest">{account.accountNumber}</p>
                <div className="mt-8 pt-8 border-t border-slate-50 flex justify-between items-baseline">
                  <p className="text-[10px] font-black text-slate-400 uppercase">موجودی فعلی:</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">{balance.toLocaleString()}</span>
                    <span className="text-xs font-black text-blue-600">{account.currency}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {showAddBankModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in text-right">
              <h3 className="text-xl font-black mb-6">افزودن حساب بانکی جدید</h3>
              <div className="space-y-4">
                <input type="text" placeholder="نام بانک (مثلا ملت)" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={newBank.name} onChange={e => setNewBank({...newBank, name: e.target.value})} />
                <input type="text" placeholder="شماره حساب / کارت" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={newBank.number} onChange={e => setNewBank({...newBank, number: e.target.value})} />
                <input type="number" placeholder="موجودی اولیه" className="w-full p-4 bg-slate-50 border rounded-xl font-bold" value={newBank.balance || ''} onChange={e => setNewBank({...newBank, balance: Number(e.target.value)})} />
                <div className="flex gap-4 pt-4">
                  <button onClick={handleAddBank} className="flex-1 bg-blue-600 text-white py-4 rounded-xl font-black">ذخیره بانک</button>
                  <button onClick={() => setShowAddBankModal(false)} className="px-6 bg-slate-100 text-slate-500 py-4 rounded-xl font-bold">لغو</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showTransferModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in text-right font-['Vazirmatn'] border border-slate-100 overflow-y-auto max-h-[90vh] custom-scrollbar">
              <div className="flex justify-between items-center mb-10 relative">
                 <button onClick={() => setShowTransferModal(false)} className="p-2 text-slate-300 hover:text-rose-500 transition-all absolute -left-2 top-0">
                    <X size={20}/>
                 </button>
                 <div className="w-full flex justify-center items-center gap-3">
                    <h3 className="text-lg font-black text-slate-900">انتقال وجه بین بانکی / خارجی</h3>
                    <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                       <ArrowRightLeft size={22} />
                    </div>
                 </div>
              </div>
              
              <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mr-1">حساب مبدأ (فرستنده)</label>
                    <select 
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-right text-sm" 
                      value={transferData.sourceBankId} 
                      onChange={e => setTransferData({...transferData, sourceBankId: e.target.value})}
                    >
                       <option value="">-- انتخاب بانک مبدأ --</option>
                       {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber} ({b.currency})</option>)}
                    </select>
                </div>

                <div className="space-y-4 pt-2 border-t border-slate-50">
                    <p className="text-[10px] font-black text-slate-300 text-center uppercase tracking-[0.2em]">انتخاب مقصد تراکنش</p>
                    
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-blue-500 uppercase tracking-tight mr-1">حساب مقصد داخلی (اختیاری)</label>
                        <select 
                          className="w-full p-4 bg-blue-50/20 border border-blue-100 rounded-2xl font-bold outline-none text-right text-sm" 
                          value={transferData.targetBankId} 
                          onChange={e => setTransferData({...transferData, targetBankId: e.target.value, manualTargetName: e.target.value ? '' : transferData.manualTargetName})}
                        >
                           <option value="">-- عدم انتخاب (انتقال به خارج از سیستم) --</option>
                           {bankAccounts.filter(b => b.id !== transferData.sourceBankId).map(b => <option key={b.id} value={b.id}>{b.bankName} ({b.currency})</option>)}
                        </select>
                    </div>

                    <div className="relative flex items-center justify-center">
                        <span className="bg-white px-3 text-[10px] font-black text-slate-300 z-10">یا</span>
                        <div className="absolute w-full h-px bg-slate-100"></div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-amber-600 uppercase tracking-tight mr-1 flex items-center gap-1">
                          <User size={12} /> نام همکار یا حساب مقصد مشتری (دستی)
                        </label>
                        <input 
                          type="text" 
                          placeholder="مثلاً: صرافی احمدی / علی محمدی" 
                          disabled={!!transferData.targetBankId}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold outline-none text-right text-sm disabled:opacity-30" 
                          value={transferData.manualTargetName} 
                          onChange={e => setTransferData({...transferData, manualTargetName: e.target.value})} 
                        />
                        {transferData.targetBankId && <p className="text-[8px] text-blue-400 font-bold">بانک داخلی انتخاب شده است.</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2 text-right">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mr-1">مبلغ انتقال</label>
                      <input 
                        type="number" 
                        placeholder="0" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-center text-lg outline-none tabular-nums" 
                        value={transferData.amount || ''} 
                        onChange={e => setTransferData({...transferData, amount: Number(e.target.value)})} 
                      />
                   </div>
                   <div className="space-y-2 text-right">
                      <label className="text-[10px] font-bold text-blue-500 uppercase tracking-tight mr-1">% فیصدی کمیشن</label>
                      <input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-2xl font-black text-center text-lg outline-none tabular-nums text-blue-600" 
                        value={transferData.commissionPercent || ''} 
                        onChange={e => setTransferData({...transferData, commissionPercent: Number(e.target.value)})} 
                      />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mr-1">شرح انتقال (بابت...)</label>
                   <textarea 
                     placeholder="مثلاً: بابت جابجایی نقدینگی یا تسویه حساب" 
                     className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl font-medium outline-none text-right text-xs min-h-[90px] leading-relaxed" 
                     value={transferData.description} 
                     onChange={e => setTransferData({...transferData, description: e.target.value})} 
                   />
                </div>

                <div className="pt-4">
                   <button 
                     onClick={handleInternalTransfer} 
                     className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3"
                   >
                      <Save size={18} /> تائید و ثبت نهایی انتقال
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in slide-in-from-left duration-500 pb-20 font-['Vazirmatn']" dir="rtl">
      {/* Header Cards */}
      <div className="flex flex-wrap items-center gap-4 justify-end">
         <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg"><Landmark size={24} /></div>
            <div className="text-right">
               <h3 className="text-lg font-black text-slate-900">{activeBank.bankName}</h3>
               <p className="text-[10px] font-mono text-slate-400 font-bold">{activeBank.accountNumber}</p>
            </div>
         </div>
         <button onClick={() => setShowTransferModal(true)} className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-blue-500 transition-all">
            <div className="text-right">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-1">انتقال وجه / جابجایی</p>
               <div className="flex items-center gap-2 text-slate-900 font-black cursor-pointer hover:text-blue-600 transition-all">
                  <ArrowRightLeft size={16} /> <span className="text-xs">کلیک کنید</span>
               </div>
            </div>
         </button>
         <div className="bg-amber-50 px-6 py-4 rounded-2xl border border-amber-100 shadow-sm flex items-center gap-4">
            <div className="text-right">
               <p className="text-[10px] font-black text-amber-600 uppercase mb-1">واریزی‌های مجهول:</p>
               <p className="text-lg font-black text-amber-700 tabular-nums">{pendingCount} سند</p>
            </div>
         </div>
         <div className="bg-slate-900 px-6 py-4 rounded-2xl text-white shadow-xl flex items-center gap-4">
            <div className="text-right">
               <p className="text-[10px] font-black text-slate-500 uppercase mb-1">موجودی کل بانک:</p>
               <p className="text-lg font-black tabular-nums">{currentBankBalance.toLocaleString()} <span className="text-[10px] font-bold text-blue-400 uppercase">{activeBank.currency}</span></p>
            </div>
         </div>
         <button onClick={() => setActiveBank(null)} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
            <ArrowLeft size={24} />
         </button>
      </div>

      {/* Main Tabs */}
      <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-fit mr-auto ml-auto md:mr-0">
         <button onClick={() => setActiveTab('ops')} className={`px-10 py-3 rounded-xl font-black text-xs transition-all ${activeTab === 'ops' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-500'}`}>ثبت تراکنش قطعی</button>
         <button onClick={() => setActiveTab('pending')} className={`px-10 py-3 rounded-xl font-black text-xs transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500'}`}>واریزی‌های مجهول (در انتظار)</button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Form Section */}
        {activeTab === 'ops' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-10">
             <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-50 pb-8 gap-4">
                <h3 className="text-2xl font-black text-slate-900">ثبت سند بانکی مشتری</h3>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                   <button onClick={() => setActiveMode(TransactionType.RESID)} className={`px-8 py-2 rounded-lg font-black text-xs transition-all ${activeMode === TransactionType.RESID ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>رسید</button>
                   <button onClick={() => setActiveMode(TransactionType.BOARD)} className={`px-8 py-2 rounded-lg font-black text-xs transition-all ${activeMode === TransactionType.BOARD ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>برد</button>
                </div>
             </div>

             <form className="grid grid-cols-1 md:grid-cols-2 gap-8 text-right">
                <div className="space-y-2 relative">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۱. مشتری</label>
                   <div className="relative">
                      <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                      <input type="text" className="w-full p-4 pr-12 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none text-right" placeholder="جستجو..." value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} />
                   </div>
                   {filteredCustomers.length > 0 && (
                     <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-48 overflow-y-auto">
                        {filteredCustomers.map(c => (
                          <button key={c.id} type="button" onClick={() => { setFormData({...formData, customerId: c.id}); setSearchCustomer(c.name); }} className="w-full p-4 text-right hover:bg-slate-50 font-bold border-b last:border-0">{c.name}</button>
                        ))}
                     </div>
                   )}
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۲. مبلغ ({activeBank.currency})</label>
                   <div className="relative">
                      <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-xl outline-none text-right pr-4" placeholder="قلم خرد برای مبالغ بالا" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۳. بانک ارسال کننده</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none text-right" placeholder="نام بانک مبدأ" value={formData.bankFrom} onChange={e => setFormData({...formData, bankFrom: e.target.value})} />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1 flex items-center gap-1"><CreditCard size={12}/> ۴. ۴ رقم کارت</label>
                   <input type="text" maxLength={4} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-center text-lg outline-none tabular-nums" placeholder="0000" value={formData.cardLastFour} onChange={e => setFormData({...formData, cardLastFour: e.target.value.replace(/\D/g, '')})} />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۵. شماره پیگیری / رفرنس</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold outline-none text-right" placeholder="Tracking ID" value={formData.trackingId} onChange={e => setFormData({...formData, trackingId: e.target.value})} />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest mr-1">۶. فیصدی کمیشن (کسر از مبلغ)</label>
                   <input type="number" step="0.01" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black outline-none text-right" placeholder="0.00" value={formData.commissionPercent || ''} onChange={e => setFormData({...formData, commissionPercent: Number(e.target.value)})} />
                </div>

                <div className="md:col-span-2 space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۷. توضیحات تکمیلی</label>
                   <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold min-h-[100px] outline-none text-right" placeholder="توضیحات..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>

                <div className="md:col-span-2 flex flex-col md:flex-row gap-4 pt-6">
                   <button type="button" onClick={(e) => handleSubmitTransaction(e, false)} className="flex-[2] bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-emerald-700 transition-all">تأیید و ثبت نهایی</button>
                   <button type="button" onClick={(e) => handleSubmitTransaction(e, true)} className="flex-1 bg-amber-500 text-white py-5 rounded-2xl font-black text-sm shadow-lg hover:bg-amber-600 transition-all">ثبت در مجهولین</button>
                </div>
             </form>
          </div>
        )}

        {/* Pending Deposits Section */}
        {activeTab === 'pending' && (
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 space-y-10 min-h-[400px] flex flex-col">
             <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-64">
                   <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                   <input 
                     type="text" 
                     placeholder="جستجو در مجهولین..." 
                     className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2 px-10 text-xs font-bold outline-none text-right"
                     value={searchPending}
                     onChange={e => setSearchPending(e.target.value)}
                   />
                </div>
                <div className="flex items-center gap-2">
                   <h3 className="text-xl font-black text-slate-900">واریزی‌های مجهول</h3>
                   <HelpCircle className="text-amber-500" size={20} />
                </div>
             </div>

             <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
                {pendingTransactions.length === 0 ? (
                  <div className="space-y-4 animate-in fade-in zoom-in duration-500">
                     <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                        <Check className="text-emerald-500" size={40} />
                     </div>
                     <p className="text-slate-400 font-bold text-sm">تمام واریزی‌ها تعیین تکلیف شده‌اند.</p>
                  </div>
                ) : (
                  <div className="w-full space-y-4">
                     {/* اگر واریزی وجود داشت در اینجا نمایش داده می‌شود */}
                     <p className="text-xs text-slate-400 italic">نمایش لیست واریزی‌های مجهول...</p>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* History Section */}
        <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-8 relative">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-slate-50 text-slate-400 rounded-lg"><List size={18} /></div>
                 <h3 className="text-xl font-black text-slate-900">تاریخچه تراکنش‌های بانک</h3>
              </div>
           </div>

           <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                 <thead>
                    <tr className="text-slate-400 border-b border-slate-50">
                       <th className="py-4 px-2 font-black text-right">طرف حساب</th>
                       <th className="py-4 px-2 font-black text-center">مبلغ</th>
                       <th className="py-4 px-2 font-black text-left pr-4">وضعیت</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-50">
                    {bankHistory.map(t => {
                      const customer = customers.find(c => c.id === t.customerId);
                      return (
                        <tr key={t.id} className="group hover:bg-slate-50/50 transition-all">
                           <td className="py-6 px-2">
                              <p className="font-black text-slate-800 text-sm">{customer?.name || 'مجهول / نامشخص'}</p>
                              <p className="text-[9px] text-slate-400 font-mono mt-1">{customer?.code || t.id.split('-')[1]}</p>
                           </td>
                           <td className="py-6 px-2 text-center">
                              <p className={`font-black text-sm tabular-nums ${t.type === TransactionType.RESID ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {t.amount.toLocaleString()}<span className="text-[9px] uppercase mr-1">{t.currency}</span>{t.type === TransactionType.RESID ? ' +' : ' -'}
                              </p>
                           </td>
                           <td className="py-6 px-2 text-left pr-4">
                              <span className={`px-4 py-1.5 rounded-xl font-black text-[10px] ${
                                t.status === TransactionStatus.APPROVED ? 'bg-emerald-50 text-emerald-600' : 
                                t.status === TransactionStatus.PENDING ? 'bg-amber-100 text-amber-700' : 'bg-rose-50 text-rose-600'
                              }`}>
                                 {t.status === TransactionStatus.APPROVED ? 'تأیید شده' : 
                                  t.status === TransactionStatus.PENDING ? 'انتظار' : 'رد شده'}
                              </span>
                           </td>
                        </tr>
                      );
                    })}
                    {bankHistory.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-20 text-center text-slate-300 italic font-bold">هیچ تراکنشی یافت نشد.</td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BankManager;