
import React, { useState, useMemo } from 'react';
import { 
  Briefcase, ArrowDownLeft, ArrowUpRight, 
  Search, CheckCircle, Wallet, Printer as PrintIcon, TrendingUp
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, User as SystemUser, Customer } from '../types';

interface CashBoxManagerProps {
  transactions: Transaction[];
  stats: {
    cashBox: Record<string, number>;
  };
  currentUser: SystemUser | null;
  customers: Customer[];
  shopName: string;
}

const CashBoxManager: React.FC<CashBoxManagerProps> = ({ transactions, stats, currentUser, customers, shopName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<Transaction | null>(null);

  const cashMovements = useMemo(() => {
    return transactions.filter(t => 
      t.status === TransactionStatus.APPROVED &&
      !t.isBank && 
      (
        (t.customerId && customers.find(c => c.id === t.customerId)?.name.includes(searchTerm)) || 
        (t.guestName && t.guestName.includes(searchTerm)) ||
        t.description.includes(searchTerm)
      )
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, searchTerm, customers]);

  // اصلاح: محاسبه مفاد نقدی شامل معاملات تبادله و همچنین تصفیه سود راه‌روی
  const cashProfit = useMemo(() => {
    return cashMovements
      .filter(t => t.type === TransactionType.EXCHANGE || (t.isWalkin && t.netProfit !== undefined))
      .reduce((sum, t) => sum + (t.netProfit || 0), 0);
  }, [cashMovements]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 print:p-0 print:bg-white text-right font-['Vazirmatn']">
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
        <div className="lg:col-span-1 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-6 opacity-10"><Briefcase size={80} /></div>
           <div className="relative z-10 text-right">
              <h3 className="text-xl font-black mb-1">Drawer (صندوق نقد)</h3>
              <div className="mt-8">
                 <p className="text-[10px] text-slate-500 mb-1">صندوقدار فعلی:</p>
                 <p className="font-black text-blue-400">{currentUser?.fullName}</p>
              </div>
           </div>
        </div>

        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-right">
           <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Wallet size={14} className="text-blue-500" /> موجودی لحظه‌ای فیزیکی صندوق (بدون بانک)
              </h4>
              <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 flex items-center gap-3">
                <div className="text-right">
                  <span className="block text-[8px] font-black text-emerald-600 uppercase">مفاد نقدینگی امروز</span>
                  <span className="block text-sm font-black text-emerald-700 tnum">{cashProfit.toLocaleString()} <span className="text-[9px]">AFN</span></span>
                </div>
                <div className="p-1.5 bg-emerald-500 text-white rounded-lg"><TrendingUp size={14} /></div>
              </div>
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {SUPPORTED_CURRENCIES.map(curr => (
                <div key={curr.code} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{curr.label}</p>
                  <p className="text-sm font-black text-slate-900 tnum">{(stats.cashBox[curr.code] || 0).toLocaleString()}</p>
                </div>
              ))}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        <div className="xl:col-span-2 space-y-6 print:hidden">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <div className="flex justify-between items-center mb-8">
                <div className="text-right">
                   <h3 className="text-xl font-black text-slate-900">روزنامچه اختصاصی صندوق (فقط نقد)</h3>
                   <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Only Cash Transactions</p>
                </div>
                <div className="relative">
                   <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                   <input 
                     type="text" 
                     placeholder="جستجو در نقدی..." 
                     className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 pr-12 pl-4 text-[11px] font-bold outline-none focus:bg-white transition-all text-right" 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>

             <div className="space-y-3">
                {cashMovements.map(t => {
                   const customer = customers.find(c => c.id === t.customerId);
                   const displayName = customer?.name || t.guestName || 'تراکنش نقدی آزاد';
                   return (
                     <button 
                       key={t.id} 
                       onClick={() => setSelectedReceipt(t)}
                       className={`w-full p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${selectedReceipt?.id === t.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl' : 'bg-white border-slate-50 hover:bg-slate-50 text-slate-900'}`}
                     >
                        <div className="flex items-center gap-6">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${selectedReceipt?.id === t.id ? 'bg-white/20' : t.type === TransactionType.RESID ? 'bg-emerald-50 text-emerald-600' : t.type === TransactionType.BOARD ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                              {t.type === TransactionType.RESID ? <ArrowDownLeft size={20} /> : t.type === TransactionType.BOARD ? <ArrowUpRight size={20} /> : <CheckCircle size={20} />}
                           </div>
                           <div className="text-right">
                              <p className="font-black text-sm">{displayName}</p>
                              <div className="flex flex-col gap-1 mt-0.5">
                                 <div className="flex items-center gap-2">
                                    <p className="text-[9px] opacity-60 font-bold tnum">
                                       {new Date(t.timestamp).toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'})}
                                    </p>
                                    {(t.type === TransactionType.EXCHANGE || t.isWalkin) && (
                                       <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${selectedReceipt?.id === t.id ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                                          {t.isWalkin ? 'تصفیه راه‌روی' : 'تبادله نقد'}
                                       </span>
                                    )}
                                 </div>
                                 <p className={`text-[10px] font-medium leading-tight text-right ${selectedReceipt?.id === t.id ? 'text-white/80' : 'text-slate-500'}`}>
                                    {t.description}
                                 </p>
                              </div>
                           </div>
                        </div>
                        <div className="text-left flex flex-col items-end shrink-0 ml-4">
                           <p className="text-sm font-black tnum">{t.amount.toLocaleString()} <span className="text-[10px] uppercase opacity-60">{t.currency}</span></p>
                           {t.netProfit !== undefined && (
                             <p className={`text-[9px] font-bold ${selectedReceipt?.id === t.id ? 'text-white' : 'text-emerald-600'}`}>+ {t.netProfit.toLocaleString()} AFN</p>
                           )}
                        </div>
                     </button>
                   );
                })}
                {cashMovements.length === 0 && (
                   <div className="py-20 text-center text-slate-300 italic font-bold">تراکنش نقدی در این بخش یافت نشد.</div>
                )}
             </div>
          </div>
        </div>

        <div className="xl:col-span-1 print:w-full print:block">
           <div className={`bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden sticky top-24 ${!selectedReceipt ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              {selectedReceipt && (
                <div className="p-10 space-y-10">
                   <div className="flex justify-between items-center pb-8 border-b-2 border-dashed border-slate-100">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl font-black italic">J</div>
                         <div className="text-right">
                            <h4 className="font-black text-slate-900 leading-none text-xs">{shopName}</h4>
                            <p className="text-[8px] font-black text-slate-400 uppercase mt-1 text-right tracking-widest">Cash Receipt (Drawer)</p>
                         </div>
                      </div>
                      <div className="text-left">
                         <p className="text-xs font-black text-slate-900 font-mono"># {selectedReceipt.id.toUpperCase()}</p>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem]">
                         <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${selectedReceipt.type === TransactionType.RESID ? 'bg-emerald-100 text-emerald-700' : selectedReceipt.type === TransactionType.BOARD ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                            {selectedReceipt.isWalkin ? 'WALKIN SETTLEMENT' : selectedReceipt.type === TransactionType.RESID ? 'RESID CASH' : selectedReceipt.type === TransactionType.BOARD ? 'BOARD CASH' : 'EXCHANGE CASH'}
                         </span>
                         <p className="text-[11px] font-black text-slate-900 tnum">{new Date(selectedReceipt.timestamp).toLocaleDateString('fa-IR')}</p>
                      </div>

                      <div className="space-y-5 text-right">
                         <div className="flex justify-between border-b border-slate-50 pb-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">مشتری:</span>
                            <span className="text-xs font-black text-slate-900">{customers.find(c => c.id === selectedReceipt.customerId)?.name || selectedReceipt.guestName || 'مشتری آزاد / راه‌روی'}</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-50 pb-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">مبلغ اصلی:</span>
                            <div className="text-left">
                               <p className="text-base font-black text-slate-900 tnum">{selectedReceipt.amount.toLocaleString()} <span className="text-[10px] uppercase opacity-50">{selectedReceipt.currency}</span></p>
                            </div>
                         </div>
                         
                         {/* نمایش جزئیات بانکی در صورت وجود */}
                         {selectedReceipt.bankFrom && (
                            <div className="flex justify-between border-b border-slate-50 pb-4">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">بانک فرستنده:</span>
                               <span className="text-xs font-black text-slate-900">{selectedReceipt.bankFrom}</span>
                            </div>
                         )}
                         {selectedReceipt.bankTo && (
                            <div className="flex justify-between border-b border-slate-50 pb-4">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">بانک مقصد:</span>
                               <span className="text-xs font-black text-slate-900">{selectedReceipt.bankTo}</span>
                            </div>
                         )}
                         {selectedReceipt.cardLastFour && (
                            <div className="flex justify-between border-b border-slate-50 pb-4">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">۴ رقم آخر کارت:</span>
                               <span className="text-xs font-black text-slate-900 tabular-nums">**** {selectedReceipt.cardLastFour}</span>
                            </div>
                         )}
                         {selectedReceipt.trackingId && (
                            <div className="flex justify-between border-b border-slate-50 pb-4">
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">شماره پیگیری:</span>
                               <span className="text-xs font-black text-slate-900 tabular-nums">{selectedReceipt.trackingId}</span>
                            </div>
                         )}

                         {selectedReceipt.netProfit !== undefined && (
                           <div className="flex justify-between border-b border-slate-50 pb-4">
                              <span className="text-[10px] font-bold text-emerald-600 uppercase">مفاد معامله:</span>
                              <span className="text-xs font-black text-emerald-700 tnum">{selectedReceipt.netProfit.toLocaleString()} AFN</span>
                           </div>
                         )}
                         <div className="pt-2 text-right">
                            <p className="text-[10px] font-medium text-slate-600 bg-slate-50/50 p-4 rounded-2xl italic leading-relaxed">
                               {selectedReceipt.description || 'بدون شرح تراکنش'}
                            </p>
                         </div>
                      </div>
                   </div>

                   <div className="pt-10 border-t border-slate-100">
                      <div className="flex justify-between items-end mb-10">
                         <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-6 tracking-widest">CASHIER SIGN</p>
                            <p className="text-[9px] font-black text-slate-900">{currentUser?.fullName}</p>
                         </div>
                         <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase mb-6 tracking-widest">CLIENT SIGN</p>
                            <div className="w-20 h-0.5 bg-slate-100 mx-auto"></div>
                         </div>
                      </div>
                   </div>

                   <button 
                     onClick={handlePrint}
                     className="w-full bg-slate-950 text-white py-4 rounded-xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 print:hidden"
                   >
                      <PrintIcon size={18} /> PRINT RECEIPT
                   </button>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default CashBoxManager;
