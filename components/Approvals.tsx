import React, { useMemo, useState } from 'react';
import { CheckCircle, Clock, ShieldAlert } from 'lucide-react';
import { Transaction, TransactionStatus, Customer, TransactionType } from '../types';

interface ApprovalsProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const Approvals: React.FC<ApprovalsProps> = ({ transactions, setTransactions, customers, setCustomers }) => {
  // تنها تراکنش‌هایی که مشتری مشخص دارند (یا مهمان هستند) برای تائید نهایی نمایش داده می‌شوند
  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => 
      t.status === TransactionStatus.PENDING && 
      (t.customerId || t.guestName || t.isWalkin) // مجهولین فیلتر می‌شوند
    ).sort((a, b) => a.timestamp - b.timestamp);
  }, [transactions]);

  const handleApprove = (transId: string) => {
    setTransactions(prev => prev.map(t => t.id === transId ? { ...t, status: TransactionStatus.APPROVED } : t));
  };

  const handleReject = (transId: string) => {
    if (confirm('آیا از رد این تراکنش مطمئن هستید؟')) {
      setTransactions(prev => prev.map(t => t.id === transId ? { ...t, status: TransactionStatus.REJECTED } : t));
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 font-['Vazirmatn'] text-right" dir="rtl">
      <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-[1.5rem] shadow-inner"><Clock size={32} /></div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">نظارت و تائیدات نهایی</h3>
            <p className="text-sm text-slate-500 mt-1 font-medium italic">بررسی اسناد ثبت شده توسط اپراتورها جهت ثبت قطعی در دفاتر.</p>
          </div>
        </div>
        <div className="bg-slate-900 text-white px-8 py-4 rounded-3xl text-base font-black border border-slate-800 shadow-xl flex items-center gap-3">
          {pendingTransactions.length} سند آماده تائید
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {pendingTransactions.length === 0 ? (
          <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-24 flex flex-col items-center justify-center text-slate-300 gap-6">
            <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500"><CheckCircle size={64} /></div>
            <div className="text-center">
               <p className="font-black text-2xl text-slate-400">تمام اسناد تعیین تکلیف شده‌اند.</p>
               <p className="text-xs font-bold text-slate-300 mt-2 uppercase tracking-widest italic">All queue is clear</p>
            </div>
          </div>
        ) : (
          pendingTransactions.map(t => {
            const customer = customers.find(c => c.id === t.customerId);
            const displayName = customer?.name || t.guestName || 'سند تصفیه بازار';
            return (
              <div key={t.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-10 relative overflow-hidden group hover:shadow-2xl transition-all">
                <div className={`absolute left-0 top-0 bottom-0 w-3 ${t.type === TransactionType.RESID ? 'bg-emerald-600' : 'bg-rose-600'}`}></div>
                <div className="flex-1 space-y-6 text-right">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-lg ${t.type === TransactionType.RESID ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                       {t.type === TransactionType.RESID ? '+' : '-'}
                    </div>
                    <div className="text-right">
                      <h4 className="text-xl font-black text-slate-900">{displayName} <span className="text-[10px] text-slate-400 font-bold mr-2 opacity-50">#{t.id.split('-').pop()}</span></h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-black text-2xl text-slate-900 tabular-nums">{t.amount.toLocaleString()}</span>
                        <span className="text-sm font-black text-blue-600 uppercase tracking-widest">{t.currency}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/80">
                    <p className="text-slate-600 text-sm font-bold leading-relaxed italic text-right">"{t.description}"</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-4 justify-center shrink-0">
                  <button onClick={() => handleApprove(t.id)} className="w-full bg-slate-950 text-white px-10 py-5 rounded-3xl font-black text-base hover:bg-black transition-all shadow-xl shadow-slate-900/10">تائید و ثبت نهایی</button>
                  <button onClick={() => handleReject(t.id)} className="w-full bg-rose-50 text-rose-600 px-10 py-5 rounded-3xl font-bold text-base hover:bg-rose-100 transition-all">رد درخواست</button>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* راهنمای بصری مجهولین */}
      <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 flex items-center gap-4 text-blue-900">
         <ShieldAlert size={20} className="shrink-0" />
         <p className="text-xs font-bold leading-relaxed">
            <strong>نکته تائیدات:</strong> واریزی‌های مجهول (بدون نام) تا زمانی که در بخش مدیریت بانک توسط صندوقدار به یک مشتری «تخصیص» داده نشوند، در این لیست نمایش داده نخواهند شد.
         </p>
      </div>
    </div>
  );
};

export default Approvals;