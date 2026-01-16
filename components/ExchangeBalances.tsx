import React, { useMemo, useState, useEffect } from 'react';
import { 
  ArrowRightLeft, TrendingUp, Clock, 
  ChevronRight, ChevronLeft, Calculator, 
  ArrowRight, RefreshCw, X, Wallet
} from 'lucide-react';
import { Transaction, TransactionType, TransactionStatus, SUPPORTED_CURRENCIES, GlobalRate, Customer } from '../types';

const getSystemNow = () => Date.now();

interface ExchangeBalancesProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  globalRates: GlobalRate[];
  customers: Customer[];
}

const ExchangeBalances: React.FC<ExchangeBalancesProps> = ({ transactions, setTransactions, globalRates, customers }) => {
  const [selectedDate, setSelectedDate] = useState(new Date(getSystemNow()));
  const [fromCurr, setFromCurr] = useState('USD');
  const [toCurr, setToCurr] = useState('AFN');
  const [amount, setAmount] = useState<number>(0);
  const [rate, setRate] = useState<number>(0);
  const [op, setOp] = useState<'multiply' | 'divide'>('multiply');
  const [profit, setProfit] = useState<number>(0);
  const [profitCategory, setProfitCategory] = useState('None');
  const [isGuest, setIsGuest] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [guestName, setGuestName] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');

  const convertedAmount = useMemo(() => {
    if (amount <= 0 || rate <= 0) return 0;
    return op === 'multiply' ? amount * rate : amount / rate;
  }, [amount, rate, op]);

  const handleExchange = () => {
    if (amount <= 0 || rate <= 0) return;
    const transaction: Transaction = {
      id: 'EX-' + Math.random().toString(36).substr(2, 5).toUpperCase(),
      customerId: isGuest ? undefined : selectedCustomerId,
      guestName: isGuest ? guestName : undefined,
      type: TransactionType.EXCHANGE,
      amount: amount,
      currency: fromCurr,
      targetCurrency: toCurr,
      exchangeRate: rate,
      convertedAmount: convertedAmount,
      netProfit: profit,
      description: `تبادله ${amount} ${fromCurr} به ${toCurr}`,
      timestamp: getSystemNow(),
      status: TransactionStatus.PENDING,
      isBank: false
    };
    setTransactions(prev => [...prev, transaction]);
    setAmount(0);
    alert("تراکنش ثبت شد.");
  };

  return (
    <div className="space-y-8 pb-24 text-right">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-8">
           <h3 className="text-xl font-black text-slate-900">ماشین تبادله (نقد)</h3>
           <div className="space-y-6">
              <input type="number" className="w-full p-5 bg-slate-50 border rounded-2xl text-2xl font-black text-right" placeholder="مبلغ ورودی" value={amount || ''} onChange={e => setAmount(Number(e.target.value))} />
              <button onClick={handleExchange} className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl">ثبت تبادله در صندوق</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeBalances;