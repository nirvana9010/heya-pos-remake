// Tyro SDK Types

export interface TyroProductInfo {
  posProductVendor: string;
  posProductName: string;
  posProductVersion: string;
}

export interface TyroTransactionResponse {
  result: TyroTransactionResult;
  transactionReference: string;
  authorisationCode: string;
  surchargeAmount: number;
  baseAmount: number;
  transactionId?: string;
  message?: string;
  customerReceipt?: string;
  merchantReceipt?: string;
}

export enum TyroTransactionResult {
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
  DECLINED = 'DECLINED',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  NOT_STARTED = 'NOT_STARTED',
  REVERSAL_FAILED = 'REVERSAL_FAILED',
}

export interface TyroTransactionCallbacks {
  transactionCompleteCallback?: (response: TyroTransactionResponse) => void;
  receiptCallback?: (receipt: any) => void;
}

export interface TyroPurchaseParams {
  amount: string;
  cashout: number;
  integratedReceipt: boolean;
  enableSurcharge: boolean;
}

export interface TyroRefundParams {
  amount: string;
  integratedReceipt: boolean;
}

// Tyro SDK global type declaration
declare global {
  interface Window {
    TYRO?: {
      IClientWithUI: new (apiKey: string, productInfo: TyroProductInfo) => {
        pairTerminal: (merchantId: string, terminalId: string, callback: (response: any) => void) => void;
        initiatePurchase: (params: TyroPurchaseParams, callbacks: TyroTransactionCallbacks) => void;
        initiateRefund: (params: TyroRefundParams, callbacks: TyroTransactionCallbacks) => void;
      };
    };
  }
}