
import React, { useMemo, useState } from 'react';
import { 
  Percent, Calculator, TrendingUp, Wallet, Landmark, 
  ArrowUpRight, List, Clock, Coins, ChevronRight
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, Customer } from '../types';

interface CommissionManagerProps {
  transactions: Transaction[];
  customers: Customer[];
}

const CommissionManager: React.FC<CommissionManagerProps> = ({ transactions, customers }) => {
  // ماشین حساب کمیشن بر هر میلیون
  const [calcData, setCalcData] = useState({ amount: 0, ratePerMillion: 10000 });
  
  const calculatedCommission = useMemo(() => {
    if (calcData.amount <= 0 || calcData.ratePerMillion <= 0) return 0;
    return (calcData.amount / 1000000) * calcData.ratePerMillion;
  }, [calcData]);

  // استخراج تمام تراکنش‌های بانکی که دارای سود (کمیشن) هستند
  const commissionHistory = useMemo(() => {
    return transactions
      .filter(t => t.isBank && t.status === TransactionStatus.APPROVED && (t.netProfit || 0) > 0)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions]);

  // مجموع سود حاصل از کمیشن‌ها
  const totalCommissionProfit = useMemo(() => {
    return commissionHistory.reduce((sum, t) => sum + (t.netProfit || 0), 0);
  }, [commissionHistory]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-right font-['Vazirmatn']">
      
      {/* هدر و نمایش مجموع سود */}
      <div className="bg-slate-950 p-10 rounded-[3rem] text-white flex flex-col md:flex-row justify-between items-center gap-10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5"><Percent size={120} /></div>
        <div className="relative z-10 text-right">
           <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] mb-2">مجموع مفاد کمیشن‌های دریافتی</p>
           <h4 className="text-5xl font-black text-blue-400 tabular-nums">{totalCommissionProfit.toLocaleString()} <span className="text-sm">تومان</span></h4>
           <p className="text-[10px] text-slate-500 font-bold mt-4">این مبلغ مجموع تمام کمیشن‌های کسر شده از حواله‌های بانکی تائید شده است.</p>
        </div>
        <div className="relative z-10 flex gap-4">
           <div className="bg-white/5 border border-white/10 p-6 rounded-3xl text-center min-w-[150px]">
              <p className="text-[8px] font-black text-slate-500 uppercase mb-1">تعداد حواله‌ها</p>
              <p className="text-3xl font-black">{commissionHistory.length}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ماشین حساب کمیشن بر میلیون */}
        <div className="lg:col-span-5 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 space-y-8">
           <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
              <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg">
                <Calculator size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900">محاسبه‌گر کمیشن بر میلیون</h3>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Commission per Million Tool</p>
              </div>
           </div>

           <div className="space-y-6">
              <div className="space-y-2 text-right">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۱. مبلغ حواله (تومان)</label>
                 <input 
                    type="number" 
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black text-right outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all tabular-nums" 
                    placeholder="0" 
                    value={calcData.amount || ''} 
                    onChange={e => setCalcData({...calcData, amount: Number(e.target.value)})} 
                 />
              </div>

              <div className="space-y-2 text-right">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">۲. فیصدی/نرخ کمیشن بر هر میلیون</label>
                 <input 
                    type="number" 
                    className="w-full p-5 bg-slate-50 border border-slate-100 rounded-2xl text-2xl font-black text-right outline-none focus:bg-white focus:ring-4 focus:ring-blue-50 transition-all tabular-nums text-blue-600" 
                    placeholder="10000" 
                    value={calcData.ratePerMillion || ''} 
                    onChange={e => setCalcData({...calcData, ratePerMillion: Number(e.target.value)})} 
                 />
              </div>

              <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100 text-center">
                 <p className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] mb-3">کمیشن قابل دریافت:</p>
                 <div className="flex items-baseline justify-center gap-3">
                    <span className="text-4xl font-black text-blue-700 tabular-nums">{calculatedCommission.toLocaleString()}</span>
                    <span className="text-xs font-black text-blue-500 uppercase">تومان</span>
                 </div>
                 <p className="text-[9px] text-blue-400 font-bold mt-4 leading-relaxed italic">
                    فرمول: (مبلغ / ۱,۰۰۰,۰۰۰) × نرخ هر میلیون
                 </p>
              </div>
           </div>
        </div>

        {/* تاریخچه کمیشن‌ها */}
        <div className="lg:col-span-7 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col min-h-[500px]">
           <div className="flex justify-between items-center mb-10 border-b border-slate-50 pb-6">
              <div className="flex items-center gap-3">
                 <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl"><List size={20} /></div>
                 <h3 className="text-xl font-black text-slate-900">ریز جزئیات کمیشن‌های دریافتی</h3>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tabular-nums">{commissionHistory.length} مورد ثبت شده</span>
           </div>

           <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-4">
              {commissionHistory.map(t => {
                const customer = customers.find(c => c.id === t.customerId);
                return (
                  <div key={t.id} className="p-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] flex flex-col md:flex-row justify-between items-center gap-4 hover:bg-white hover:shadow-xl transition-all border-r-4 border-r-emerald-500">
                     <div className="flex items-center gap-5 text-right">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                           <TrendingUp size={24} />
                        </div>
                        <div className="text-right">
                           <p className="font-black text-slate-900">{customer?.name || 'مشتری نامشخص'}</p>
                           <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">
                              حواله: {t.amount.toLocaleString()} {t.currency} | {new Date(t.timestamp).toLocaleDateString('fa-IR')}
                           </p>
                        </div>
                     </div>
                     <div className="text-left bg-white px-6 py-3 rounded-2xl border border-slate-100">
                        <p className="text-[8px] font-black text-slate-400 uppercase mb-1">مفاد کمیشن:</p>
                        <p className="text-xl font-black text-emerald-600 tabular-nums">+{t.netProfit?.toLocaleString()} <span className="text-[10px] text-slate-400 uppercase">تومان</span></p>
                     </div>
                  </div>
                );
              })}
              {commissionHistory.length === 0 && (
                <div className="py-24 text-center text-slate-300 italic font-black flex flex-col items-center gap-4">
                   <Clock size={48} className="opacity-10" />
                   <p>هنوز هیچ کمیشنی در سیستم ثبت نهایی نشده است.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default CommissionManager;
