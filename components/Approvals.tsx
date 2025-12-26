
import React, { useMemo, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, ImageIcon, Mic, Play, Eye, Paperclip, Landmark, Coins } from 'lucide-react';
import { Transaction, TransactionStatus, Customer, Attachment, BankAccount } from '../types';

interface ApprovalsProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
}

const Approvals: React.FC<ApprovalsProps> = ({ transactions, setTransactions, customers, setCustomers, bankAccounts, setBankAccounts }) => {
  const [activeAttachment, setActiveAttachment] = useState<Attachment | null>(null);

  const pendingTransactions = useMemo(() => {
    return transactions.filter(t => t.status === TransactionStatus.PENDING)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [transactions]);

  const handleApprove = (transId: string) => {
    const transaction = transactions.find(t => t.id === transId);
    if (!transaction) return;

    // 1. Update Transaction Status
    setTransactions(prev => prev.map(t => 
      t.id === transId ? { ...t, status: TransactionStatus.APPROVED } : t
    ));

    // 2. Update Customer Balance
    if (transaction.customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === transaction.customerId) {
          const currentCurrencyBalance = c.balances[transaction.currency] || 0;
          const amountChange = transaction.type === 'رسید' ? transaction.amount : -transaction.amount;
          return { 
            ...c, 
            balances: {
              ...c.balances,
              [transaction.currency]: currentCurrencyBalance + amountChange
            }
          };
        }
        return c;
      }));
    }

    // 3. Update Bank Balance (if linked) - Otherwise it naturally stays in "Cash Box" stats
    if (transaction.bankAccountId) {
      setBankAccounts(prev => prev.map(b => {
        if (b.id === transaction.bankAccountId) {
          // If customer paid TO bank (Resid), bank balance increases.
          // If customer took FROM bank (Board), bank balance decreases.
          const amountChange = transaction.type === 'رسید' ? transaction.amount : -transaction.amount;
          return { ...b, balance: b.balance + amountChange };
        }
        return b;
      }));
    }
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
          <div className="p-4 bg-amber-50 text-amber-600 rounded-[1.5rem] shadow-inner">
            <Clock size={32} />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900">نظارت و تائیدات</h3>
            <p className="text-sm text-slate-500 mt-1 font-medium italic">مدیریت محترم، لطفاً اسناد و پیوست‌های تراکنش را قبل از تائید نهایی بررسی نمایید.</p>
          </div>
        </div>
        <div className="bg-amber-100/50 text-amber-700 px-8 py-4 rounded-3xl text-base font-black flex items-center gap-3 border border-amber-200">
          <AlertCircle size={20} /> {pendingTransactions.length} سند در صف تائید
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {pendingTransactions.length === 0 ? (
          <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-100 p-24 flex flex-col items-center justify-center text-slate-300">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <CheckCircle size={48} />
            </div>
            <p className="font-black text-xl text-slate-400">تمام اسناد روز جاری بررسی و تائید شده‌اند.</p>
          </div>
        ) : (
          pendingTransactions.map(t => {
            const customer = customers.find(c => c.id === t.customerId);
            const bank = bankAccounts.find(b => b.id === t.bankAccountId);
            return (
              <div key={t.id} className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col xl:flex-row gap-10 animate-in slide-in-from-bottom duration-400 relative overflow-hidden group">
                {/* Visual indicator for separation: Cash vs Bank */}
                <div className={`absolute left-0 top-0 bottom-0 w-3 ${bank ? 'bg-indigo-600' : 'bg-emerald-600'}`}></div>
                
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-6">
                    <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl shadow-lg ${
                      t.type === 'رسید' ? 'bg-emerald-50 text-emerald-600 shadow-emerald-100' : 'bg-rose-50 text-rose-600 shadow-rose-100'
                    }`}>
                      {t.type === 'رسید' ? '+' : '-'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xl font-black text-slate-900">{customer?.name}</h4>
                        {/* Fix: Landmark icon missing from lucide-react imports */}
                        {bank && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full font-black uppercase tracking-widest flex items-center gap-1">
                            <Landmark size={10} /> {bank.bankName}
                          </span>
                        )}
                        {/* Fix: Coins icon missing from lucide-react imports */}
                        {!bank && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-black uppercase tracking-widest flex items-center gap-1">
                            <Coins size={10} /> صندوق نقدی
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="font-black text-2xl text-slate-900">{t.amount.toLocaleString()}</span>
                        <span className="text-sm font-black text-slate-400 uppercase tracking-tighter">{t.currency}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100/80">
                    <p className="text-slate-600 text-sm leading-relaxed font-medium italic">
                      "{t.description || 'توضیحات برای این سند ثبت نشده است.'}"
                    </p>
                    {t.trackingId && (
                      <div className="mt-4 flex gap-4 text-[10px] font-black text-slate-400 uppercase">
                        <span>شماره پیگیری: {t.trackingId}</span>
                        {t.cardLastFour && <span>۴ رقم کارت: {t.cardLastFour}</span>}
                      </div>
                    )}
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="flex-1 lg:max-w-xs xl:max-w-none">
                  <h5 className="text-[10px] font-black text-slate-400 mb-5 uppercase tracking-widest flex items-center gap-2">
                    <Paperclip size={14} /> مستندات و پیوست‌های ضمیمه
                  </h5>
                  <div className="flex flex-wrap gap-4">
                    {t.attachments && t.attachments.length > 0 ? (
                      t.attachments.map((att) => (
                        <button 
                          key={att.id}
                          onClick={() => setActiveAttachment(att)}
                          className="w-24 h-24 rounded-[1.5rem] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center gap-2 hover:bg-white hover:shadow-xl hover:scale-105 transition-all relative overflow-hidden group/att"
                        >
                          {att.type === 'image' ? (
                            <img src={att.data} className="w-full h-full object-cover rounded-[1.5rem]" />
                          ) : (
                            <div className="flex flex-col items-center gap-1">
                              <Mic className="text-blue-500" size={24} />
                              <span className="text-[8px] font-black text-slate-400">صوت</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/att:opacity-100 rounded-[1.5rem] flex items-center justify-center backdrop-blur-sm transition-opacity">
                            {att.type === 'image' ? <Eye className="text-white" size={20} /> : <Play className="text-white" size={20} />}
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="w-full py-8 text-center text-slate-300 italic text-xs border-2 border-dashed border-slate-100 rounded-3xl">فاقد سند پیوست</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row xl:flex-col items-center gap-4 shrink-0 justify-center">
                  <button 
                    onClick={() => handleApprove(t.id)}
                    className="w-full sm:w-auto xl:w-full flex items-center justify-center gap-3 bg-slate-950 text-white px-10 py-5 rounded-3xl font-black text-base hover:bg-black shadow-2xl shadow-slate-200 transition-all active:scale-95 group/btn"
                  >
                    <CheckCircle size={22} className="group-hover/btn:scale-110 transition-transform" /> تائید نهایی سند
                  </button>
                  <button 
                    onClick={() => handleReject(t.id)}
                    className="w-full sm:w-auto xl:w-full flex items-center justify-center gap-3 bg-rose-50 text-rose-600 px-10 py-5 rounded-3xl font-bold text-base hover:bg-rose-100 transition-all"
                  >
                    <XCircle size={22} /> رد درخواست
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Attachment Preview Modal */}
      {activeAttachment && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[60] flex items-center justify-center p-6 sm:p-12">
          <div className="max-w-5xl w-full flex flex-col items-center gap-8 animate-in zoom-in duration-300">
            {activeAttachment.type === 'image' ? (
              <div className="relative group">
                <img src={activeAttachment.data} className="max-h-[75vh] w-auto rounded-[3rem] shadow-2xl border-4 border-white/20" />
                <div className="absolute top-6 right-6 p-4 bg-white/10 backdrop-blur-md rounded-2xl text-white text-[10px] font-black uppercase border border-white/20">رسید تراکنش</div>
              </div>
            ) : (
              <div className="bg-white p-16 rounded-[4rem] w-full max-w-md flex flex-col items-center gap-10 shadow-2xl border border-slate-100">
                <div className="w-32 h-32 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shadow-inner relative">
                  <div className="absolute inset-0 bg-indigo-400/20 rounded-full animate-ping"></div>
                  <Mic size={56} className="relative z-10" />
                </div>
                <div className="text-center">
                  <h3 className="text-2xl font-black text-slate-900">یادداشت صوتی پیوست</h3>
                  <p className="text-sm text-slate-400 mt-2 font-medium italic">پخش و بررسی محتوای صوتی ثبت شده توسط اپراتور</p>
                </div>
                <audio controls src={activeAttachment.data} className="w-full h-14 custom-audio-player" autoPlay />
              </div>
            )}
            <button 
              onClick={() => setActiveAttachment(null)}
              className="px-12 py-5 bg-white text-slate-900 rounded-3xl font-black text-lg hover:bg-slate-100 transition-all shadow-xl active:scale-95"
            >
              بستن و بازگشت
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Approvals;
