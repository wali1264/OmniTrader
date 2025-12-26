
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Search, Plus, UserPlus, ArrowUpRight, ArrowDownLeft, 
  Phone, Hash, Users, FileText, Calendar, MoreVertical, 
  ChevronLeft, Info, UserCheck, UserMinus, MessageSquare,
  Clock, CheckCircle, Coins, Mic, Square, Trash2, Image as ImageIcon,
  Sparkles, Loader2, Play, Paperclip, Landmark, Wallet, CreditCard,
  ArrowRightLeft, TrendingUp
} from 'lucide-react';
import { Customer, Transaction, TransactionType, TransactionStatus, BankAccount, SUPPORTED_CURRENCIES, Attachment, GlobalRate } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

interface CustomerManagerProps {
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  bankAccounts: BankAccount[];
  globalRates: GlobalRate[];
}

const CustomerManager: React.FC<CustomerManagerProps> = ({ customers, setCustomers, transactions, setTransactions, bankAccounts, globalRates }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState<{show: boolean, type: TransactionType}>({ show: false, type: TransactionType.RESID });
  
  // Audio & Media States
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Form States
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank'>('cash');
  const [newCustomer, setNewCustomer] = useState({ name: '', phones: '', code: '', notes: '' });
  
  // Transaction Form with Conversion Support
  const [newTrans, setNewTrans] = useState({
    amount: 0,
    currency: 'AFN',
    bankId: '',
    description: '',
    cardLastFour: '',
    trackingId: '',
    autoConvert: false,
    targetCurrency: 'USD',
    customRate: 0,
    profit: 0
  });

  const activeRate = useMemo(() => {
    const pair = `${newTrans.targetCurrency}/${newTrans.currency}`; // e.g. USD/AFN
    const reversePair = `${newTrans.currency}/${newTrans.targetCurrency}`;
    const rate = globalRates.find(r => r.pair === pair)?.rate || (1 / (globalRates.find(r => r.pair === reversePair)?.rate || 1));
    return rate || 70.5;
  }, [newTrans.currency, newTrans.targetCurrency, globalRates]);

  // Handle auto-conversion calculation
  const conversionResult = useMemo(() => {
    if (!newTrans.autoConvert || !newTrans.amount) return null;
    const rate = newTrans.customRate || activeRate;
    
    // logic: If AFN -> USD, amount / rate. If USD -> AFN, amount * rate.
    let converted = 0;
    if (newTrans.currency === 'AFN' && newTrans.targetCurrency === 'USD') {
        converted = newTrans.amount / rate;
    } else if (newTrans.currency === 'USD' && newTrans.targetCurrency === 'AFN') {
        converted = newTrans.amount * rate;
    } else {
        // Fallback or other pairs (IRT, etc) - simple multiplier for demo
        converted = newTrans.amount * (rate / 10); 
    }
    
    // Profit logic: Automatic profit based on a small spread if customRate isn't used
    const marketRate = activeRate;
    const usedRate = newTrans.customRate || activeRate;
    let autoProfit = 0;
    
    if (newTrans.autoConvert) {
       // Example: Market is 70, we give 71. Profit is (71-70) per USD.
       const diff = Math.abs(usedRate - marketRate);
       autoProfit = (newTrans.currency === 'USD' ? newTrans.amount : (newTrans.amount / marketRate)) * diff;
    }

    return { converted, autoProfit };
  }, [newTrans.amount, newTrans.currency, newTrans.targetCurrency, newTrans.customRate, activeRate, newTrans.autoConvert]);

  useEffect(() => {
      if (conversionResult) {
          setNewTrans(prev => ({ ...prev, profit: Math.round(conversionResult.autoProfit) }));
      }
  }, [conversionResult?.autoProfit]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.includes(searchTerm) || 
      c.code.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  // Fix: Explicitly type currencyStats useMemo to avoid entries values being 'unknown'
  const currencyStats = useMemo<Record<string, { totalResid: number, totalBoard: number, balance: number }>>(() => {
    const stats: Record<string, { totalResid: number, totalBoard: number, balance: number }> = {};
    if (!selectedCustomer) return stats;
    const approved = transactions.filter(t => t.customerId === selectedCustomer.id && t.status === TransactionStatus.APPROVED);
    
    const activeCurrencies = new Set([...Object.keys(selectedCustomer.balances), ...approved.map(t => t.currency)]);
    
    activeCurrencies.forEach(curr => {
      const currTrans = approved.filter(t => t.currency === curr);
      const totalResid = currTrans.filter(t => t.type === TransactionType.RESID).reduce((sum, t) => sum + t.amount, 0);
      const totalBoard = currTrans.filter(t => t.type === TransactionType.BOARD).reduce((sum, t) => sum + t.amount, 0);
      stats[curr] = {
        totalResid,
        totalBoard,
        balance: totalResid - totalBoard
      };
    });
    return stats;
  }, [selectedCustomer, transactions]);

  const handleAddCustomer = () => {
    const customer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      code: newCustomer.code || (customers.length + 1000).toString(),
      name: newCustomer.name,
      phones: newCustomer.phones.split(',').map(p => p.trim()).filter(p => p !== ''),
      status: 'active',
      notes: newCustomer.notes,
      balances: {}
    };
    setCustomers(prev => [...prev, customer]);
    setShowAddModal(false);
  };

  const handleAddTransaction = () => {
    if (!selectedCustomer) return;

    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      customerId: selectedCustomer.id,
      type: showTransModal.type,
      amount: Number(newTrans.amount),
      currency: newTrans.currency,
      bankAccountId: paymentMethod === 'bank' ? newTrans.bankId : undefined,
      cardLastFour: paymentMethod === 'bank' ? newTrans.cardLastFour : undefined,
      trackingId: paymentMethod === 'bank' ? newTrans.trackingId : undefined,
      description: newTrans.autoConvert 
        ? `${newTrans.description} (تبدیل خودکار به ${newTrans.targetCurrency} با نرخ ${newTrans.customRate || activeRate})`
        : newTrans.description,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING,
      attachments: attachments,
      // Conversion Data
      exchangeRate: newTrans.autoConvert ? (newTrans.customRate || activeRate) : undefined,
      convertedAmount: conversionResult?.converted,
      targetCurrency: newTrans.autoConvert ? newTrans.targetCurrency : undefined,
      profit: newTrans.profit || 0
    };

    setTransactions(prev => [...prev, transaction]);
    closeTransModal();
  };

  const closeTransModal = () => {
    setShowTransModal({ show: false, type: TransactionType.RESID });
    setNewTrans({ 
        amount: 0, currency: 'AFN', bankId: '', description: '', cardLastFour: '', trackingId: '',
        autoConvert: false, targetCurrency: 'USD', customRate: 0, profit: 0
    });
    setAttachments([]);
    setPaymentMethod('cash');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          setAttachments(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            type: 'audio',
            data: reader.result as string,
            mimeType: 'audio/webm'
          }]);
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) { alert("خطا در میکروفون"); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleSmartAi = async () => {
    if (!newTrans.description) return;
    setIsAiProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analyze: "${newTrans.description}". Extract JSON: amount, currency, type (RESID/BOARD).`,
        config: { responseMimeType: "application/json" }
      });
      const result = JSON.parse(response.text || '{}');
      if (result.amount) setNewTrans(prev => ({ ...prev, amount: result.amount }));
      if (result.currency) setNewTrans(prev => ({ ...prev, currency: result.currency }));
    } catch (err) { alert("خطا در پردازش هوشمند"); }
    finally { setIsAiProcessing(false); }
  };

  const currentCustomerTrans = useMemo(() => {
    if (!selectedCustomer) return [];
    return transactions.filter(t => t.customerId === selectedCustomer.id)
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [selectedCustomer, transactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
      
      {/* 1. Sidebar */}
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sticky top-24">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users size={18} className="text-blue-600" /> لیست مشتریان</h3>
            <button onClick={() => setShowAddModal(true)} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md"><UserPlus size={18} /></button>
          </div>
          <div className="relative mb-6">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="جستجوی نام یا کد..." className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pr-10 pl-4 text-sm outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {filteredCustomers.map(c => (
              <button key={c.id} onClick={() => setSelectedCustomer(c)} className={`w-full p-4 rounded-xl text-right transition-all group ${selectedCustomer?.id === c.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-50 hover:bg-slate-50 text-slate-700'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex-1"><p className="font-bold text-sm">{c.name}</p><span className="text-[10px] opacity-60">{c.code}</span></div>
                  <ChevronLeft size={16} className={`transition-transform ${selectedCustomer?.id === c.id ? 'translate-x-1' : 'opacity-0'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Customer Ledger */}
      <div className="lg:col-span-9">
        {!selectedCustomer ? (
          <div className="h-full min-h-[500px] bg-white rounded-[2.5rem] border border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
            <FileText size={48} className="mb-4 text-slate-300" />
            <p className="font-bold text-lg">انتخاب دفتر مشتری برای مشاهده گزارشات</p>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-400">
            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center text-3xl font-black">{selectedCustomer.name.charAt(0)}</div>
                  <div>
                    <h2 className="text-2xl font-black text-slate-900">{selectedCustomer.name}</h2>
                    <p className="text-sm text-slate-500">کد: {selectedCustomer.code} | {selectedCustomer.phones[0]}</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <button onClick={() => setShowTransModal({ show: true, type: TransactionType.RESID })} className="flex-1 bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2"><ArrowDownLeft size={20} /> ثبت رسید</button>
                  <button onClick={() => setShowTransModal({ show: true, type: TransactionType.BOARD })} className="flex-1 bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2"><ArrowUpRight size={20} /> ثبت برد</button>
                </div>
              </div>
              <div className="mt-10 pt-8 border-t border-slate-50 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Fix: Using Object.keys for more reliable type inference to prevent unknown type errors on stat.balance */}
                {Object.keys(currencyStats).map((code) => {
                  const stat = currencyStats[code];
                  return (
                    <div key={code} className={`p-4 rounded-2xl border ${stat.balance >= 0 ? 'bg-white border-slate-100' : 'bg-rose-50 border-rose-100'}`}>
                      <div className="flex justify-between mb-1"><span className="text-[10px] font-black uppercase text-slate-400">{code}</span><span className={`text-[10px] font-bold ${stat.balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{stat.balance >= 0 ? 'طلبکار' : 'بدهکار'}</span></div>
                      <p className={`text-lg font-black ${stat.balance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{Math.abs(stat.balance).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-6">ریز تراکنش‌ها و سود خالص</h3>
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="pb-4">تاریخ</th>
                    <th className="pb-4">توضیحات</th>
                    <th className="pb-4">رسید (+)</th>
                    <th className="pb-4">برد (-)</th>
                    <th className="pb-4">سود (AFN)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {currentCustomerTrans.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 text-[10px] text-slate-400">{new Date(t.timestamp).toLocaleDateString('fa-IR')}</td>
                      <td className="py-4">
                        <p className="font-bold">{t.description}</p>
                        {t.exchangeRate && <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black">تبدیل با نرخ {t.exchangeRate}</span>}
                      </td>
                      <td className="py-4 font-black text-emerald-600">{t.type === TransactionType.RESID ? t.amount.toLocaleString() : '-'}</td>
                      <td className="py-4 font-black text-rose-600">{t.type === TransactionType.BOARD ? t.amount.toLocaleString() : '-'}</td>
                      <td className="py-4 text-indigo-600 font-black">{t.profit ? `+${t.profit.toLocaleString()}` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* TRANSACTION MODAL WITH AUTO-CONVERSION */}
      {showTransModal.show && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-4xl shadow-2xl animate-in zoom-in duration-300 my-8 border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className={`text-2xl font-black ${showTransModal.type === TransactionType.RESID ? 'text-emerald-600' : 'text-rose-600'}`}>ثبت {showTransModal.type} جدید</h3>
              <button onClick={closeTransModal} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-all"><Plus className="rotate-45" /></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-3 uppercase">روش پرداخت</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
                    <button onClick={() => setPaymentMethod('cash')} className={`py-3 rounded-xl text-sm font-black transition-all ${paymentMethod === 'cash' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>نقد (صندوق)</button>
                    <button onClick={() => setPaymentMethod('bank')} className={`py-3 rounded-xl text-sm font-black transition-all ${paymentMethod === 'bank' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>بانکی</button>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-black text-slate-400 mb-2">مبلغ تراکنش</label>
                    <input type="number" className="w-full p-4 bg-slate-50 rounded-2xl text-xl font-black outline-none" value={newTrans.amount || ''} onChange={(e) => setNewTrans({...newTrans, amount: Number(e.target.value)})} />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-black text-slate-400 mb-2">واحد پول</label>
                    <select className="w-full p-4 bg-slate-100 rounded-2xl font-bold" value={newTrans.currency} onChange={(e) => setNewTrans({...newTrans, currency: e.target.value})}>
                      {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                </div>

                {/* AUTO CONVERSION FEATURE */}
                <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <ArrowRightLeft size={18} className="text-blue-600" />
                           <span className="text-sm font-black text-blue-900">تبدیل خودکار و محاسبه سود</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={newTrans.autoConvert} onChange={e => setNewTrans({...newTrans, autoConvert: e.target.checked})}/>
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {newTrans.autoConvert && (
                        <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                           <div className="flex gap-4">
                             <div className="flex-1">
                               <label className="block text-[10px] font-black text-blue-400 mb-1">تبدیل به ارز مقصد</label>
                               <select className="w-full p-3 bg-white rounded-xl text-xs font-bold" value={newTrans.targetCurrency} onChange={e => setNewTrans({...newTrans, targetCurrency: e.target.value})}>
                                  {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                               </select>
                             </div>
                             <div className="flex-1">
                               <label className="block text-[10px] font-black text-blue-400 mb-1">نرخ معامله (اختیاری)</label>
                               <input type="number" placeholder={activeRate.toString()} className="w-full p-3 bg-white rounded-xl text-xs font-bold" onChange={e => setNewTrans({...newTrans, customRate: Number(e.target.value)})} />
                             </div>
                           </div>
                           <div className="grid grid-cols-2 gap-4">
                               <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50">
                                  <p className="text-[9px] font-black text-slate-400 uppercase">خروجی معادل ({newTrans.targetCurrency})</p>
                                  <p className="text-lg font-black text-blue-600">{conversionResult?.converted.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                               </div>
                               <div className="bg-emerald-50 p-4 rounded-2xl shadow-sm border border-emerald-100">
                                  <p className="text-[9px] font-black text-emerald-600 uppercase">سود ناخالص (AFN)</p>
                                  <p className="text-lg font-black text-emerald-700">{newTrans.profit.toLocaleString()}</p>
                               </div>
                           </div>
                        </div>
                    )}
                </div>

                <div className="relative">
                  <label className="block text-xs font-black text-slate-400 mb-2 flex justify-between">توضیحات <button onClick={handleSmartAi} className="text-blue-600 flex items-center gap-1 text-[10px] font-black">{isAiProcessing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} هوشمند</button></label>
                  <textarea className="w-full p-4 bg-slate-50 rounded-2xl text-sm min-h-[80px]" value={newTrans.description} onChange={(e) => setNewTrans({...newTrans, description: e.target.value})} />
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 mb-3 uppercase">ضمائم</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={isRecording ? stopRecording : startRecording} className={`p-6 rounded-[2rem] flex flex-col items-center gap-2 border-2 ${isRecording ? 'bg-rose-50 border-rose-500 text-rose-600 animate-pulse' : 'bg-slate-50 border-transparent text-slate-600'}`}>
                      {isRecording ? <Square size={20} /> : <Mic size={20} />} <span className="text-[10px] font-black uppercase">{isRecording ? 'توقف' : 'ضبط صدا'}</span>
                    </button>
                    <label className="p-6 rounded-[2rem] flex flex-col items-center gap-2 bg-slate-50 text-slate-600 cursor-pointer">
                      <ImageIcon size={20} /> <span className="text-[10px] font-black uppercase">تصویر رسید</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => {
                         const file = e.target.files?.[0];
                         if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => setAttachments(prev => [...prev, { id: Math.random().toString(), type: 'image', data: reader.result as string, mimeType: file.type }]);
                            reader.readAsDataURL(file);
                         }
                      }} />
                    </label>
                  </div>
                </div>
                <div className="bg-slate-50 p-6 rounded-[2.5rem] min-h-[160px] border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 mb-4 uppercase">فایل‌های ضمیمه شده</p>
                  <div className="flex flex-wrap gap-3">
                    {attachments.map((att) => (
                      <div key={att.id} className="relative group w-20 h-20 bg-white rounded-2xl shadow-sm overflow-hidden flex items-center justify-center">
                        {att.type === 'image' ? <img src={att.data} className="w-full h-full object-cover" /> : <Mic className="text-blue-500" />}
                        <button onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} className="absolute inset-0 bg-rose-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all"><Trash2 size={16} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button onClick={handleAddTransaction} className={`flex-[2] py-5 rounded-2xl font-black text-white text-lg ${showTransModal.type === TransactionType.RESID ? 'bg-emerald-600 shadow-xl shadow-emerald-100' : 'bg-rose-600 shadow-xl shadow-rose-100'}`}>ثبت و ارسال برای تائید</button>
              <button onClick={closeTransModal} className="flex-1 bg-slate-100 text-slate-500 py-5 rounded-2xl font-black">انصراف</button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-2xl font-black text-slate-900 mb-8">افتتاح دفتر مشتری جدید</h3>
            <div className="space-y-5">
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none" placeholder="نام کامل مشتری" onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})} />
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none" placeholder="کد" onChange={(e) => setNewCustomer({...newCustomer, code: e.target.value})} />
              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold outline-none" placeholder="تلفن" onChange={(e) => setNewCustomer({...newCustomer, phones: e.target.value})} />
              <button onClick={handleAddCustomer} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg mt-6 shadow-xl">ثبت و ایجاد پرونده</button>
              <button onClick={() => setShowAddModal(false)} className="w-full text-slate-400 py-2 font-bold text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManager;
