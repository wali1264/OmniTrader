
export interface ServiceItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  type: 'labor' | 'part' | 'inspection';
}

export interface Quote {
  id: string;
  customerName: string;
  items: ServiceItem[];
  discount: number;
  splitCount: number;
  taxRate: number;
}

export interface AIResponse {
  advice: string;
  recommendations: string[];
}
