
import React, { useState, useMemo } from 'react';
import { 
  Search, UserPlus, ArrowDownLeft, 
  CheckCircle, Info, Clock, Plus,
  UserCheck, Wallet, Coffee, AlertCircle, X, ShieldQuestion,
  Calendar, Check, HelpCircle
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, Customer, SUPPORTED_CURRENCIES } from '../types';

interface AnonymousDepositsProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
}

const AnonymousDeposits: React.FC<AnonymousDepositsProps> = ({ transactions, setTransactions, customers }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Transaction | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newAnon, setNewAnon] = useState({ amount: 0, currency: 'USD', trackingId: '', description: '', tag: 'unknown' });

  const anonymousList = useMemo(() => {
    return transactions.filter(t => !t.customerId && t.type === TransactionType.RESID && t.status !== TransactionStatus.REJECTED).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => c.name.includes(customerSearch) || c.code.includes(customerSearch));
  }, [customers, customerSearch]);

  const handleAddAnonymous = () => {
    if (newAnon.amount <= 0) return;
    const tagPrefix = newAnon.tag === 'ramadan' ? '🌙 [رمضان] ' : newAnon.tag === 'guest' ? '👤 [مهمان] ' : '';
    // Added isBank: false to satisfy Transaction interface requirements
    const transaction: Transaction = {
      id: 'ANON-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      type: TransactionType.RESID,
      amount: Number(newAnon.amount),
      currency: newAnon.currency,
      trackingId: newAnon.trackingId,
      description: `${tagPrefix}${newAnon.description || 'وجه نقد نامشخص'}`,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING,
      isBank: false
    };
    setTransactions(prev => [...prev, transaction]);
    setShowAddModal(false);
    setNewAnon({ amount: 0, currency: 'USD', trackingId: '', description: '', tag: 'unknown' });
  };

  const handleAssignToCustomer = (customer: Customer) => {
    if (!showAssignModal) return;
    setTransactions(prev => prev.map(t => t.id === showAssignModal.id ? { ...t, customerId: customer.id, description: `[تخصیص یافته] ${t.description}` } : t));
    setShowAssignModal(null);
    setCustomerSearch('');
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-amber-50 text-amber-600 rounded-[2rem]"><ShieldQuestion size={40} /></div>
          <div>
            <h3 className="text-3xl font-black text-slate-900">وجوه نامشخص صندوق</h3>
            <p className="text-sm text-slate-400 mt-2 font-medium">مدیریت مبالغ دریافتی که هنوز به حسابی تخصیص نیافته‌اند.</p>
          </div>
        </div>
        <button onClick={() => setShowAddModal(true)} className="bg-slate-950 text-white px-10 py-5 rounded-[1.5rem] font-black text-lg flex items-center gap-3">
          <Plus size={24} /> ثبت ورود نقد نامشخص
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {anonymousList.map(t => (
          <div key={t.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all overflow-hidden relative">
            <div className="absolute top-0 right-0 w-2 h-full bg-amber-400"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-4">شناسه سند: #{t.id.split('-')[1]}</p>
            <h4 className="text-3xl font-black text-slate-900">{t.amount.toLocaleString()} <span className="text-xs text-blue-600">{t.currency}</span></h4>
            <p className="text-xs text-slate-500 mt-4 italic min-h-[40px] leading-relaxed">"{t.description}"</p>
            <div className="mt-8">
              <button onClick={() => setShowAssignModal(t)} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2">
                <UserCheck size={16} /> تخصیص به مشتری
              </button>
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 text-right">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-xl shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3"><ShieldQuestion size={28} /> ثبت وجه نامشخص</h3>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="مبلغ" className="p-5 bg-slate-50 rounded-2xl text-xl font-black border border-slate-100" value={newAnon.amount || ''} onChange={e => setNewAnon({...newAnon, amount: Number(e.target.value)})} />
                <select className="p-5 bg-slate-50 rounded-2xl font-black border border-slate-100" value={newAnon.currency} onChange={e => setNewAnon({...newAnon, currency: e.target.value})}>
                  {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
              </div>
              <textarea placeholder="توضیحات یا نشانه..." className="w-full p-5 bg-slate-50 rounded-2xl text-sm font-bold min-h-[100px] border border-slate-100" value={newAnon.description} onChange={e => setNewAnon({...newAnon, description: e.target.value})} />
              <button onClick={handleAddAnonymous} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-xl">ارسال به اتاق انتظار</button>
              <button onClick={() => setShowAddModal(false)} className="w-full text-slate-400 font-bold">لغو</button>
            </div>
          </div>
        </div>
      )}

      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-50 flex items-center justify-center p-4 text-right">
          <div className="bg-white rounded-[3.5rem] p-12 w-full max-w-3xl h-[80vh] flex flex-col">
            <h3 className="text-3xl font-black mb-8">انتخاب صاحب وجه</h3>
            <input type="text" placeholder="جستجوی نام مشتری..." className="w-full bg-slate-50 p-6 rounded-3xl mb-6 font-bold" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
            <div className="flex-1 overflow-y-auto space-y-3">
              {filteredCustomers.map(c => (
                <button key={c.id} onClick={() => handleAssignToCustomer(c)} className="w-full p-6 bg-slate-50 rounded-3xl flex justify-between items-center hover:bg-blue-600 hover:text-white transition-all">
                  <span className="font-black">{c.name}</span>
                  <span className="text-[10px] font-bold">کد: {c.code}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setShowAssignModal(null)} className="mt-6 text-slate-400 font-black">بستن</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnonymousDeposits;
