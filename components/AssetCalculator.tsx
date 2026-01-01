
import React, { useMemo } from 'react';
import { 
  PieChart, TrendingUp, Wallet, Landmark, 
  ArrowUpRight, ArrowDownLeft, ShieldCheck, 
  Target, Calculator, Coins, DollarSign
} from 'lucide-react';
import { Customer, BankAccount, SUPPORTED_CURRENCIES, GlobalRate } from '../types';

interface AssetCalculatorProps {
  customers: Customer[];
  bankAccounts: BankAccount[];
  stats: {
    cashBox: Record<string, number>;
    bankSums: Record<string, number>;
  };
  globalRates: GlobalRate[];
}

const AssetCalculator: React.FC<AssetCalculatorProps> = ({ customers, bankAccounts, stats, globalRates }) => {
  // Fix: Property names to match GlobalRate definition in types.ts (currencyCode/rateToAfn)
  const currentUsdRate = globalRates.find(r => r.currencyCode === 'USD')?.rateToAfn || 70.5;

  const assetDetails = useMemo(() => {
    const liquidByCurrency: Record<string, number> = {};
    const receivablesByCurrency: Record<string, number> = {};
    const payablesByCurrency: Record<string, number> = {};

    SUPPORTED_CURRENCIES.forEach(curr => {
      // 1. Liquid Assets (Cash + Banks)
      const cash = stats.cashBox[curr.code] || 0;
      const banks = stats.bankSums[curr.code] || 0;
      liquidByCurrency[curr.code] = cash + banks;

      // 2. Customer Balances
      let positive = 0; // Receivables (Assets)
      let negative = 0; // Payables (Liabilities)

      customers.forEach(c => {
        const bal = c.balances[curr.code] || 0;
        if (bal > 0) positive += bal;
        else if (bal < 0) negative += Math.abs(bal);
      });

      receivablesByCurrency[curr.code] = positive;
      payablesByCurrency[curr.code] = negative;
    });

    // Totals across all currencies (using USD as base or just summing if needed, 
    // but here we show separate totals for clarity and a grand total in AFN equivalent)
    
    const calculateGrandTotal = (mapping: Record<string, number>) => {
        let totalAfn = 0;
        SUPPORTED_CURRENCIES.forEach(curr => {
            const amount = mapping[curr.code] || 0;
            if (curr.code === 'AFN') totalAfn += amount;
            else if (curr.code === 'USD') totalAfn += amount * currentUsdRate;
            else {
                // Approximate conversion for others (IRT, EUR etc)
                const rate = curr.code === 'EUR' ? currentUsdRate * 1.08 : currentUsdRate / 10;
                totalAfn += amount * rate;
            }
        });
        return totalAfn;
    };

    const totalLiquidAfn = calculateGrandTotal(liquidByCurrency);
    const totalReceivablesAfn = calculateGrandTotal(receivablesByCurrency);
    const totalPayablesAfn = calculateGrandTotal(payablesByCurrency);

    return {
      liquidByCurrency,
      receivablesByCurrency,
      payablesByCurrency,
      totalLiquidAfn,
      totalReceivablesAfn,
      totalPayablesAfn,
      totalAssetsAfn: totalLiquidAfn + totalReceivablesAfn,
      netWorthAfn: (totalLiquidAfn + totalReceivablesAfn) - totalPayablesAfn
    };
  }, [customers, stats, currentUsdRate]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      
      {/* 1. Main High-Level Assets Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Total Assets (Gross Wealth) */}
        <AssetCard 
          title="مجموعه کل دارائی‌ها (Gross)"
          value={assetDetails.totalAssetsAfn}
          unit="AFN"
          icon={<Calculator size={28} className="text-white" />}
          gradient="from-indigo-600 to-blue-700"
          description="مجموع نقدینگی + مطالبات از مشتریان"
        />

        {/* Gross Assets (Liquid) */}
        <AssetCard 
          title="مجموع نقدینگی (Liquid)"
          value={assetDetails.totalLiquidAfn}
          unit="AFN"
          icon={<Wallet size={28} className="text-white" />}
          gradient="from-emerald-500 to-teal-600"
          description="مجموع موجودی نقد در صندوق و بانک‌ها"
        />

        {/* Net Worth (Equity) */}
        <AssetCard 
          title="مجموعه دارائی خالص (Net)"
          value={assetDetails.netWorthAfn}
          unit="AFN"
          icon={<ShieldCheck size={28} className="text-white" />}
          gradient="from-slate-800 to-slate-900"
          description="کل دارائی‌ها پس از کسر بدهی به مشتریان"
          highlight
        />

      </div>

      {/* 2. Detailed Breakdown Table */}
      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div>
            <h3 className="text-xl font-black text-slate-900">جزئیات دارائی به تفکیک ارز</h3>
            <p className="text-xs text-slate-400 mt-1 font-medium italic">بررسی وضعیت بدهی، طلب و موجودی هر واحد پول</p>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
            <TrendingUp size={16} className="text-blue-500" />
            <span className="text-[10px] font-black text-slate-500">نرخ پایه: {currentUsdRate} AFN</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-50">
                <th className="py-6 px-10 font-black text-[10px] uppercase tracking-widest">واحد ارز</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest">نقدینگی (صندوق+بانک)</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest text-emerald-600">طلب از مشتری (Receivable)</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase tracking-widest text-rose-600">بدهی به مشتری (Payable)</th>
                <th className="py-6 px-10 font-black text-[10px] uppercase tracking-widest text-left">خالص نقدینگی ارز</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {SUPPORTED_CURRENCIES.map(curr => {
                const liquid = assetDetails.liquidByCurrency[curr.code] || 0;
                const rec = assetDetails.receivablesByCurrency[curr.code] || 0;
                const pay = assetDetails.payablesByCurrency[curr.code] || 0;
                const netInCurrency = (liquid + rec) - pay;

                return (
                  <tr key={curr.code} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-8 px-10">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">{curr.symbol}</div>
                         <div>
                            <p className="font-black text-slate-800">{curr.label}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{curr.code}</p>
                         </div>
                      </div>
                    </td>
                    <td className="py-8 px-4 font-black text-base text-slate-700">{liquid.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black text-base text-emerald-600">{rec.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black text-base text-rose-500">{pay.toLocaleString()}</td>
                    <td className="py-8 px-10 text-left">
                       <span className={`text-lg font-black ${netInCurrency >= 0 ? 'text-blue-600' : 'text-rose-700'}`}>
                         {netInCurrency.toLocaleString()}
                       </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Valuation Disclaimer */}
      <div className="bg-amber-50/50 p-8 rounded-[2.5rem] border border-amber-100 flex items-start gap-5">
         <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
           <Target size={24} />
         </div>
         <div>
            <h4 className="font-black text-amber-900 mb-1">راهنمای ارزیابی دارائی‌ها</h4>
            <p className="text-xs text-amber-700/80 leading-relaxed font-medium">
               محاسبات این صفحه بر اساس تراکنش‌های <strong>تائید شده</strong> انجام می‌شود. دارائی خالص (Net Worth) نشان‌دهنده توانایی مالی واقعی صرافی پس از تسویه تمام حساب‌های مشتریان است. توجه داشته باشید که تبدیل ارزهای مختلف به افغانی بر اساس آخرین نرخ ثبت شده در سیستم (Global Rates) صورت می‌گیرد.
            </p>
         </div>
      </div>

    </div>
  );
};

interface AssetCardProps {
  title: string;
  value: number;
  unit: string;
  icon: React.ReactNode;
  gradient: string;
  description: string;
  highlight?: boolean;
}

const AssetCard: React.FC<AssetCardProps> = ({ title, value, unit, icon, gradient, description, highlight }) => (
  <div className={`relative overflow-hidden p-10 rounded-[3.5rem] shadow-2xl transition-all hover:-translate-y-2 duration-500 bg-gradient-to-br ${gradient} text-white`}>
    {/* Decorative blur background */}
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 blur-[60px] rounded-full pointer-events-none"></div>
    
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-8">
        <div className="p-4 bg-white/10 backdrop-blur-md rounded-[1.5rem] border border-white/10">
          {icon}
        </div>
        {highlight && (
          <span className="px-4 py-1.5 bg-blue-400 text-blue-900 text-[9px] font-black rounded-full uppercase tracking-widest shadow-lg animate-pulse">
            ارزش واقعی
          </span>
        )}
      </div>
      
      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">{title}</p>
      <div className="flex items-baseline gap-3">
        <h4 className="text-4xl font-black">{value.toLocaleString()}</h4>
        <span className="text-sm font-bold opacity-70">{unit}</span>
      </div>
      <p className="text-[10px] font-medium mt-6 opacity-40 italic">{description}</p>
    </div>
  </div>
);

export default AssetCalculator;
