
import React, { useMemo, useState } from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Transaction, TransactionStatus, Customer, Attachment, BankAccount, TransactionType } from '../types';

interface ApprovalsProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
}

const Approvals: React.FC<ApprovalsProps> = ({ transactions, setTransactions, customers, setCustomers, bankAccounts, setBankAccounts }) => {
  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => t.status === TransactionStatus.PENDING)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [transactions]);

  const handleApprove = (transId: string) => {
    // برای جلوگیری از محاسبه مضاعف، ما فقط وضعیت تراکنش را به APPROVED تغییر می‌دهیم.
    // محاسبات مانده در هر لحظه توسط کامپوننت‌ها از روی لیست تراکنش‌های APPROVED انجام می‌شود.
    setTransactions(prev => prev.map(t => 
      t.id === transId ? { ...t, status: TransactionStatus.APPROVED } : t
    ));
  };

  const handleReject = (transId: string) => {
    if (confirm('آیا از رد این تراکنش مطمئن هستید؟')) {
      setTransactions(prev => prev.map(t => 
        t.id === transId ? { ...t, status: TransactionStatus.REJECTED } : t
      ));
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-[1.5rem]">
            <Clock size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">نظارت و تائیدات</h3>
            <p className="text-sm text-slate-500 mt-1 font-medium">بررسی اسناد تبادل، رسیدها و حوالجات بانکی قبل از ثبت نهایی.</p>
          </div>
        </div>
        <div className="bg-amber-100/50 text-amber-700 px-8 py-4 rounded-3xl text-base font-black border border-amber-200">
          {pendingTransactions.length} سند منتظر بررسی
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {pendingTransactions.length === 0 ? (
          <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-24 flex flex-col items-center justify-center text-slate-300">
            <CheckCircle size={48} className="mb-4 text-emerald-500" />
            <p className="font-black text-xl">تمام اسناد تائید شده‌اند.</p>
          </div>
        ) : (
          pendingTransactions.map(t => {
            const customer = customers.find(c => c.id === t.customerId);
            return (
              <div key={t.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-10 relative overflow-hidden group">
                <div className={`absolute left-0 top-0 bottom-0 w-3 ${t.type === TransactionType.EXCHANGE ? 'bg-blue-600' : 'bg-emerald-600'}`}></div>
                
                <div className="flex-1 space-y-6 text-right">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-lg ${
                      t.type === TransactionType.EXCHANGE ? 'bg-blue-50 text-blue-600' :
                      t.type === TransactionType.RESID ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {t.type === TransactionType.EXCHANGE ? '🔁' : t.type === TransactionType.RESID ? '+' : '-'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-black text-slate-900">{customer?.name || 'مشتری ناشناس'}</h4>
                        <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase ${t.type === TransactionType.EXCHANGE ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                           {t.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {t.type === TransactionType.EXCHANGE ? (
                          <div className="flex items-center gap-3">
                             <span className="font-black text-xl text-rose-600">{t.amount.toLocaleString()} {t.currency}</span>
                             <span className="text-slate-400">⬅</span>
                             <span className="font-black text-xl text-emerald-600">{t.convertedAmount?.toLocaleString()} {t.targetCurrency}</span>
                          </div>
                        ) : (
                          <>
                             <span className="font-black text-2xl text-slate-900">{t.amount.toLocaleString()}</span>
                             <span className="text-sm font-black text-slate-400 uppercase">{t.currency}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/80">
                    <p className="text-slate-600 text-sm font-medium italic">"{t.description}"</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-4 justify-center">
                  <button onClick={() => handleApprove(t.id)} className="w-full bg-slate-950 text-white px-10 py-5 rounded-3xl font-black text-base hover:bg-black transition-all">تائید سند</button>
                  <button onClick={() => handleReject(t.id)} className="w-full bg-rose-50 text-rose-600 px-10 py-5 rounded-3xl font-bold text-base hover:bg-rose-100">رد سند</button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Approvals;
