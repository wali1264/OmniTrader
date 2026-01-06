
import React, { useMemo, useState, useEffect } from 'react';
import { 
  PieChart, TrendingUp, Wallet, Landmark, 
  ArrowUpRight, ArrowDownLeft, ShieldCheck, 
  Target, Calculator, Coins, DollarSign, Plus, X, Save, AlertCircle, TrendingDown,
  Globe, RefreshCw, Loader2, ExternalLink
} from 'lucide-react';
import { Customer, SUPPORTED_CURRENCIES, GlobalRate } from '../types';
import { GoogleGenAI } from "@google/genai";

interface AssetCalculatorProps {
  customers: Customer[];
  stats: {
    cashBox: Record<string, number>;
  };
  globalRates: GlobalRate[];
}

interface MarketIndex {
  pair: string;
  rate: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

const AssetCalculator: React.FC<AssetCalculatorProps> = ({ customers, stats, globalRates }) => {
  const [isFetchingMarket, setIsFetchingMarket] = useState(false);
  const [marketIndices, setMarketIndices] = useState<MarketIndex[]>([
    { pair: 'USD / AFN', rate: '---', change: '0.00%', trend: 'neutral' },
    { pair: 'EUR / USD', rate: '---', change: '0.00%', trend: 'neutral' },
    { pair: 'USD / PKR', rate: '---', change: '0.00%', trend: 'neutral' },
    { pair: 'EUR / AFN', rate: '---', change: '0.00%', trend: 'neutral' }
  ]);

  const fetchLiveGlobalRates = async () => {
    setIsFetchingMarket(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Give me the latest real-time market exchange rates for: USD to AFN, EUR to USD, USD to PKR, and EUR to AFN. Return only a JSON array of objects with keys: pair, rate, change, trend ('up' or 'down').",
        config: {
          tools: [{ googleSearch: {} }],
        }
      });
      
      // Extracting URLs from search grounding if available
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      console.log("Sources:", sources);

      // Simple extraction of JSON from response text
      const match = response.text.match(/\[.*\]/s);
      if (match) {
        const data = JSON.parse(match[0]);
        setMarketIndices(data);
      }
    } catch (error) {
      console.error("Error fetching live rates:", error);
    } finally {
      setIsFetchingMarket(false);
    }
  };

  useEffect(() => {
    fetchLiveGlobalRates();
  }, []);

  const getRate = (code: string) => {
    if (code === 'AFN') return 1;
    return globalRates.find(r => r.currencyCode === code)?.rateToAfn || 0;
  };

  const [initialAssets, setInitialAssets] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('s_initial_assets');
    return saved ? JSON.parse(saved) : {};
  });
  
  const [showInitialModal, setShowInitialModal] = useState(false);
  const [tempInitial, setTempInitial] = useState<Record<string, number>>({});

  useEffect(() => {
    localStorage.setItem('s_initial_assets', JSON.stringify(initialAssets));
  }, [initialAssets]);

  const openInitialModal = () => {
    setTempInitial({ ...initialAssets });
    setShowInitialModal(true);
  };

  const saveInitialAssets = () => {
    setInitialAssets({ ...tempInitial });
    setShowInitialModal(false);
  };

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

    const calculateInAfn = (mapping: Record<string, number>) => {
        let totalAfn = 0;
        SUPPORTED_CURRENCIES.forEach(curr => {
            const amount = mapping[curr.code] || 0;
            const rate = getRate(curr.code);
            totalAfn += amount * rate;
        });
        return totalAfn;
    };

    const totalLiquidAfn = calculateInAfn(liquidByCurrency);
    const totalReceivablesAfn = calculateInAfn(receivablesByCurrency);
    const totalPayablesAfn = calculateInAfn(payablesByCurrency);
    const totalInitialAfn = calculateInAfn(initialAssets);

    const netWorthAfn = (totalLiquidAfn + totalReceivablesAfn) - totalPayablesAfn;
    const totalGrowth = netWorthAfn - totalInitialAfn;

    return {
      totalLiquidAfn,
      totalAssetsAfn: totalLiquidAfn + totalReceivablesAfn,
      netWorthAfn,
      totalInitialAfn,
      totalGrowth,
      liquidByCurrency, receivablesByCurrency, payablesByCurrency
    };
  }, [customers, stats, globalRates, initialAssets]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24">
      {/* Global Market Rates Section */}
      <section className="bg-[#020617] p-6 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500"></div>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
              <Globe size={18} className={isFetchingMarket ? "animate-spin" : ""} />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Global Market Indices</h3>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-black animate-pulse">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              LIVE MARKET
            </span>
          </div>
          <button 
            onClick={fetchLiveGlobalRates}
            disabled={isFetchingMarket}
            className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"
          >
            {isFetchingMarket ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {marketIndices.map((idx, i) => (
            <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl hover:bg-white/10 transition-all group">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-black text-slate-500 uppercase">{idx.pair}</span>
                <span className={`text-[9px] font-bold ${idx.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {idx.trend === 'up' ? '▲' : '▼'} {idx.change}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-white tabular-nums">{idx.rate}</span>
                <span className="text-[9px] font-bold text-slate-500">{idx.pair.split(' / ')[1]}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-slate-900 text-right">تراز کل دارائی‌ها و سرمایه</h2>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest text-right">Equity & Net Asset Valuation</p>
        </div>
        <button 
          onClick={openInitialModal}
          className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-black transition-all shadow-lg"
        >
          <Plus size={16} /> اضافه کردن دارائی اولیه (سرمایه)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AssetCard title="کل دارائی‌ها (Gross)" value={assetDetails.totalAssetsAfn} unit="AFN" icon={<Calculator size={24} />} gradient="from-indigo-600 to-blue-700" description="نقدینگی صندوق + تمام مطالبات" />
        <AssetCard title="سرمایه اولیه ثبت شده" value={assetDetails.totalInitialAfn} unit="AFN" icon={<Coins size={24} />} gradient="from-amber-500 to-orange-600" description="مجموع کل سرمایه گذاری اولیه" />
        <AssetCard title="دارائی خالص فعلی (Equity)" value={assetDetails.netWorthAfn} unit="AFN" icon={<ShieldCheck size={24} />} gradient="from-slate-800 to-slate-900" description="سرمایه پس از کسر تمام بدهی‌ها" highlight />
        <AssetCard 
          title="میزان رشد / سود کل" 
          value={assetDetails.totalGrowth} 
          unit="AFN" 
          icon={assetDetails.totalGrowth >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />} 
          gradient={assetDetails.totalGrowth >= 0 ? "from-emerald-500 to-teal-600" : "from-rose-500 to-red-600"} 
          description="تفاضل دارائی خالص از سرمایه اولیه" 
        />
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 bg-slate-50/30 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-xl font-black text-slate-900">توازن دارائی به تفکیک واحد پول</h3>
          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-xl text-[10px] font-black">
             <AlertCircle size={14} /> مبنای محاسبات: نرخ‌های لحظه‌ای ارز به افغانی
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="text-slate-400 border-b border-slate-50">
                <th className="py-6 px-10 font-black text-[10px] uppercase">واحد ارز</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase">سرمایه اولیه</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase">موجودی فعلی صندوق</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase text-emerald-600">طلب از مشتری</th>
                <th className="py-6 px-4 font-black text-[10px] uppercase text-rose-600">بدهی به مشتری</th>
                <th className="py-6 px-10 font-black text-[10px] uppercase text-left">تراز خالص فعلی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {SUPPORTED_CURRENCIES.map(curr => {
                const initial = initialAssets[curr.code] || 0;
                const liquid = assetDetails.liquidByCurrency[curr.code] || 0;
                const rec = assetDetails.receivablesByCurrency[curr.code] || 0;
                const pay = assetDetails.payablesByCurrency[curr.code] || 0;
                const net = (liquid + rec) - pay;
                const growth = net - initial;
                
                return (
                  <tr key={curr.code} className="hover:bg-slate-50/50 group transition-all">
                    <td className="py-8 px-10">
                      <p className="font-black text-slate-800">{curr.label}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{curr.code}</p>
                    </td>
                    <td className="py-8 px-4 font-black text-slate-400 tabular-nums">{initial.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black text-slate-700 tabular-nums">{liquid.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black text-emerald-600 tabular-nums">{rec.toLocaleString()}</td>
                    <td className="py-8 px-4 font-black text-rose-500 tabular-nums">{pay.toLocaleString()}</td>
                    <td className="py-8 px-10 text-left">
                      <p className={`text-lg font-black tabular-nums ${net >= 0 ? 'text-blue-600' : 'text-rose-700'}`}>{net.toLocaleString()}</p>
                      <p className={`text-[9px] font-black mt-1 ${growth >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                        {growth >= 0 ? '+' : ''}{growth.toLocaleString()} (رشد)
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showInitialModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl animate-in zoom-in text-right">
             <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-100 text-amber-600 rounded-xl"><Coins size={20} /></div>
                  <h3 className="text-xl font-black text-slate-900">ثبت دارائی اولیه صرافی</h3>
                </div>
                <button onClick={() => setShowInitialModal(false)} className="p-2 hover:bg-slate-50 rounded-full transition-all text-slate-400"><X size={20}/></button>
             </div>
             
             <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">
               مقادیر سرمایه‌ای که در روز شروع صرافی در صندوق یا به عنوان طلب وجود داشته است را اینجا وارد کنید تا میزان سود و رشد صرافی به درستی محاسبه شود.
             </p>

             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {SUPPORTED_CURRENCIES.map(curr => (
                  <div key={curr.code} className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">سرمایه اولیه ({curr.label})</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-xl font-black text-lg outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-right pr-4 pl-12" 
                        placeholder="0"
                        value={tempInitial[curr.code] || ''} 
                        onChange={e => setTempInitial({...tempInitial, [curr.code]: Number(e.target.value)})} 
                      />
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{curr.code}</span>
                    </div>
                  </div>
                ))}
             </div>

             <div className="flex gap-4 mt-10">
                <button onClick={saveInitialAssets} className="flex-1 bg-amber-600 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-900/10 hover:bg-amber-700 transition-all">
                   <Save size={18} /> ذخیره و بروزرسانی تراز
                </button>
                <button onClick={() => setShowInitialModal(false)} className="px-6 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-sm">لغو</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AssetCard = ({ title, value, unit, icon, gradient, description, highlight }: any) => (
  <div className={`p-8 rounded-[2.5rem] shadow-sm text-white bg-gradient-to-br ${gradient} relative overflow-hidden group`}>
    <div className="absolute -right-4 -top-4 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
       {React.cloneElement(icon as React.ReactElement, { size: 64 })}
    </div>
    <div className="relative z-10 text-right">
      <div className="p-3 bg-white/10 rounded-xl mb-4 inline-block">{icon}</div>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-60 mb-2">{title}</p>
      <h4 className="text-2xl font-black tabular-nums">{Math.abs(value).toLocaleString()} <span className="text-[10px] font-bold opacity-70 mr-1">{unit}</span></h4>
      <p className="text-[9px] mt-4 opacity-40 font-bold">{description}</p>
    </div>
  </div>
);

export default AssetCalculator;
