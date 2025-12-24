
import React, { useMemo } from 'react';
import { Quote, ServiceItem } from '../types';
import { Plus, Minus, X, Divide, Receipt, CreditCard, Users, Percent } from 'lucide-react';

interface CalculatorSectionProps {
  quote: Quote;
  onUpdateQuote: (quote: Quote) => void;
}

export const CalculatorSection: React.FC<CalculatorSectionProps> = ({ quote, onUpdateQuote }) => {
  
  // 1. MULTIPLICATION: Calculate item totals (Price * Quantity)
  const itemTotals = useMemo(() => {
    return quote.items.map(item => ({
      ...item,
      total: item.unitPrice * item.quantity
    }));
  }, [quote.items]);

  // 2. ADDITION: Sum all item totals
  const subtotal = useMemo(() => {
    return itemTotals.reduce((sum, item) => sum + item.total, 0);
  }, [itemTotals]);

  // 3. SUBTRACTION: Apply discount (Subtotal - Discount)
  const discountedTotal = useMemo(() => {
    return Math.max(0, subtotal - quote.discount);
  }, [subtotal, quote.discount]);

  // Tax calculation
  const taxAmount = discountedTotal * (quote.taxRate / 100);
  const finalTotal = discountedTotal + taxAmount;

  // 4. DIVISION: Split the bill (Final Total / Split Count)
  const splitAmount = useMemo(() => {
    return finalTotal / (quote.splitCount || 1);
  }, [finalTotal, quote.splitCount]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
        <Receipt className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Service Quote Engine</h2>
      </div>

      <div className="p-6 space-y-6">
        {/* Step 1: Multiplication Display */}
        <section>
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3 flex items-center gap-2">
            <X className="w-3 h-3" /> Itemized Billing (Multiplication)
          </h3>
          <div className="space-y-2">
            {itemTotals.map((item) => (
              <div key={item.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  <span className="text-xs text-slate-500">${item.unitPrice.toFixed(2)} × {item.quantity}</span>
                </div>
                <span className="font-mono font-semibold text-slate-900">${item.total.toFixed(2)}</span>
              </div>
            ))}
            {itemTotals.length === 0 && (
              <div className="text-center py-4 text-slate-400 italic text-sm">No items added yet.</div>
            )}
          </div>
        </section>

        {/* Step 2: Addition Display */}
        <div className="border-t border-dashed border-slate-200 pt-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-sm text-slate-600 flex items-center gap-2">
              <Plus className="w-4 h-4 text-green-500" /> Subtotal (Addition)
            </span>
            <span className="font-mono text-lg font-bold text-slate-900">${subtotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Step 3: Subtraction Display */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-1">
                <Minus className="w-3 h-3 text-red-500" /> Discount (Subtraction)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <input 
                  type="number" 
                  value={quote.discount}
                  onChange={(e) => onUpdateQuote({ ...quote, discount: Number(e.target.value) })}
                  className="w-full pl-7 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-1">
                <Percent className="w-3 h-3 text-blue-500" /> Tax Rate
              </label>
              <div className="relative">
                <input 
                  type="number" 
                  value={quote.taxRate}
                  onChange={(e) => onUpdateQuote({ ...quote, taxRate: Number(e.target.value) })}
                  className="w-full pl-4 pr-7 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Final Total */}
        <div className="bg-slate-900 text-white p-5 rounded-xl flex justify-between items-center shadow-lg shadow-slate-200">
          <div>
            <p className="text-xs text-slate-400 uppercase font-bold tracking-widest mb-1">Grand Total</p>
            <h4 className="text-2xl font-black font-mono">${finalTotal.toFixed(2)}</h4>
          </div>
          <div className="text-right">
             <CreditCard className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>

        {/* Step 4: Division Display */}
        <section className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="flex items-center gap-3 mb-4">
             <Users className="w-5 h-5 text-blue-600" />
             <div className="flex-1">
               <label className="text-xs font-bold text-blue-800 uppercase tracking-tighter">Split Bill (Division)</label>
               <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={quote.splitCount}
                  onChange={(e) => onUpdateQuote({ ...quote, splitCount: Number(e.target.value) })}
                  className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
               />
             </div>
             <span className="bg-white px-3 py-1 rounded-full border border-blue-200 text-blue-700 font-bold text-sm">{quote.splitCount}P</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Divide className="w-4 h-4" /> Cost Per Person
            </span>
            <span className="font-mono text-xl font-black text-blue-900">${splitAmount.toFixed(2)}</span>
          </div>
        </section>
      </div>
    </div>
  );
};
