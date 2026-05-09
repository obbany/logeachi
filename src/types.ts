export type UserStatus = 'active' | 'inactive';
export type UserRole = 'user' | 'admin';

export interface User {
  id?: string;
  uid: string;
  shortId?: string;
  phone: string;
  name: string;
  photoURL?: string;
  status: UserStatus;
  balance: number;
  totalWithdraw: number;
  totalReferralEarnings?: number;
  referralCode: string;
  referredBy?: string;
  country: string;
  role: UserRole;
  createdAt: string;
  packageId?: string;
  packageName?: string;
  planExpiresAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  platform: string;
  category?: string;
  thumbnail?: string;
  url: string;
  status: 'available' | 'paused';
  createdAt: string;
  packageId?: string;
  type?: 'regular' | 'bonus';
}

export interface Submission {
  id: string;
  userId: string;
  userShortId?: string;
  taskId: string;
  screenshotUrl: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userShortId?: string;
  amount: number;
  method: 'bkash' | 'nagad' | 'rocket';
  phone: string;
  status: 'pending' | 'success' | 'rejected';
  createdAt: string;
}

export interface PackagePlan {
  id: string;
  name: string;
  price: number;
  dailyIncome: number;
  validity: number;
  taskCount?: number;
}

export interface Config {
  bkashNumber: string;
  rocketNumber: string;
  activationFee: number;
  minWithdraw: number;
  paymentMode?: 'Send Money' | 'Cash Out';
}

export interface Activation {
  id: string;
  userId: string;
  userShortId?: string;
  phone: string;
  method: string;
  transactionId: string;
  amount: number;
  packageId?: string;
  packageName?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  planExpiresAt?: string;
}
