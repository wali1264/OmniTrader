import React, { useState, useMemo } from 'react';
import { 
  Landmark, Plus, ArrowDownLeft, ArrowUpRight, 
  Search, X, CreditCard, ArrowLeft, 
  ChevronRight, List, CheckCircle, Clock, UserPlus, HelpCircle, ArrowRightLeft, Save, Percent
} from 'lucide-react';
import { BankAccount, Transaction, TransactionType, TransactionStatus, Customer, SUPPORTED_CURRENCIES } from '../types';

const getSystemNow = () => Date.now();

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

  const filteredCustomers = useMemo(() => {
    const term = searchCustomer.trim();
    if (!term) return [];
    return customers.filter(c => c.name.includes(term) || c.code.includes(term));
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

  const handleSubmitTransaction = (e: React.FormEvent, isPending: boolean = false) => {
    e.preventDefault();
    if (!activeBank || formData.amount <= 0) return;
    if (!isPending && !formData.customerId) {
        alert("برای رسید قطعی انتخاب مشتری الزامی است.");
        return;
    }

    const commissionAmount = (formData.amount * (formData.commissionPercent || 0)) / 100;
    const finalAmount = activeMode === TransactionType.RESID ? (formData.amount - commissionAmount) : formData.amount;

    const transaction: Transaction = {
      id: 'BT-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      customerId: isPending ? undefined : formData.customerId,
      type: activeMode,
      amount: Number(finalAmount),
      netProfit: commissionAmount,
      currency: activeBank.currency,
      bankAccountId: activeBank.id,
      isBank: true,
      bankFrom: formData.bankFrom,
      bankTo: activeBank.bankName,
      cardLastFour: formData.cardLastFour,
      trackingId: formData.trackingId,
      description: formData.description || (isPending ? `واریزی مجهول` : `رسید بانکی مشتری`),
      timestamp: getSystemNow(),
      status: TransactionStatus.PENDING
    };

    setTransactions(prev => [...prev, transaction]);
    setFormData({ amount: 0, customerId: '', bankFrom: '', cardLastFour: '', trackingId: '', commissionPercent: 0, description: '' });
    setSearchCustomer('');
    if (isPending) setActiveTab('pending');
    alert(isPending ? "به لیست مجهولین اضافه شد." : "سند ثبت و به تائیدات ارسال شد.");
  };

  if (!activeBank) {
    return (
      <div className="space-y-10 animate-in fade-in duration-500">
        <div className="flex justify-between items-center bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
           <div>
              <h2 className="text-3xl font-black text-slate-900">مدیریت حسابات بانکی</h2>
              <p className="text-sm text-slate-400 mt-2 font-medium italic">یک حساب را برای شروع انتخاب کنید.</p>
           </div>
           <button onClick={() => setShowAddBankModal(true)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl">
              <Plus size={20} /> افزودن حساب بانکی
           </button>
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
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-left duration-500 pb-20">
      <div className="flex items-center gap-6">
         <button onClick={() => setActiveBank(null)} className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-blue-600 transition-all shadow-sm">
            <ArrowLeft size={24} />
         </button>
         <div className="flex-1 bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 relative">
            <div className="flex items-center gap-6">
               <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg"><Landmark size={28} /></div>
               <div className="text-right">
                  <h2 className="text-2xl font-black text-slate-900">{activeBank.bankName}</h2>
                  <p className="text-xs font-mono text-slate-400 font-bold tracking-widest">{activeBank.accountNumber}</p>
               </div>
            </div>
            <div className="bg-slate-950 px-8 py-4 rounded-2xl text-white text-center">
               <p className="text-[9px] font-black text-slate-500 uppercase mb-1">موجودی کل:</p>
               <div className="flex items-baseline justify-center gap-2">
                  <span className="text-2xl font-black">{currentBankBalance.toLocaleString()}</span>
                  <span className="text-[10px] font-black text-blue-400">{activeBank.currency}</span>
               </div>
            </div>
         </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 max-w-md">
         <button onClick={() => setActiveTab('ops')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${activeTab === 'ops' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400'}`}>تراکنش قطعی</button>
         <button onClick={() => setActiveTab('pending')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${activeTab === 'pending' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-400'}`}>مجهولین</button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
         {activeTab === 'ops' ? (
            <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
                <form onSubmit={(e) => handleSubmitTransaction(e, false)} className="space-y-6 text-right">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5 relative">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">۱. مشتری</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold outline-none" placeholder="نام مشتری..." value={searchCustomer} onChange={e => setSearchCustomer(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">۲. مبلغ</label>
                            <input type="number" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-base font-bold outline-none" placeholder="0" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-5 rounded-2xl font-black text-white text-lg bg-blue-600 shadow-xl">ثبت تراکنش</button>
                </form>
            </div>
         ) : null}
      </div>
    </div>
  );
};

export default BankManager;