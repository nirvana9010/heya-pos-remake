declare global {
  interface Window {
    TYRO: {
      IClientWithUI: new (apiKey: string, productInfo: any) => any;
    };
  }
}

export interface TyroProductInfo {
  posProductVendor: string;
  posProductName: string;
  posProductVersion: string;
}

export enum TyroTransactionResult {
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  REVERSED = 'REVERSED',
  CANCELLED = 'CANCELLED',
  SYSTEM_ERROR = 'SYSTEM ERROR',
}

export interface TyroTransactionResponse {
  result: TyroTransactionResult;
  transactionReference: string;
  authorisationCode: string;
  surchargeAmount: number;
  baseAmount: number;
}

export interface TyroTransactionCallbacks {
  receiptCallback?: (receipt: any) => void;
  transactionCompleteCallback?: (response: TyroTransactionResponse) => void;
}

export interface TyroPurchaseParams {
  amount: string; // Amount in cents as string
  cashout: number;
  integratedReceipt: boolean;
  enableSurcharge: boolean;
}

export interface TyroRefundParams {
  amount: string; // Amount in cents as string
  integratedReceipt: boolean;
}

export {};