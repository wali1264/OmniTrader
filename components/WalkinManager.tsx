
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Zap, Plus, TrendingUp, Save, Trash2, 
  RefreshCw, Coins
} from 'lucide-react';
import { 
  Transaction, TransactionType, TransactionStatus, 
  SUPPORTED_CURRENCIES, User 
} from '../types';

const getSystemNow = () => Date.now();

interface WalkinTrade {
  id: string;
  type: 'buy' | 'sell';
  currency: string;
  amount: number;
  profit: number;
  timestamp: number;
}

interface WalkinManagerProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  shopName: string;
  currentUser: User | null;
}

const WalkinManager: React.FC<WalkinManagerProps> = ({ transactions, setTransactions, shopName, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'profit'>('buy');
  const [pendingTrades, setPendingTrades] = useState<WalkinTrade[]>(() => {
    const saved = localStorage.getItem('s_pending_walkin');
    return saved ? JSON.parse(saved) : [];
  });

  // ارزهای قابل انتخاب (شامل افغانی و سایر ارزها)
  const convertibleCurrencies = useMemo(() => 
    SUPPORTED_CURRENCIES, 
  []);

  const [formData, setFormData] = useState({
    amount: 0,
    profit: 0,
    currency: 'USD',
    description: ''
  });

  useEffect(() => {
    localStorage.setItem('s_pending_walkin', JSON.stringify(pendingTrades));
  }, [pendingTrades]);

  const handleAddTrade = (type: 'buy' | 'sell') => {
    if (formData.amount <= 0) {
      alert("لطفاً مبلغ معامله را وارد کنید.");
      return;
    }
    const newTrade: WalkinTrade = {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      type,
      currency: formData.currency,
      amount: formData.amount,
      profit: formData.profit,
      timestamp: getSystemNow()
    };
    setPendingTrades(prev => [...prev, newTrade]);
    setFormData({ ...formData, amount: 0, profit: 0, description: '' });
  };

  const removeTrade = (id: string) => {
    setPendingTrades(prev => prev.filter(t => t.id !== id));
  };

  const handleCommitProfit = () => {
    if (pendingTrades.length === 0) return;
    const now = getSystemNow();
    const totalProfit = pendingTrades.reduce((sum, t) => sum + t.profit, 0);
    
    const newTransaction: Transaction = {
      id: `W-PROF-${now}`,
      type: totalProfit >= 0 ? TransactionType.RESID : TransactionType.BOARD,
      amount: Math.abs(totalProfit),
      currency: 'AFN',
      netProfit: totalProfit,
      description: `[تصفیه راه‌روی] سود حاصل از ${pendingTrades.length} معامله بازار`,
      timestamp: now,
      status: TransactionStatus.APPROVED,
      isBank: false,
      isWalkin: true
    };

    setTransactions(prev => [...prev, newTransaction]);
    setPendingTrades([]);
    alert("سود راه‌روی با موفقیت در صندوق ثبت شد.");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 text-right font-['Vazirmatn'] pb-20 fade-entry">
      <div className="bg-[#0f172a] p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5"><Zap size={100} /></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-black">مدیریت معاملات بازار (راه‌روی)</h2>
          <p className="text-slate-400 text-xs mt-2 font-bold opacity-60">ثبت سریع معاملات و انتقال سود حاصله به صندوق</p>
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
        <button onClick={() => setActiveTab('buy')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${activeTab === 'buy' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>خرید ارز</button>
        <button onClick={() => setActiveTab('sell')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${activeTab === 'sell' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>فروش ارز</button>
        <button onClick={() => setActiveTab('profit')} className={`flex-1 py-4 rounded-xl font-black text-xs transition-all ${activeTab === 'profit' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
          تصفیه و ثبت سود ({pendingTrades.length})
        </button>
      </div>

      {activeTab !== 'profit' ? (
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">انتخاب ارز معامله</label>
                <select 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all text-right"
                  value={formData.currency}
                  onChange={e => setFormData({...formData, currency: e.target.value})}
                >
                  {convertibleCurrencies.map(c => (
                    <option key={c.code} value={c.code}>{c.label} ({c.code})</option>
                  ))}
                </select>
             </div>
             <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">مبلغ معامله ({formData.currency})</label>
                <input 
                  type="number" 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl text-lg font-black outline-none focus:bg-white transition-all text-right" 
                  placeholder="0" 
                  value={formData.amount || ''} 
                  onChange={e => setFormData({...formData, amount: Number(e.target.value)})} 
                />
             </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mr-1">سود حاصل از این معامله (به افغانی)</label>
            <input 
              type="number" 
              className="w-full p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-2xl font-black outline-none focus:bg-white transition-all text-right text-emerald-700" 
              placeholder="0" 
              value={formData.profit || ''} 
              onChange={e => setFormData({...formData, profit: Number(e.target.value)})} 
            />
            <p className="text-[9px] text-slate-400 mt-2 font-bold">مبلغ سود وارد شده مستقیماً به موجودی افغانی صندوق اضافه خواهد شد.</p>
          </div>

          <button 
            onClick={() => handleAddTrade(activeTab as any)} 
            className={`w-full py-5 rounded-2xl font-black text-lg text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${activeTab === 'buy' ? 'bg-emerald-600 shadow-emerald-100' : 'bg-rose-600 shadow-rose-100'}`}
          >
            <Plus size={24} /> افزودن به لیست انتظار تصفیه
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
             <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 border-b">
                   <tr>
                      <th className="p-4 font-black">نوع</th>
                      <th className="p-4 font-black">مبلغ و ارز معامله</th>
                      <th className="p-4 font-black text-emerald-600">سود حاصله (AFN)</th>
                      <th className="p-4 font-black text-center">عملیات</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {pendingTrades.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                         <td className="p-4 font-black">
                            <span className={`px-2 py-1 rounded-lg ${t.type === 'buy' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                               {t.type === 'buy' ? 'خرید' : 'فروش'}
                            </span>
                         </td>
                         <td className="p-4 font-black text-sm">{t.amount.toLocaleString()} <span className="text-[9px] opacity-40 uppercase">{t.currency}</span></td>
                         <td className="p-4 font-black text-emerald-700 text-sm tnum">{t.profit.toLocaleString()}</td>
                         <td className="p-4 text-center">
                            <button onClick={() => removeTrade(t.id)} className="p-2 text-rose-400 hover:text-rose-600 transition-all"><Trash2 size={16} /></button>
                         </td>
                      </tr>
                   ))}
                   {pendingTrades.length === 0 && (
                      <tr>
                         <td colSpan={4} className="p-20 text-center text-slate-300 font-bold italic">لیست تصفیه خالی است.</td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
          
          <div className="bg-slate-900 p-8 rounded-[2rem] text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
             <div className="text-right">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">مجموع سود نهایی جهت ثبت در صندوق:</p>
                <h4 className="text-4xl font-black tabular-nums">
                   {pendingTrades.reduce((sum, t) => sum + t.profit, 0).toLocaleString()} <span className="text-sm font-bold opacity-40">AFN</span>
                </h4>
             </div>
             <button 
               onClick={handleCommitProfit}
               disabled={pendingTrades.length === 0}
               className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white px-10 py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center gap-3"
             >
                <Save size={24} /> تائید و انتقال سود به صندوق
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkinManager;
