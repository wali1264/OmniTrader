
export enum TransactionType {
  BOARD = 'برد', 
  RESID = 'رسید',
  EXCHANGE = 'تبادله'
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
  guestName?: string; 
  type: TransactionType;
  amount: number;
  currency: string;
  description: string;
  timestamp: number;
  status: TransactionStatus;
  isBank: boolean;
  bankAccountId?: string;
  // Bank & Tracking Metadata
  trackingId?: string;
  bankFrom?: string;
  bankTo?: string;
  cardLastFour?: string;
  // Exchange Metadata
  targetCurrency?: string;
  exchangeRate?: number;
  convertedAmount?: number;
  netProfit?: number;
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
  { code: 'USD', label: 'دالر', symbol: '$' },
  { code: 'IRT_CASH', label: 'تومان نقد', symbol: '💵' },
  { code: 'IRT_BANK', label: 'تومان بانک', symbol: '💳' },
  { code: 'PKR', label: 'کلدار', symbol: '₨' }
];
