// Fixed malformed import statement
import React, { useState, useMemo } from 'react';
import { 
  Briefcase, Printer, ArrowDownLeft, ArrowUpRight, 
  Search, Filter, Clock, CheckCircle, Info, 
  Printer as PrintIcon, User, Coins, DollarSign, Wallet
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
      !t.bankAccountId && 
      t.status === TransactionStatus.APPROVED &&
      (customers.find(c => c.id === t.customerId)?.name.includes(searchTerm) || t.description.includes(searchTerm))
    ).sort((a, b) => b.timestamp - a.timestamp);
  }, [transactions, searchTerm, customers]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20 print:p-0 print:bg-white">
      
      {/* 1. Header & Live Balance (Hide on Print) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 print:hidden">
        <div className="lg:col-span-1 bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 p-6 opacity-10"><Briefcase size={80} /></div>
           <div className="relative z-10">
              <h3 className="text-xl font-black mb-1">میز عملیاتی صندوق</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Central Cash Box Desk</p>
              <div className="mt-8">
                 <p className="text-[10px] text-slate-500 mb-1">صندوقدار فعلی:</p>
                 <p className="font-black text-blue-400">{currentUser?.fullName}</p>
              </div>
           </div>
        </div>

        <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
             <Wallet size={14} className="text-blue-500" /> موجودی لحظه‌ای نقد در صندوق
           </h4>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {SUPPORTED_CURRENCIES.map(curr => (
                <div key={curr.code} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-colors">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{curr.label}</p>
                  <p className="text-lg font-black text-slate-900">{(stats.cashBox[curr.code] || 0).toLocaleString()}</p>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* 2. Operations Feed & Receipt Viewer */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Movements Feed (Hide on Print) */}
        <div className="xl:col-span-2 space-y-6 print:hidden">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
             <div className="flex justify-between items-center mb-8">
                <div>
                   <h3 className="text-xl font-black text-slate-900">تراکنش‌های نقدی تائید شده</h3>
                   <p className="text-xs text-slate-400 mt-1 font-medium italic">آخرین رسیدها و بردهای نقدی انجام شده</p>
                </div>
                <div className="relative">
                   <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                   <input 
                     type="text" 
                     placeholder="جستجوی مشتری یا سند..." 
                     className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 pr-12 pl-4 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500" 
                     value={searchTerm}
                     onChange={e => setSearchTerm(e.target.value)}
                   />
                </div>
             </div>

             <div className="space-y-3">
                {cashMovements.map(t => {
                   const customer = customers.find(c => c.id === t.customerId);
                   return (
                     <button 
                       key={t.id} 
                       onClick={() => setSelectedReceipt(t)}
                       className={`w-full p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${selectedReceipt?.id === t.id ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200 scale-[1.02]' : 'bg-white border-slate-50 hover:bg-slate-50 text-slate-900'}`}
                     >
                        <div className="flex items-center gap-6">
                           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${selectedReceipt?.id === t.id ? 'bg-white/20' : t.type === TransactionType.RESID ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                              {t.type === TransactionType.RESID ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                           </div>
                           <div className="text-right">
                              <p className="font-black text-base">{customer?.name || 'مشتری آزاد'}</p>
                              <p className={`text-[10px] font-bold uppercase ${selectedReceipt?.id === t.id ? 'text-blue-200' : 'text-slate-400'}`}>
                                 {new Date(t.timestamp).toLocaleTimeString('fa-IR')} | {t.currency}
                              </p>
                           </div>
                        </div>
                        <div className="text-left">
                           <p className="text-lg font-black">{t.amount.toLocaleString()}</p>
                           <p className={`text-[9px] font-black uppercase ${selectedReceipt?.id === t.id ? 'text-blue-200' : 'text-slate-300'}`}>سند #{t.id.toUpperCase()}</p>
                        </div>
                     </button>
                   );
                })}
                {cashMovements.length === 0 && (
                  <div className="py-20 text-center text-slate-300">تراکنش نقدی یافت نشد.</div>
                )}
             </div>
          </div>
        </div>

        {/* Receipt Generator (Show on Print) */}
        <div className="xl:col-span-1 print:w-full print:block">
           <div className={`bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden sticky top-24 ${!selectedReceipt ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
              {selectedReceipt ? (
                <div id="printable-receipt" className="p-10 space-y-10">
                   {/* Receipt Header */}
                   <div className="flex justify-between items-center pb-8 border-b-2 border-dashed border-slate-100">
                      <div className="flex items-center gap-3">
                         <div className="w-12 h-12 bg-slate-900 text-white flex items-center justify-center rounded-2xl font-black italic">J</div>
                         <div>
                            <h4 className="font-black text-slate-900 leading-none">{shopName}</h4>
                            <p className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest">Exchange Receipt System</p>
                         </div>
                      </div>
                      <div className="text-left">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">شماره سند</p>
                         <p className="text-sm font-black text-slate-900"># {selectedReceipt.id.toUpperCase()}</p>
                      </div>
                   </div>

                   {/* Receipt Body */}
                   <div className="space-y-8">
                      <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                         <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">نوع عملیات:</p>
                            <span className={`px-4 py-1.5 rounded-full text-xs font-black ${selectedReceipt.type === TransactionType.RESID ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                               {selectedReceipt.type === TransactionType.RESID ? 'دریافت (رسید)' : 'پرداخت (برد)'}
                            </span>
                         </div>
                         <div className="text-left">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">تاریخ و ساعت:</p>
                            <p className="text-xs font-black text-slate-900">{new Date(selectedReceipt.timestamp).toLocaleDateString('fa-IR')} | {new Date(selectedReceipt.timestamp).toLocaleTimeString('fa-IR')}</p>
                         </div>
                      </div>

                      <div className="space-y-5">
                         <div className="flex justify-between border-b border-slate-50 pb-4">
                            <span className="text-sm font-bold text-slate-400">نام مشتری:</span>
                            <span className="text-sm font-black text-slate-900">{customers.find(c => c.id === selectedReceipt.customerId)?.name || 'مشتری آزاد'}</span>
                         </div>
                         <div className="flex justify-between border-b border-slate-50 pb-4">
                            <span className="text-sm font-bold text-slate-400">مبلغ معامله:</span>
                            <div className="text-left">
                               <p className="text-2xl font-black text-slate-900">{selectedReceipt.amount.toLocaleString()}</p>
                               <p className="text-[10px] font-black text-blue-600 uppercase mt-1">{selectedReceipt.currency}</p>
                            </div>
                         </div>
                         <div className="pt-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-3">توضیحات و شرح:</span>
                            <p className="text-xs font-medium text-slate-600 bg-slate-50/50 p-4 rounded-2xl italic leading-relaxed border border-slate-100">
                               {selectedReceipt.description || 'بدون شرح تراکنش'}
                            </p>
                         </div>
                      </div>
                   </div>

                   {/* Receipt Footer */}
                   <div className="pt-10 border-t border-slate-100">
                      <div className="flex justify-between items-end mb-10">
                         <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-6">امضاء صندوقدار</p>
                            <p className="text-[10px] font-black text-slate-900">{currentUser?.fullName}</p>
                         </div>
                         <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center opacity-40 grayscale">
                            <CheckCircle size={32} />
                         </div>
                         <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase mb-6">امضاء و اثر انگشت مشتری</p>
                            <div className="w-20 h-0.5 bg-slate-100 mx-auto"></div>
                         </div>
                      </div>
                      <p className="text-[8px] text-center text-slate-400 font-medium">این رسید به صورت سیستمی تولید شده و فاقد اعتبار بدون مهر صرافی می‌باشد.</p>
                   </div>

                   <button 
                     onClick={handlePrint}
                     className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 print:hidden"
                   >
                      <PrintIcon size={20} /> چاپ و صدور فیزیکی رسید
                   </button>
                </div>
              ) : (
                <div className="p-20 flex flex-col items-center justify-center text-center">
                   <div className="p-6 bg-slate-50 rounded-full mb-6">
                      <PrintIcon size={48} className="text-slate-300" />
                   </div>
                   <h4 className="font-black text-slate-400">آماده برای چاپ</h4>
                   <p className="text-xs text-slate-300 mt-1">تراکنشی را از لیست انتخاب کنید تا رسید آن نمایش داده شود.</p>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* 3. Operational Tips (Hide on Print) */}
      <div className="flex items-center gap-4 bg-blue-50/50 p-8 rounded-[2.5rem] border border-blue-100 print:hidden">
         <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
            <Info size={24} />
         </div>
         <div>
            <h5 className="font-black text-blue-900 mb-1">راهنمای صندوقدار</h5>
            <p className="text-xs text-blue-700 leading-relaxed font-medium">
               موجودی نقد نمایش داده شده در این صفحه، تفاضل تمام دریافت‌ها و پرداخت‌های <strong>تائید شده</strong> در صندوق است. قبل از چاپ رسید، از صحت اطلاعات وارد شده توسط اپراتور اطمینان حاصل کنید. شماره سند (Unique ID) برای رهگیری‌های آتی در سیستم الزامی است.
            </p>
         </div>
      </div>

    </div>
  );
};

export default CashBoxManager;