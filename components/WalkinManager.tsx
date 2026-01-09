
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, Plus, Calculator, TrendingUp, ArrowDownLeft, 
  ArrowUpRight, CircleDollarSign, Save, Trash2, 
  CheckCircle2, RefreshCw, Info, AlertCircle, X, ArrowRight
} from 'lucide-react';
import { 
  Transaction, TransactionType, TransactionStatus, 
  SUPPORTED_CURRENCIES, User, WalkinStatus, Customer 
} from '../types';

const SYSTEM_TIME_OFFSET = 3600000;
const getSystemNow = () => Date.now() + SYSTEM_TIME_OFFSET;

interface WalkinTrade {
  id: string;
  type: 'buy' | 'sell';
  currency: string;
  amount: number;
  rate: number;
  total: number;
  profit: number;
  timestamp: number;
}

interface WalkinManagerProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  shopName: string;
  currentUser: User | null;
  customers?: Customer[];
  setCustomers?: React.Dispatch<React.SetStateAction<Customer[]>>;
}

const WalkinManager: React.FC<WalkinManagerProps> = ({ transactions, setTransactions, shopName, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'profit'>('buy');
  const [pendingTrades, setPendingTrades] = useState<WalkinTrade[]>(() => {
    const saved = localStorage.getItem('s_pending_walkin');
    return saved ? JSON.parse(saved) : [];
  });

  const [formData, setFormData] = useState({
    amount: 0,
    profit: 0,
    currency: 'USD',
    description: ''
  });

  useEffect(() => {
    localStorage.setItem('s_pending_walkin', JSON.stringify(pendingTrades));
  }, [pendingTrades]);

  // اصلاح محاسبه مجموع سود: فقط مقادیر فیلد profit (که به افغانی است) جمع می‌شوند.
  // مبالغ ارزها نباید با هم جمع یا از هم کسر شوند چون واحدهای متفاوتی دارند.
  const totals = useMemo(() => {
    const buyCount = pendingTrades.filter(t => t.type === 'buy').length;
    const sellCount = pendingTrades.filter(t => t.type === 'sell').length;
    const totalAfnProfit = pendingTrades.reduce((sum, t) => sum + t.profit, 0);
    return { buyCount, sellCount, profit: totalAfnProfit };
  }, [pendingTrades]);

  const handleAddTrade = (type: 'buy' | 'sell') => {
    if (formData.amount <= 0 && formData.profit <= 0) {
      alert("لطفاً مبلغ یا مفاد معتبری وارد کنید.");
      return;
    }

    const newTrade: WalkinTrade = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      currency: formData.currency,
      amount: formData.amount,
      rate: 1,
      total: formData.amount,
      profit: formData.profit,
      timestamp: getSystemNow()
    };

    setPendingTrades(prev => [...prev, newTrade]);
    setFormData({ ...formData, amount: 0, profit: 0, currency: formData.currency, description: '' });
  };

  const removeTrade = (id: string) => {
    setPendingTrades(prev => prev.filter(t => t.id !== id));
  };

  const handleCommitProfit = () => {
    if (pendingTrades.length === 0) {
      alert("لیست معاملات موقت خالی است.");
      return;
    }

    try {
      const currencyChanges: Record<string, number> = {};
      let totalAfnProfit = 0;

      // محاسبه تغییرات موجودی هر واحد ارزی و مجموع سود خالص به افغانی
      pendingTrades.forEach(trade => {
        const curr = trade.currency;
        if (!currencyChanges[curr]) currencyChanges[curr] = 0;
        
        if (trade.type === 'buy') {
          // خرید از مشتری = اضافه شدن به موجودی صرافی (رسید)
          currencyChanges[curr] += trade.amount;
        } else {
          // فروش به مشتری = کسر شدن از موجودی صرافی (بورد)
          currencyChanges[curr] -= trade.amount;
        }
        
        totalAfnProfit += trade.profit;
      });

      const newTransactions: Transaction[] = [];
      const now = getSystemNow();

      // ۱. ثبت تراکنش‌های جابجایی ارز (خریدها اضافه و فروش‌ها کم می‌شوند)
      Object.entries(currencyChanges).forEach(([curr, net], idx) => {
        if (net === 0) return;
        newTransactions.push({
          id: `W-INV-${now}-${idx}`,
          type: net > 0 ? TransactionType.RESID : TransactionType.BOARD,
          amount: Math.abs(net),
          currency: curr,
          description: `[تصفیه راه‌روی] جابجایی واحد ${curr} - حاصل از معاملات بازار`,
          timestamp: now + idx,
          status: TransactionStatus.APPROVED,
          isBank: false,
          isWalkin: true
        });
      });

      // ۲. ثبت تراکنش مربوط به سود کل حاصله به واحد افغانی
      if (totalAfnProfit !== 0) {
        newTransactions.push({
          id: `W-PROF-${now}-P`,
          type: totalAfnProfit > 0 ? TransactionType.RESID : TransactionType.BOARD,
          amount: Math.abs(totalAfnProfit),
          currency: 'AFN',
          netProfit: totalAfnProfit,
          description: `[تصفیه راه‌روی] مجموع سود حاصل از معاملات انجام شده`,
          timestamp: now + 100,
          status: TransactionStatus.APPROVED,
          isBank: false,
          isWalkin: true,
          walkinStatus: WalkinStatus.SETTLED
        });
      }

      setTransactions(prev => [...prev, ...newTransactions]);
      setPendingTrades([]);
      localStorage.removeItem('s_pending_walkin');
      alert(`عملیات تصفیه با موفقیت انجام شد. ارزها در صندوق بروزرسانی شدند.`);
      setActiveTab('buy');
    } catch (error) {
      console.error("Error committing walk-in trades:", error);
      alert("خطایی در ثبت تراکنش‌ها رخ داد.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-right fade-entry font-['Vazirmatn'] pb-20">
      <div className="bg-[#0f172a] p-8 rounded-2xl text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute left-0 top-0 w-full h-full opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500 to-transparent"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-right">
            <h2 className="text-xl font-black">{shopName}</h2>
            <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">Walk-in Client Management Portal</p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-xl text-center min-w-[150px]">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider mb-1">UNSETTLED PROFIT (AFN)</p>
              <p className={`text-xl font-black tabular-nums ${totals.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totals.profit.toLocaleString()} <span className="text-[10px]">AFN</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200">
        <button 
          onClick={() => setActiveTab('buy')} 
          className={`flex-1 py-4 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'buy' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <ArrowDownLeft size={16} /> ۱. خرید ارز
        </button>
        <button 
          onClick={() => setActiveTab('sell')} 
          className={`flex-1 py-4 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'sell' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <ArrowUpRight size={16} /> ۲. فروش ارز
        </button>
        <button 
          onClick={() => setActiveTab('profit')} 
          className={`flex-1 py-4 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${activeTab === 'profit' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <TrendingUp size={16} /> ۳. تسویه نهایی
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-6">
          {(activeTab === 'buy' || activeTab === 'sell') && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 animate-in zoom-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-50 pb-6">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-xl text-white ${activeTab === 'buy' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                    {activeTab === 'buy' ? <ArrowDownLeft size={20}/> : <ArrowUpRight size={20}/>}
                  </div>
                  <div className="text-right">
                     <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">{activeTab === 'buy' ? 'ثبت خرید از مشتری' : 'ثبت فروش به مشتری'}</h3>
                     <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Operational entry without balance impact</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                 <div className="space-y-2 text-right">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Selection of Currency</label>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                       {SUPPORTED_CURRENCIES.map(curr => (
                         <button 
                            key={curr.code} 
                            type="button"
                            onClick={() => setFormData({...formData, currency: curr.code})}
                            className={`py-3 rounded-xl text-[10px] font-black border transition-all ${formData.currency === curr.code ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-transparent text-slate-400 hover:bg-slate-100'}`}
                         >
                            {curr.code}
                         </button>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 text-right">
                       <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">مبلغ واحد ({formData.currency})</label>
                       <input 
                         type="number" 
                         className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-black outline-none focus:bg-white transition-all text-right tabular-nums" 
                         placeholder="0.00"
                         value={formData.amount || ''}
                         onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                       />
                    </div>
                    <div className="space-y-2 text-right">
                       <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mr-1">مفاد از تبادله (AFN)</label>
                       <input 
                         type="number" 
                         className="w-full p-4 bg-emerald-50/30 border border-emerald-100 rounded-xl text-xl font-black outline-none focus:bg-white transition-all text-right tabular-nums text-emerald-700" 
                         placeholder="0"
                         value={formData.profit || ''}
                         onChange={e => setFormData({...formData, profit: Number(e.target.value)})}
                       />
                    </div>
                 </div>

                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex justify-end items-center gap-4">
                    <button 
                      type="button"
                      onClick={() => handleAddTrade(activeTab === 'buy' ? 'buy' : 'sell')}
                      className={`w-full md:w-auto px-8 py-4 rounded-xl font-black text-[11px] text-white shadow-lg transition-all active:scale-95 ${activeTab === 'buy' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                    >
                      ADD TO QUEUE
                    </button>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'profit' && (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-8 animate-in zoom-in duration-200">
               <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                <div className="p-3 rounded-xl bg-slate-900 text-white">
                  <Calculator size={20}/>
                </div>
                <div className="text-right">
                   <h3 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Final Settlement Calculation</h3>
                   <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Post P&L to Primary Ledger</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Items in Queue:</p>
                    <p className="text-xl font-black text-slate-700 tabular-nums">{pendingTrades.length} <span className="text-[10px]">Records</span></p>
                 </div>
                 <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total User-Entered Profit:</p>
                    <p className="text-xl font-black text-slate-700 tabular-nums">{totals.profit.toLocaleString()} <span className="text-[10px]">AFN</span></p>
                 </div>
              </div>

              <div className={`p-10 rounded-2xl border flex flex-col items-center justify-center gap-4 ${totals.profit >= 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NET PROFIT TO RECORD</p>
                 <div className={`text-4xl font-black tabular-nums ${totals.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {totals.profit >= 0 ? '+' : ''}{totals.profit.toLocaleString()} 
                    <span className="text-sm mr-2">AFN</span>
                 </div>
                 <button 
                  type="button"
                  onClick={handleCommitProfit}
                  disabled={pendingTrades.length === 0}
                  className="mt-6 bg-slate-900 text-white px-10 py-4 rounded-xl font-black text-sm shadow-xl hover:bg-black transition-all disabled:opacity-20 flex items-center gap-3 active:scale-95"
                 >
                    <Save size={18} /> COMMIT TO DRAWER
                 </button>
              </div>

              <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-4 rounded-xl text-[10px] font-bold">
                 <Info size={14} />
                 Note: Committing will update the vault for EACH currency individually and record the net profit in AFN.
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full max-h-[600px]">
             <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-50 text-right">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                   <RefreshCw size={14} className="text-slate-400" /> Operational Queue
                </h3>
                <span className="bg-slate-100 px-3 py-1 rounded-lg text-[9px] font-black text-slate-500">{pendingTrades.length} ITEMS</span>
             </div>

             <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar space-y-3">
                {pendingTrades.slice().reverse().map(trade => (
                   <div key={trade.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-slate-200 transition-all">
                      <div className="flex items-center gap-4 text-right">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-[10px] ${trade.type === 'buy' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {trade.type === 'buy' ? 'BUY' : 'SEL'}
                         </div>
                         <div className="text-right">
                            <p className="font-black text-slate-800 text-xs tabular-nums">{trade.amount.toLocaleString()} {trade.currency}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-[8px] font-bold text-slate-400 tracking-tighter">{new Date(trade.timestamp).toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'})}</p>
                              {trade.profit > 0 && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1 rounded">+{trade.profit.toLocaleString()} AFN</span>}
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-4">
                         <button 
                           onClick={() => removeTrade(trade.id)}
                           className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
                         >
                            <Trash2 size={14} />
                         </button>
                      </div>
                   </div>
                ))}
                {pendingTrades.length === 0 && (
                   <div className="py-20 text-center text-slate-300 font-bold italic flex flex-col items-center gap-4">
                      <AlertCircle size={32} className="opacity-10" />
                      <p className="text-[10px] uppercase tracking-widest">Queue is currently empty</p>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalkinManager;
