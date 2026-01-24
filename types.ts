
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

export enum WalkinStatus {
  SETTLED = 'settled',
  DEBTOR = 'debtor',
  CREDITOR = 'creditor'
}

export enum CalculationMethod {
  MACHINE = 'ماشینی',
  MANUAL = 'دستی'
}

export enum BankReceiptStatus {
  PENDING = 'در انتظار',
  APPROVED = 'تأیید شده',
  REJECTED = 'رد شده'
}

export interface BankReceiptLog {
  status: BankReceiptStatus;
  comment: string;
  timestamp: number;
  userName: string;
}

export interface BankReceipt {
  id: string;
  walkinTransactionId: string;
  customerName: string;
  bankName: string;
  amount: number;
  currency: string;
  trackingId: string;
  timestamp: number;
  image?: string;
  description: string;
  status: BankReceiptStatus;
  statusLogs: BankReceiptLog[];
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
  isLocked?: boolean;
  lastLockedTimestamp?: number;
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
  // Walk-in Specific
  isWalkin?: boolean;
  walkinStatus?: WalkinStatus;
  remainingAmount?: number;
  remainingCurrency?: string;
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
  profitCategory?: string;
  calculationMethod?: CalculationMethod;
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
  { code: 'EUR', label: 'ایرو', symbol: '€' },
  { code: 'PKR', label: 'کلدار', symbol: '₨' },
  { code: 'IRT_CASH', label: 'تومان نقد (بانک‌نوت)', symbol: '💵' },
  { code: 'IRT_BANK', label: 'تومان حواله (بانک)', symbol: '💳' }
];
