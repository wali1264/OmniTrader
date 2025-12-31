
import React, { useState, useMemo } from 'react';
import { 
  HelpCircle, Search, UserPlus, ArrowDownLeft, 
  Trash2, Landmark, CheckCircle, Info, Clock, Plus
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, Customer, BankAccount, SUPPORTED_CURRENCIES } from '../types';

interface AnonymousDepositsProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  bankAccounts: BankAccount[];
  customers: Customer[];
}

const AnonymousDeposits: React.FC<AnonymousDepositsProps> = ({ transactions, setTransactions, bankAccounts, customers }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState<Transaction | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  
  const [newAnon, setNewAnon] = useState({
    amount: 0,
    currency: 'IRT_BANK',
    bankId: '',
    trackingId: '',
    description: ''
  });

  const anonymousList = useMemo(() => {
    return transactions.filter(t => 
      !t.customerId && 
      t.type === TransactionType.RESID && 
      t.status !== TransactionStatus.REJECTED
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.includes(customerSearch) || 
      c.code.includes(customerSearch)
    );
  }, [customers, customerSearch]);

  const handleAddAnonymous = () => {
    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: TransactionType.RESID,
      amount: Number(newAnon.amount),
      currency: newAnon.currency,
      bankAccountId: newAnon.bankId,
      trackingId: newAnon.trackingId,
      description: newAnon.description || 'واریزی ناشناس - در انتظار تعیین مشتری',
      timestamp: Date.now(),
      status: TransactionStatus.PENDING // Remains pending until assigned and manager approves or auto-approved
    };

    setTransactions(prev => [...prev, transaction]);
    setShowAddModal(false);
    setNewAnon({ amount: 0, currency: 'IRT_BANK', bankId: '', trackingId: '', description: '' });
  };

  const handleAssignToCustomer = (customerId: string) => {
    if (!showAssignModal) return;

    setTransactions(prev => prev.map(t => 
      t.id === showAssignModal.id 
        ? { ...t, customerId: customerId, description: `${t.description} (منتقل شده به حساب مشتری)` } 
        : t
    ));
    
    setShowAssignModal(null);
    setCustomerSearch('');
    alert('تراکنش با موفقیت به حساب مشتری منتقل شد. اکنون در لیست تائیدات نهایی قابل مشاهده است.');
  };

  const handleRejectAnonymous = (id: string) => {
    if (confirm('آیا از حذف این واریزی ناشناس اطمینان دارید؟')) {
      setTransactions(prev => prev.map(t => 
        t.id === id ? { ...t, status: TransactionStatus.REJECTED } : t
      ));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header Section */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-[1.5rem]">
            <HelpCircle size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">واریزی‌های ناشناس (Suspense)</h3>
            <p className="text-sm text-slate-400 mt-1 font-medium italic">مدیریت وجوه دریافتی بانکی که فرستنده آن‌ها هنوز شناسایی نشده است.</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm hover:bg-black transition-all shadow-xl shadow-slate-100 flex items-center gap-2"
        >
          <Plus size={20} /> ثبت واریزی ناشناس جدید
        </button>
      </div>

      {/* Main List Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-slate-400 border-b border-slate-100">
                <th className="py-6 px-10 font-black text-[10px] uppercase tracking-widest">زمان ثبت</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest">بانک مقصد</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest">مبلغ واریزی</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest">شماره پیگیری</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest">توضیحات موقت</th>
                <th className="py-6 px-10 font-black text-[10px] uppercase tracking-widest text-center">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {anonymousList.map(t => {
                const bank = bankAccounts.find(b => b.id === t.bankAccountId);
                return (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="py-7 px-10 text-slate-400 font-mono text-xs">
                       <div className="flex items-center gap-2">
                          <Clock size={12} />
                          {new Date(t.timestamp).toLocaleDateString('fa-IR')} - {new Date(t.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                       </div>
                    </td>
                    <td className="py-7 px-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Landmark size={14} /></div>
                        <span className="font-bold text-slate-700">{bank?.bankName || 'نامشخص'}</span>
                      </div>
                    </td>
                    <td className="py-7 px-4 font-black text-lg text-emerald-600">
                      {t.amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-black">{t.currency}</span>
                    </td>
                    <td className="py-7 px-4 font-mono text-xs font-bold text-slate-500">
                      {t.trackingId || '---'}
                    </td>
                    <td className="py-7 px-4 text-slate-500 font-medium italic">
                      {t.description}
                    </td>
                    <td className="py-7 px-10 text-center">
                       <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => setShowAssignModal(t)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-1.5"
                          >
                             <UserPlus size={14} /> تعیین مشتری
                          </button>
                          <button 
                            onClick={() => handleRejectAnonymous(t.id)}
                            className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          >
                             <Trash2 size={18} />
                          </button>
                       </div>
                    </td>
                  </tr>
                );
              })}
              {anonymousList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                       <div className="p-6 bg-slate-50 rounded-full mb-4">
                         <CheckCircle size={48} strokeWidth={1.5} />
                       </div>
                       <p className="font-black text-lg">لیست واریزی‌های ناشناس خالی است.</p>
                       <p className="text-sm font-medium italic mt-1">تمام وجوه دریافتی شناسایی و تعیین تکلیف شده‌اند.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Banner */}
      <div className="flex items-center gap-3 bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100">
        <div className="p-2 bg-amber-500 text-white rounded-xl"><Info size={18} /></div>
        <p className="text-xs text-amber-800 font-medium leading-relaxed">
           <strong>راهنمای حساب معلق:</strong> وجوهی که به بانک واریز می‌شوند اما رسید ندارند یا مشتری آن‌ها نامشخص است در این بخش ثبت کنید. این وجوه تا زمان تعیین مشتری به موجودی بانک اضافه می‌شوند اما در تراز هیچ مشتری محاسبه نخواهند شد.
        </p>
      </div>

      {/* MODAL: Add Anonymous Deposit */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-8 flex items-center gap-3">
               <ArrowDownLeft size={24} className="text-emerald-600" /> ثبت واریزی نامشخص
            </h3>
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">مبلغ واریزی</label>
                   <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl text-lg font-black outline-none" placeholder="0" onChange={(e) => setNewAnon({...newAnon, amount: Number(e.target.value)})} />
                 </div>
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">واحد پول</label>
                   <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" value={newAnon.currency} onChange={(e) => setNewAnon({...newAnon, currency: e.target.value})}>
                     {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                   </select>
                 </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">بانک مقصد (ایران)</label>
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none" onChange={(e) => setNewAnon({...newAnon, bankId: e.target.value})}>
                  <option value="">انتخاب حساب بانکی...</option>
                  {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">شماره پیگیری (Ref No)</label>
                <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold font-mono outline-none" placeholder="کد رهگیری بانکی" onChange={(e) => setNewAnon({...newAnon, trackingId: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">توضیحات یا نام احتمالی</label>
                <textarea className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-medium min-h-[80px] outline-none" placeholder="مثلاً: واریزی ساعت ۱۰ صبح - احتمالا آقای ..." onChange={(e) => setNewAnon({...newAnon, description: e.target.value})} />
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={handleAddAnonymous} className="flex-[2] bg-slate-900 text-white py-5 rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">ثبت در حساب معلق</button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black">لغو</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Assign Customer */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
            <h3 className="text-2xl font-black text-slate-900 mb-2">تعیین صاحب واریزی</h3>
            <p className="text-sm text-slate-400 mb-8 font-medium">مبلغ <span className="text-emerald-600 font-black">{showAssignModal.amount.toLocaleString()} {showAssignModal.currency}</span> را به حساب کدام مشتری منتقل می‌کنید؟</p>
            
            <div className="relative mb-6">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="جستجوی نام یا کد مشتری..." 
                className="w-full p-4 pr-12 bg-slate-50 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={customerSearch}
                onChange={e => setCustomerSearch(e.target.value)}
                autoFocus
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredCustomers.map(c => (
                <button 
                  key={c.id} 
                  onClick={() => handleAssignToCustomer(c.id)}
                  className="w-full p-5 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent rounded-2xl flex justify-between items-center group transition-all"
                >
                  <div className="text-right">
                    <p className="font-black text-slate-800 group-hover:text-blue-700">{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{c.code}</p>
                  </div>
                  <CheckCircle size={20} className="text-slate-200 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
              {filteredCustomers.length === 0 && (
                <div className="py-10 text-center text-slate-300 font-medium">مشتری یافت نشد.</div>
              )}
            </div>

            <div className="mt-8 flex gap-4">
              <button onClick={() => setShowAssignModal(null)} className="w-full bg-slate-100 text-slate-500 py-5 rounded-2xl font-black text-lg">بستن پنجره</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AnonymousDeposits;
