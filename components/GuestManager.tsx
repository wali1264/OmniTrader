
import React, { useState } from 'react';
import { 
  Zap, ArrowDownLeft, ArrowUpRight, Wallet, Landmark, 
  User, CheckCircle, CreditCard, Hash, FileText,
  AlertCircle
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, BankAccount } from '../types';

interface GuestManagerProps {
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  bankAccounts: BankAccount[];
}

const GuestManager: React.FC<GuestManagerProps> = ({ setTransactions, bankAccounts }) => {
  const [activeType, setActiveType] = useState<TransactionType>(TransactionType.RESID);
  const [isBank, setIsBank] = useState(false);
  
  const [formData, setFormData] = useState({
    guestName: '',
    amount: 0,
    currency: 'AFN',
    bankAccountId: '',
    trackingId: '',
    cardLastFour: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.guestName) {
      alert("لطفاً نام مشتری و مبلغ را وارد کنید.");
      return;
    }

    const transaction: Transaction = {
      id: 'WR-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      guestName: formData.guestName,
      type: activeType,
      amount: Number(formData.amount),
      currency: isBank ? (bankAccounts.find(b => b.id === formData.bankAccountId)?.currency || 'IRT_BANK') : formData.currency,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING,
      isBank: isBank,
      bankAccountId: isBank ? formData.bankAccountId : undefined,
      trackingId: formData.trackingId,
      cardLastFour: formData.cardLastFour,
      description: formData.description || `${activeType === TransactionType.RESID ? 'رسید' : 'برد'} مشتری راه‌روی (${formData.guestName})`,
    };

    setTransactions(prev => [...prev, transaction]);
    setFormData({
      guestName: '',
      amount: 0,
      currency: 'AFN',
      bankAccountId: '',
      trackingId: '',
      cardLastFour: '',
      description: ''
    });
    alert("تراکنش راه‌روی با موفقیت ثبت و به تائیدات ارسال شد.");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-entry">
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 text-white rounded-2xl shadow-lg">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-none">مشتری راه‌روی</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Walk-in Transaction</p>
          </div>
        </div>
        
        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
          <button 
            type="button"
            onClick={() => setActiveType(TransactionType.RESID)} 
            className={`px-5 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-2 ${activeType === TransactionType.RESID ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
            <ArrowDownLeft size={14} /> رسید
          </button>
          <button 
            type="button"
            onClick={() => setActiveType(TransactionType.BOARD)} 
            className={`px-5 py-2 rounded-lg font-black text-[11px] transition-all flex items-center gap-2 ${activeType === TransactionType.BOARD ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400'}`}>
            <ArrowUpRight size={14} /> برد
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6 text-right">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">نام کامل مشتری</label>
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                <input type="text" className="w-full p-4 pr-11 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" placeholder="نام مشتری..." value={formData.guestName} onChange={e => setFormData({...formData, guestName: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">مبلغ معامله</label>
              <div className="flex gap-2">
                <input type="number" className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-xl text-lg font-black outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all tnum" placeholder="0" value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} />
                {!isBank && (
                  <select className="w-24 p-4 bg-slate-100 rounded-xl font-black text-[11px] outline-none" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})}>
                    {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">نوع تسویه آنی</p>
            <div className="grid grid-cols-2 gap-3">
               <button type="button" onClick={() => setIsBank(false)} className={`py-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${!isBank ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                  <Wallet size={16} /> <span className="font-black text-[11px]">صندوق نقدی</span>
               </button>
               <button type="button" onClick={() => setIsBank(true)} className={`py-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${isBank ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-100 text-slate-400'}`}>
                  <Landmark size={16} /> <span className="font-black text-[11px]">واریز بانکی</span>
               </button>
            </div>
          </div>

          {isBank && (
            <div className="p-5 bg-blue-50/30 rounded-2xl border border-blue-100/50 space-y-4 fade-entry">
               <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest mr-1">انتخاب بانک مقصد</label>
                  <select className="w-full p-3.5 bg-white border border-blue-100 rounded-xl font-black text-[11px] outline-none" value={formData.bankAccountId} onChange={e => setFormData({...formData, bankAccountId: e.target.value})}>
                     <option value="">-- انتخاب بانک --</option>
                     {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.bankName} ({b.currency})</option>)}
                  </select>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-blue-600 uppercase mr-1">۴ رقم کارت</label>
                    <input type="text" maxLength={4} className="w-full p-3.5 bg-white border border-blue-100 rounded-xl font-black text-center text-sm tnum outline-none" placeholder="0000" value={formData.cardLastFour} onChange={e => setFormData({...formData, cardLastFour: e.target.value.replace(/\D/g, '')})} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-blue-600 uppercase mr-1">شماره پیگیری</label>
                    <input type="text" className="w-full p-3.5 bg-white border border-blue-100 rounded-xl font-black text-center text-sm outline-none" placeholder="Ref ID" value={formData.trackingId} onChange={e => setFormData({...formData, trackingId: e.target.value})} />
                  </div>
               </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">توضیحات تراکنش</label>
            <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-bold text-[11px] min-h-[80px] outline-none focus:bg-white transition-all" placeholder="شرح معامله..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>

          <button type="submit" className={`w-full py-4 rounded-xl font-black text-base text-white shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${activeType === TransactionType.RESID ? 'bg-emerald-600 shadow-emerald-900/10' : 'bg-rose-600 shadow-rose-900/10'}`}>
            <CheckCircle size={20} /> ثبت نهایی و صدور رسید
          </button>
        </form>
        
        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-center gap-2 opacity-30">
          <AlertCircle size={10} />
          <p className="text-[8px] font-bold">تراکنش‌های راه‌روی دفتر حساب دائمی ندارند و فقط در روزنامچه ثبت می‌شوند.</p>
        </div>
      </div>
    </div>
  );
};

export default GuestManager;
