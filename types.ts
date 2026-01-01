
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
  password: string;
  role: UserRole;
  fullName: string;
}

export interface Attachment {
  id: string;
  type: 'image' | 'audio';
  data: string; // base64 string
  mimeType: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  phones: string[];
  status: 'active' | 'inactive';
  notes: string;
  balances: {
    [currencyCode: string]: number;
  };
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  balance: number;
  currency: string;
}

export interface Transaction {
  id: string;
  customerId?: string;
  type: TransactionType;
  amount: number; 
  currency: string; 
  trackingId?: string;
  cardLastFour?: string;
  senderPhoneLastFour?: string;
  description: string;
  timestamp: number;
  status: TransactionStatus;
  bankAccountId?: string;
  sourceAccountId?: string;
  exchangeRate?: number; // Rate of source currency TO AFN
  targetRate?: number;   // Rate of target currency TO AFN
  convertedAmount?: number; 
  targetCurrency?: string;  
  profit?: number;
  attachments?: Attachment[];
}

export interface GlobalRate {
  currencyCode: string; // e.g., "USD"
  rateToAfn: number;    // e.g., 72.5
  lastUpdated: number;
  source: string;
}

export const SUPPORTED_CURRENCIES = [
  { code: 'USD', label: 'دالر (USD)', symbol: '$' },
  { code: 'AFN', label: 'افغانی (AFN)', symbol: '؋' },
  { code: 'IRT_CASH', label: 'تومان نقدی', symbol: 'T' },
  { code: 'IRT_BANK', label: 'تومان بانکی', symbol: 'TB' },
  { code: 'EUR', label: 'یورو (EUR)', symbol: '€' },
  { code: 'PKR', label: 'کالدار (PKR)', symbol: '₨' },
];
