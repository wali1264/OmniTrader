
import React, { useState } from 'react';
import { ServiceItem } from '../types';
import { PlusCircle, Trash2, Wrench, Package, Search } from 'lucide-react';

interface ServiceFormProps {
  items: ServiceItem[];
  onItemsChange: (items: ServiceItem[]) => void;
}

export const ServiceForm: React.FC<ServiceFormProps> = ({ items, onItemsChange }) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState<number>(0);
  const [newItemQty, setNewItemQty] = useState<number>(1);
  const [newItemType, setNewItemType] = useState<ServiceItem['type']>('labor');

  const addItem = () => {
    if (!newItemName || newItemPrice <= 0) return;
    
    const newItem: ServiceItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: newItemName,
      unitPrice: newItemPrice,
      quantity: newItemQty,
      type: newItemType
    };
    
    onItemsChange([...items, newItem]);
    setNewItemName('');
    setNewItemPrice(0);
    setNewItemQty(1);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Wrench className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Line Items</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="md:col-span-5">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Description</label>
          <input 
            type="text"
            placeholder="e.g. Synthetic Oil Change"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Unit Price</label>
          <input 
            type="number"
            placeholder="0.00"
            value={newItemPrice || ''}
            onChange={(e) => setNewItemPrice(Number(e.target.value))}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>
        <div className="md:col-span-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Qty</label>
          <input 
            type="number"
            min="1"
            value={newItemQty}
            onChange={(e) => setNewItemQty(Number(e.target.value))}
            className="w-full px-2 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-center"
          />
        </div>
        <div className="md:col-span-3">
          <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Category</label>
          <select 
            value={newItemType}
            onChange={(e) => setNewItemType(e.target.value as ServiceItem['type'])}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          >
            <option value="labor">Labor</option>
            <option value="part">Parts</option>
            <option value="inspection">Inspection</option>
          </select>
        </div>
        <div className="md:col-span-1 flex items-end">
          <button 
            onClick={addItem}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-[38px] rounded-lg flex items-center justify-center transition-all shadow-md active:scale-95"
          >
            <PlusCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {items.map(item => (
          <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-blue-200 transition-colors group">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${
                item.type === 'labor' ? 'bg-amber-100 text-amber-700' : 
                item.type === 'part' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {item.type === 'part' ? <Package className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800">{item.name}</h4>
                <p className="text-xs text-slate-400 capitalize">{item.type} • ${item.unitPrice} per unit</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm text-slate-600">x{item.quantity}</span>
              <button 
                onClick={() => removeItem(item.id)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Search className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-sm font-medium">Add service items to start your estimate</p>
          </div>
        )}
      </div>
    </div>
  );
};
