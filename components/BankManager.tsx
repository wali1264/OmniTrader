
import React, { useState } from 'react';
import { Landmark, Plus, CreditCard, ExternalLink, RefreshCw, ArrowUpRight, ArrowDownLeft, Info } from 'lucide-react';
import { BankAccount, Transaction, TransactionType, TransactionStatus, Customer } from '../types';

interface BankManagerProps {
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  customers: Customer[];
}

const BankManager: React.FC<BankManagerProps> = ({ bankAccounts, setBankAccounts, transactions, setTransactions, customers }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBankTransModal, setShowBankTransModal] = useState(false);
  const [activeBank, setActiveBank] = useState<BankAccount | null>(null);

  // States for modals
  const [newBank, setNewBank] = useState({ name: '', number: '', balance: 0, currency: 'IRT' });
  const [bankTrans, setBankTrans] = useState({
    type: TransactionType.RESID,
    amount: 0,
    destBankId: '',
    sourceId: '', // Could be bank ID or customer ID
    phoneLastFour: '',
    cardLastFour: '',
    trackingId: '',
    description: ''
  });

  const handleAddBank = () => {
    const account: BankAccount = {
      id: Math.random().toString(36).substr(2, 9),
      bankName: newBank.name,
      accountNumber: newBank.number,
      balance: Number(newBank.balance),
      currency: newBank.currency
    };
    setBankAccounts(prev => [...prev, account]);
    setShowAddModal(false);
    setNewBank({ name: '', number: '', balance: 0, currency: 'IRT' });
  };

  const handleOpenBankTrans = (bank: BankAccount) => {
    setActiveBank(bank);
    setBankTrans({
      ...bankTrans,
      destBankId: bank.id,
      amount: 0,
      description: `تراکنش مربوط به ${bank.bankName}`
    });
    setShowBankTransModal(true);
  };

  const handleSubmitBankTrans = () => {
    if (!activeBank) return;

    const transaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      type: bankTrans.type,
      amount: Number(bankTrans.amount),
      currency: activeBank.currency,
      bankAccountId: bankTrans.destBankId,
      sourceAccountId: bankTrans.sourceId,
      trackingId: bankTrans.trackingId,
      cardLastFour: bankTrans.cardLastFour,
      senderPhoneLastFour: bankTrans.phoneLastFour,
      description: bankTrans.description,
      timestamp: Date.now(),
      status: TransactionStatus.PENDING
    };

    setTransactions(prev => [...prev, transaction]);
    setShowBankTransModal(false);
    alert('تراکنش بانکی ثبت شد و در انتظار تائید نهایی مدیریت است.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-slate-800">حسابات بانکی ایران</h3>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center gap-2 transition-all"
        >
          <Plus size={20} /> افزودن حساب بانکی جدید
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {bankAccounts.map(account => (
          <div key={account.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>
            <div className="flex justify-between items-start mb-6">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Landmark size={24} />
              </div>
              <button 
                onClick={() => handleOpenBankTrans(account)}
                className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition-colors"
              >
                <RefreshCw size={14} /> برد و رسید
              </button>
            </div>
            
            <h4 className="text-xl font-bold text-slate-800 mb-1">{account.bankName}</h4>
            <p className="text-sm text-slate-400 font-mono tracking-widest mb-6">{account.accountNumber}</p>
            
            <div className="flex items-end justify-between border-t border-slate-50 pt-6">
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-1 uppercase">موجودی فعلی</p>
                <h5 className="text-2xl font-black text-slate-900">{account.balance.toLocaleString()}</h5>
              </div>
              <span className="text-xs font-black text-blue-600 uppercase">{account.currency}</span>
            </div>

            <div className="mt-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">مشاهده گردش</button>
              <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><ExternalLink size={16} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Bank Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl animate-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-slate-800 mb-6">ثبت حساب بانکی جدید</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">نام بانک (صادرات، سپه، ...)</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                  onChange={(e) => setNewBank({...newBank, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">شماره حساب / شبا</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono" 
                  onChange={(e) => setNewBank({...newBank, number: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">موجودی اولیه</label>
                  <input 
                    type="number" 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm" 
                    onChange={(e) => setNewBank({...newBank, balance: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">واحد پول</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    onChange={(e) => setNewBank({...newBank, currency: e.target.value})}
                  >
                    <option value="IRT">تومان ایران (IRT)</option>
                    <option value="AFN">افغانی (AFN)</option>
                    <option value="USD">دلار (USD)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={handleAddBank}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700"
                >
                  ثبت حساب
                </button>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200"
                >
                  لغو
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Transaction Modal (Board & Resid) */}
      {showBankTransModal && activeBank && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in duration-300 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <RefreshCw size={24} />
                </div>
                <h3 className="text-xl font-black text-slate-800">تراکنش بانکی: {activeBank.bankName}</h3>
              </div>
              <button onClick={() => setShowBankTransModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>

            <div className="space-y-5">
              {/* Type Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-2xl">
                <button 
                  onClick={() => setBankTrans({...bankTrans, type: TransactionType.RESID})}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${bankTrans.type === TransactionType.RESID ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                >
                  <ArrowDownLeft size={16} /> رسید (واریز به بانک)
                </button>
                <button 
                  onClick={() => setBankTrans({...bankTrans, type: TransactionType.BOARD})}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${bankTrans.type === TransactionType.BOARD ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}
                >
                  <ArrowUpRight size={16} /> برد (برداشت از بانک)
                </button>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 mr-1">مقدار پول (قابل ویرایش)</label>
                <div className="relative">
                  <input 
                    type="number" 
                    placeholder="مبلغ را وارد کنید..."
                    className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl text-lg font-black outline-none transition-all" 
                    value={bankTrans.amount || ''}
                    onChange={(e) => setBankTrans({...bankTrans, amount: Number(e.target.value)})}
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm uppercase">{activeBank.currency}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Destination Bank */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 mr-1">حساب مقصد (واریز شده به)</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    value={bankTrans.destBankId}
                    onChange={(e) => setBankTrans({...bankTrans, destBankId: e.target.value})}
                  >
                    {bankAccounts.map(b => (
                      <option key={b.id} value={b.id}>{b.bankName} - {b.accountNumber.substr(-4)}</option>
                    ))}
                  </select>
                </div>
                {/* Source Account */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 mr-1">حساب مبدأ (پول از کجا آمده)</label>
                  <select 
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                    value={bankTrans.sourceId}
                    onChange={(e) => setBankTrans({...bankTrans, sourceId: e.target.value})}
                  >
                    <option value="">سایر / نامشخص</option>
                    <optgroup label="بانک‌ها">
                      {bankAccounts.filter(b => b.id !== activeBank.id).map(b => (
                        <option key={b.id} value={b.id}>{b.bankName}</option>
                      ))}
                    </optgroup>
                    <optgroup label="مشتریان">
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* Card Last 4 */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 mr-1">۴ رقم آخر کارت</label>
                  <input 
                    type="text" 
                    maxLength={4}
                    placeholder="1234"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" 
                    value={bankTrans.cardLastFour}
                    onChange={(e) => setBankTrans({...bankTrans, cardLastFour: e.target.value})}
                  />
                </div>
                {/* Phone Last 4 */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 mr-1">۴ رقم شماره تماس</label>
                  <input 
                    type="text" 
                    maxLength={4}
                    placeholder="9821"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" 
                    value={bankTrans.phoneLastFour}
                    onChange={(e) => setBankTrans({...bankTrans, phoneLastFour: e.target.value})}
                  />
                </div>
                {/* Tracking ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2 mr-1">شماره پیگیری</label>
                  <input 
                    type="text" 
                    placeholder="پیگیری..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" 
                    value={bankTrans.trackingId}
                    onChange={(e) => setBankTrans({...bankTrans, trackingId: e.target.value})}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 mr-1">توضیحات تراکنش</label>
                <textarea 
                  rows={2}
                  placeholder="دلیل واریز، نام شخص یا نوع معامله..."
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500" 
                  value={bankTrans.description}
                  onChange={(e) => setBankTrans({...bankTrans, description: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={handleSubmitBankTrans}
                  className="flex-[2] bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-black transition-all active:scale-95"
                >
                  ثبت نهایی تراکنش بانکی
                </button>
                <button 
                  onClick={() => setShowBankTransModal(false)}
                  className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankManager;
