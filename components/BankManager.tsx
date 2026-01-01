
import React, { useState, useMemo } from 'react';
import { Landmark, Plus, RefreshCw, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { BankAccount, Transaction, TransactionType, TransactionStatus, Customer } from '../types';

interface BankManagerProps {
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
}

const BankManager: React.FC<BankManagerProps> = ({ bankAccounts, setBankAccounts, transactions, setTransactions, customers }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBankTransModal, setShowBankTransModal] = useState(false);
  const [activeBank, setActiveBank] = useState<BankAccount | null>(null);

  const [newBank, setNewBank] = useState({ name: '', number: '', balance: 0, currency: 'IRT_BANK' });
  const [bankTrans, setBankTrans] = useState({
    type: TransactionType.RESID,
    amount: 0,
    destBankId: '',
    sourceId: '',
    phoneLastFour: '',
    cardLastFour: '',
    trackingId: '',
    description: ''
  });

  // محاسبه موجودی لحظه‌ای هر بانک (مانده اولیه + تغییرات تائید شده)
  const bankBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    bankAccounts.forEach(bank => {
      const approved = transactions.filter(t => t.bankAccountId === bank.id && t.status === TransactionStatus.APPROVED);
      const resid = approved.filter(t => t.type === TransactionType.RESID).reduce((sum, t) => sum + t.amount, 0);
      const board = approved.filter(t => t.type === TransactionType.BOARD).reduce((sum, t) => sum + t.amount, 0);
      balances[bank.id] = bank.balance + resid - board;
    });
    return balances;
  }, [bankAccounts, transactions]);

  const handleAddBank = () => {
    const account: BankAccount = {
      id: Math.random().toString(36).substr(2, 9),
      bankName: newBank.name,
      accountNumber: newBank.number,
      balance: Number(newBank.balance),
      currency: newBank.currency
    };
    setBankAccounts(prev => [...prev, account]);
    setShowAddModal(false);
    setNewBank({ name: '', number: '', balance: 0, currency: 'IRT_BANK' });
  };

  const handleSubmitBankTrans = () => {
    if (!activeBank) return;
    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: bankTrans.type,
      amount: Number(bankTrans.amount),
      currency: activeBank.currency,
      bankAccountId: activeBank.id,
      trackingId: bankTrans.trackingId,
      cardLastFour: bankTrans.cardLastFour,
      description: bankTrans.description || `تراکنش بانکی ${activeBank.bankName}`,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING
    };
    setTransactions(prev => [...prev, transaction]);
    setShowBankTransModal(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">حسابات بانکی ایران</h3>
        <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
          <Plus size={20} /> حساب جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {bankAccounts.map(account => (
          <div key={account.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative group">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
            <div className="flex justify-between mb-6">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Landmark size={24} /></div>
              <button onClick={() => { setActiveBank(account); setShowBankTransModal(true); }} className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold">برد و رسید</button>
            </div>
            <h4 className="text-xl font-bold text-slate-800">{account.bankName}</h4>
            <p className="text-sm text-slate-400 font-mono mb-6">{account.accountNumber}</p>
            <div className="border-t pt-6 flex justify-between items-end">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">موجودی فعلی</p>
                <h5 className="text-2xl font-black text-slate-900">{(bankBalances[account.id] || 0).toLocaleString()}</h5>
              </div>
              <span className="text-xs font-black text-blue-600 uppercase">{account.currency}</span>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-6">ثبت حساب بانکی جدید</h3>
            <div className="space-y-4">
              <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="نام بانک" onChange={(e) => setNewBank({...newBank, name: e.target.value})} />
              <input type="text" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="شماره حساب" onChange={(e) => setNewBank({...newBank, number: e.target.value})} />
              <input type="number" className="w-full p-3 bg-slate-50 border rounded-xl" placeholder="موجودی اولیه" onChange={(e) => setNewBank({...newBank, balance: Number(e.target.value)})} />
              <button onClick={handleAddBank} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold">ثبت حساب</button>
              <button onClick={() => setShowAddModal(false)} className="w-full py-2 text-slate-400">لغو</button>
            </div>
          </div>
        </div>
      )}

      {showBankTransModal && activeBank && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-right">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl">
            <h3 className="text-xl font-black mb-6">تراکنش بانکی: {activeBank.bankName}</h3>
            <div className="space-y-5">
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button onClick={() => setBankTrans({...bankTrans, type: TransactionType.RESID})} className={`flex-1 py-3 rounded-xl font-bold ${bankTrans.type === TransactionType.RESID ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>رسید (+)</button>
                <button onClick={() => setBankTrans({...bankTrans, type: TransactionType.BOARD})} className={`flex-1 py-3 rounded-xl font-bold ${bankTrans.type === TransactionType.BOARD ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>برد (-)</button>
              </div>
              <input type="number" placeholder="مبلغ تراکنش" className="w-full p-4 bg-slate-50 rounded-2xl text-xl font-black outline-none" onChange={(e) => setBankTrans({...bankTrans, amount: Number(e.target.value)})} />
              <input type="text" placeholder="شماره پیگیری" className="w-full p-4 bg-slate-50 rounded-2xl text-sm" onChange={(e) => setBankTrans({...bankTrans, trackingId: e.target.value})} />
              <textarea placeholder="توضیحات..." className="w-full p-4 bg-slate-50 rounded-2xl text-sm" onChange={(e) => setBankTrans({...bankTrans, description: e.target.value})} />
              <button onClick={handleSubmitBankTrans} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black">ثبت و ارسال جهت تائید</button>
              <button onClick={() => setShowBankTransModal(false)} className="w-full py-2 text-slate-400">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankManager;
