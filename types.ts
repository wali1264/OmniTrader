
export enum TransactionType {
  BOARD = 'برد', 
  RESID = 'رسید', 
  EXCHANGE = 'تبادل' 
}

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export type UserRole = 'admin' | 'operator';

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  fullName: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phones: string[];
  status: 'active' | 'inactive';
  notes: string;
  balances: Record<string, number>;
}

export interface Transaction {
  id: string;
  customerId?: string;
  type: TransactionType;
  amount: number;
  currency: string;
  targetCurrency?: string;
  // Professional Exchange Fields
  buyRate?: number;       // نرخی که با مشتری فیکس شده
  sellRate?: number;      // نرخ فروش بازار (برای محاسبه سود)
  fee?: number;           // کارمزد معامله
  totalBuy?: number;      // مقدار پرداختی/کسری دفتری
  totalSell?: number;     // ارزش واقعی مارکت
  netProfit?: number;     // سود خالص نهایی
  
  exchangeRate?: number;  // Deprecated - kept for compatibility
  convertedAmount?: number;
  description: string;
  timestamp: number;
  status: TransactionStatus;
  isBank: boolean;
  bankAccountId?: string;
  bankFrom?: string;
  bankTo?: string;
  cardLastFour?: string;
  trackingId?: string;
  profit?: number;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  currency: string;
}

export interface GlobalRate {
  currencyCode: string;
  rateToAfn: number;
  lastUpdated: number;
  source: string;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'AFN', label: 'افغانی', symbol: '؋' },
  { code: 'USD', label: 'دالر آمریکا', symbol: '$' },
  { code: 'IRT_BANK', label: 'تومان بانکی', symbol: 'T' },
  { code: 'PKR', label: 'کلدار پاکستان', symbol: '₨' },
  { code: 'EUR', label: 'یورو', symbol: '€' }
];
