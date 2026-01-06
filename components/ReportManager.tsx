
import React, { useState, useMemo } from 'react';
import { Printer, FileText, Users, BookOpen, Calendar, ChevronLeft, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { Transaction, Customer, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES } from '../types';

const SYSTEM_TIME_OFFSET = 3600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;

interface ReportManagerProps {
  transactions: Transaction[];
  customers: Customer[];
  shopName: string;
}

const ReportManager: React.FC<ReportManagerProps> = ({ transactions, customers, shopName }) => {
  const [reportType, setReportType] = useState<'customers' | 'journal'>('customers');
  
  const now = new Date(getSystemNow());
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState(firstDay.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(now.toISOString().split('T')[0]);
  const [selectedDate, setSelectedDate] = useState(new Date(getSystemNow()));

  const approvedTransactions = useMemo(() => {
    return transactions.filter(t => t.status === TransactionStatus.APPROVED);
  }, [transactions]);

  const customerBalances = useMemo(() => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime() + (24 * 60 * 60 * 1000);

    const sortedCustomers = [...customers].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));

    return sortedCustomers.map(customer => {
      const balances: Record<string, number> = {};
      const allTransUntilEnd = approvedTransactions.filter(t => 
        t.customerId === customer.id && 
        t.timestamp <= end
      );

      SUPPORTED_CURRENCIES.forEach(curr => {
        const initial = customer.balances[curr.code] || 0;
        const resid = allTransUntilEnd.filter(t => t.type === TransactionType.RESID && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
        const board = allTransUntilEnd.filter(t => t.type === TransactionType.BOARD && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
        
        const exIn = allTransUntilEnd.filter(t => t.type === TransactionType.EXCHANGE && t.targetCurrency === curr.code).reduce((sum, t) => sum + (t.convertedAmount || 0), 0);
        const exOut = allTransUntilEnd.filter(t => t.type === TransactionType.EXCHANGE && t.currency === curr.code).reduce((sum, t) => sum + t.amount, 0);
        
        balances[curr.code] = initial + resid - board - exOut + exIn;
      });
      return { ...customer, currentBalances: balances };
    });
  }, [customers, approvedTransactions, startDate, endDate]);

  const filteredJournal = useMemo(() => {
    return approvedTransactions.filter(t => {
      const tDate = new Date(t.timestamp);
      return tDate.getFullYear() === selectedDate.getFullYear() &&
             tDate.getMonth() === selectedDate.getMonth() &&
             tDate.getDate() === selectedDate.getDate();
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [approvedTransactions, selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  const changeDay = (offset: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + offset);
    setSelectedDate(newDate);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col gap-6 print:hidden">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-right">
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900">مرکز گزارشات چاپی</h2>
            <p className="text-xs text-slate-400 mt-1 font-bold">صدور صورت‌حساب‌های کلی و روزنامچه برای پرینت فیزیکی.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={() => setReportType('customers')} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${reportType === 'customers' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                <Users size={16} /> تراز مشتریان
              </button>
              <button onClick={() => setReportType('journal')} className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 ${reportType === 'journal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                <BookOpen size={16} /> روزنامچه
              </button>
            </div>
            <button onClick={handlePrint} className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl hover:bg-black transition-all">
              <Printer size={18} /> چاپ گزارش
            </button>
          </div>
        </div>

        {reportType === 'customers' && (
          <div className="flex flex-col md:flex-row items-center gap-4 bg-blue-50/50 p-4 rounded-3xl border border-blue-100 text-right">
            <div className="flex items-center gap-3 flex-1 text-right">
              <Calendar size={18} className="text-blue-600" />
              <span className="text-xs font-black text-blue-900">بازه زمانی گزارش:</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right">
                <label className="text-[9px] font-black text-slate-400 mr-1 mb-1">از تاریخ</label>
                <input type="date" className="bg-white border border-blue-100 rounded-xl px-4 py-2 text-xs font-black outline-none text-right" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <ArrowLeftRight size={16} className="text-blue-300 mt-4" />
              <div className="flex flex-col text-right">
                <label className="text-[9px] font-black text-slate-400 mr-1 mb-1">تا تاریخ</label>
                <input type="date" className="bg-white border border-blue-100 rounded-xl px-4 py-2 text-xs font-black outline-none text-right" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        <div className="p-10 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center print:bg-white text-right">
          <div className="text-right">
            <h1 className="text-3xl font-black text-slate-900">{shopName}</h1>
            <p className="text-sm font-bold text-slate-400 mt-2">
              {reportType === 'customers' 
                ? `گزارش تراز نهایی مشتریان (مرتب شده بر اساس کد) - از ${new Date(startDate).toLocaleDateString('fa-IR')} تا ${new Date(endDate).toLocaleDateString('fa-IR')}` 
                : `گزارش روزنامچه صرافی - مورخ ${selectedDate.toLocaleDateString('fa-IR')}`}
            </p>
          </div>
          {reportType === 'journal' && (
            <div className="flex items-center gap-3 print:hidden">
              <button onClick={() => changeDay(1)} className="p-2 bg-white border border-slate-100 rounded-xl hover:text-blue-600 transition-all"><ChevronRight size={20}/></button>
              <span className="text-sm font-black text-slate-600">{selectedDate.toLocaleDateString('fa-IR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <button onClick={() => changeDay(-1)} className="p-2 bg-white border border-slate-100 rounded-xl hover:text-blue-600 transition-all"><ChevronLeft size={20}/></button>
            </div>
          )}
        </div>

        {reportType === 'customers' && (
          <div className="p-10 text-right">
            <table className="w-full text-right text-[10px] border-collapse">
              <thead className="bg-slate-100 print:bg-slate-200 text-right">
                <tr>
                  <th className="p-3 font-black border border-slate-300 text-right">کد</th>
                  <th className="p-3 font-black border border-slate-300 text-right">نام مشتری</th>
                  {SUPPORTED_CURRENCIES.map(curr => (
                    <th key={curr.code} className="p-3 font-black border border-slate-300 text-center">{curr.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customerBalances.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 font-black border border-slate-200 text-slate-900 bg-slate-50/50 print:bg-transparent tabular-nums text-right">{c.code}</td>
                    <td className="p-3 font-black border border-slate-200 text-slate-900 text-right">{c.name}</td>
                    {SUPPORTED_CURRENCIES.map(curr => {
                      const bal = c.currentBalances[curr.code] || 0;
                      return (
                        <td key={curr.code} className={`p-3 font-black border border-slate-200 text-center tabular-nums ${bal > 0 ? 'text-emerald-700' : bal < 0 ? 'text-rose-700' : 'text-slate-300'}`}>
                          {bal !== 0 ? bal.toLocaleString() : '---'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'journal' && (
          <div className="p-10 text-right">
            <table className="w-full text-right text-[11px] border-collapse">
              <thead className="bg-slate-100 print:bg-slate-200 text-right">
                <tr>
                  <th className="p-4 font-black border border-slate-200 text-right">ساعت</th>
                  <th className="p-4 font-black border border-slate-200 text-right">طرف حساب</th>
                  <th className="p-4 font-black border border-slate-200 text-right">نوع</th>
                  <th className="p-4 font-black border border-slate-200 text-center">مبلغ</th>
                  <th className="p-4 font-black border border-slate-200 text-right">شرح و جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {filteredJournal.map(t => {
                  const customer = customers.find(c => c.id === t.customerId);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold border border-slate-100 text-slate-400 tabular-nums text-right">{new Date(t.timestamp).toLocaleTimeString('fa-IR', {hour: '2-digit', minute: '2-digit'})}</td>
                      <td className="p-4 font-black border border-slate-100 text-slate-900 text-right">{customer?.name || t.guestName || '---'}</td>
                      <td className={`p-4 font-black border border-slate-100 text-right ${t.type === TransactionType.RESID ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type}</td>
                      <td className="p-4 font-black border border-slate-100 text-center tabular-nums">
                        {t.amount.toLocaleString()} <span className="text-[9px] opacity-40 uppercase">{t.currency}</span>
                      </td>
                      <td className="p-4 font-medium border border-slate-100 text-slate-600 text-[10px] text-right">{t.description}</td>
                    </tr>
                  );
                })}
                {filteredJournal.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-slate-300 font-black italic">هیچ تراکنشی در این تاریخ یافت نشد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-10 border-t border-slate-50 flex justify-between items-end opacity-60 text-right">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">تاریخ چاپ گزارش</p>
            <p className="text-xs font-black text-slate-800 tabular-nums">{new Date(getSystemNow()).toLocaleString('fa-IR')}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">مهر و امضاء صرافی</p>
            <div className="w-32 h-0.5 bg-slate-100 mx-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportManager;
