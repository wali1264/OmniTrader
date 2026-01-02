
import React, { useMemo } from 'react';
import { 
  PieChart, TrendingUp, Wallet, Landmark, 
  ArrowUpRight, ArrowDownLeft, ShieldCheck, 
  Target, Calculator, Coins, DollarSign
} from 'lucide-react';
import { Customer, SUPPORTED_CURRENCIES, GlobalRate } from '../types';

interface AssetCalculatorProps {
  customers: Customer[];
  stats: {
    cashBox: Record<string, number>;
  };
  globalRates: GlobalRate[];
}

const AssetCalculator: React.FC<AssetCalculatorProps> = ({ customers, stats, globalRates }) => {
  const currentUsdRate = globalRates.find(r => r.currencyCode === 'USD')?.rateToAfn || 70.5;

  const assetDetails = useMemo(() => {
    const liquidByCurrency: Record<string, number> = {};
    const receivablesByCurrency: Record<string, number> = {};
    const payablesByCurrency: Record<string, number> = {};

    SUPPORTED_CURRENCIES.forEach(curr => {
      liquidByCurrency[curr.code] = stats.cashBox[curr.code] || 0;
      let positive = 0; let negative = 0;
      customers.forEach(c => {
        const bal = c.balances[curr.code] || 0;
        if (bal > 0) positive += bal; else if (bal < 0) negative += Math.abs(bal);
      });
      receivablesByCurrency[curr.code] = positive;
      payablesByCurrency[curr.code] = negative;
    });

    const calculateGrandTotal = (mapping: Record<string, number>) => {
        let totalAfn = 0;
        SUPPORTED_CURRENCIES.forEach(curr => {
            const amount = mapping[curr.code] || 0;
            if (curr.code === 'AFN') totalAfn += amount;
            else if (curr.code === 'USD') totalAfn += amount * currentUsdRate;
            else totalAfn += amount * (currentUsdRate / 10);
        });
        return totalAfn;
    };

    const totalLiquidAfn = calculateGrandTotal(liquidByCurrency);
    const totalReceivablesAfn = calculateGrandTotal(receivablesByCurrency);
    const totalPayablesAfn = calculateGrandTotal(payablesByCurrency);

    return {
      totalLiquidAfn,
      totalAssetsAfn: totalLiquidAfn + totalReceivablesAfn,
      netWorthAfn: (totalLiquidAfn + totalReceivablesAfn) - totalPayablesAfn,
      liquidByCurrency, receivablesByCurrency, payablesByCurrency
    };
  }, [customers, stats, currentUsdRate]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-24">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <AssetCard title="کل دارائی‌ها (Gross)" value={assetDetails.totalAssetsAfn} unit="AFN" icon={<Calculator size={28} />} gradient="from-indigo-600 to-blue-700" description="نقدینگی صندوق + مطالبات" />
        <AssetCard title="نقدینگی صندوق" value={assetDetails.totalLiquidAfn} unit="AFN" icon={<Wallet size={28} />} gradient="from-emerald-500 to-teal-600" description="کل پول نقد موجود در گاوصندوق" />
        <AssetCard title="دارائی خالص (Equity)" value={assetDetails.netWorthAfn} unit="AFN" icon={<ShieldCheck size={28} />} gradient="from-slate-800 to-slate-900" description="سرمایه صرافی پس از کسر بدهی‌ها" highlight />
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 bg-slate-50/30 border-b border-slate-50"><h3 className="text-xl font-black text-slate-900">توازن دارائی به تفکیک واحد پول</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-50">
                <th className="py-6 px-10 font-black text-[10px] uppercase">واحد ارز</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase">موجودی صندوق</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase text-emerald-600">طلب از مشتری</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase text-rose-600">بدهی به مشتری</th>
                <th className="py-6 px-10 font-black text-[10px] uppercase text-left">تراز نهایی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {SUPPORTED_CURRENCIES.map(curr => {
                const liquid = assetDetails.liquidByCurrency[curr.code] || 0;
                const rec = assetDetails.receivablesByCurrency[curr.code] || 0;
                const pay = assetDetails.payablesByCurrency[curr.code] || 0;
                const net = (liquid + rec) - pay;
                return (
                  <tr key={curr.code} className="hover:bg-slate-50/50 group">
                    <td className="py-8 px-10"><p className="font-black text-slate-800">{curr.label}</p></td>
                    <td className="py-8 px-4 font-black text-slate-700">{liquid.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black text-emerald-600">{rec.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black text-rose-500">{pay.toLocaleString()}</td>
                    <td className="py-8 px-10 text-left"><span className={`text-lg font-black ${net >= 0 ? 'text-blue-600' : 'text-rose-700'}`}>{net.toLocaleString()}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AssetCard = ({ title, value, unit, icon, gradient, description, highlight }: any) => (
  <div className={`p-10 rounded-[3.5rem] shadow-xl text-white bg-gradient-to-br ${gradient} relative overflow-hidden`}>
    <div className="relative z-10">
      <div className="p-4 bg-white/10 rounded-2xl mb-6 inline-block">{icon}</div>
      <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">{title}</p>
      <h4 className="text-4xl font-black">{value.toLocaleString()} <span className="text-sm font-bold opacity-70">{unit}</span></h4>
      <p className="text-[10px] mt-6 opacity-40">{description}</p>
    </div>
  </div>
);

export default AssetCalculator;
