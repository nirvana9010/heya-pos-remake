import { useCallback } from 'react';
import { 
  TyroTransactionResponse, 
  TyroTransactionCallbacks,
  TyroPurchaseParams,
  TyroRefundParams,
  TyroTransactionResult 
} from '../types/tyro';
import { TYRO_PRODUCT_INFO, TYRO_CONFIG, TYRO_STORAGE_KEYS } from '../constants/tyro';

export const useTyro = () => {
  /**
   * Initialize Tyro client
   */
  const getIClientWithUI = useCallback(() => {
    if (!window.TYRO) {
      throw new Error('Tyro SDK not loaded. Please ensure iclient-with-ui-v1.js is included.');
    }

    if (!TYRO_CONFIG.apiKey) {
      throw new Error('Tyro API key not configured');
    }

    // Check if client exists in session storage
    const storedClient = sessionStorage.getItem(TYRO_STORAGE_KEYS.CLIENT);
    
    const iClient = storedClient && storedClient !== ''
      ? Object.assign(new window.TYRO.IClientWithUI(TYRO_CONFIG.apiKey, TYRO_PRODUCT_INFO), JSON.parse(storedClient))
      : new window.TYRO.IClientWithUI(TYRO_CONFIG.apiKey, TYRO_PRODUCT_INFO);
    
    return iClient;
  }, []);

  /**
   * Pair terminal with application
   */
  const pairTerminal = useCallback((
    merchantId: string, 
    terminalId: string, 
    callback: (response: any) => void
  ) => {
    try {
      const iClient = getIClientWithUI();
      
      iClient.pairTerminal(merchantId, terminalId, (response: any) => {
        callback(response);
        
        if (response.status === 'success') {
          // Store client and pairing info in session
          sessionStorage.setItem(TYRO_STORAGE_KEYS.CLIENT, JSON.stringify(iClient));
          sessionStorage.setItem(TYRO_STORAGE_KEYS.MERCHANT_ID, merchantId);
          sessionStorage.setItem(TYRO_STORAGE_KEYS.TERMINAL_ID, terminalId);
        }
      });
    } catch (error) {
      console.error('Terminal pairing error:', error);
      callback({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }, [getIClientWithUI]);

  /**
   * Process payment
   */
  const purchase = useCallback((
    amount: number, 
    callbacks?: TyroTransactionCallbacks
  ) => {
    try {
      const amountInCents = (amount * 100).toFixed(0);
      const purchaseParams = { 
        amount: amountInCents, 
        cashout: 0, 
        integratedReceipt: true, 
        enableSurcharge: true 
      };

      const iClient = getIClientWithUI();
      
      iClient.initiatePurchase(purchaseParams, {
        receiptCallback: (receipt: any) => {
          console.log('Tyro receipt received:', receipt);
          callbacks?.receiptCallback?.(receipt);
        },
        transactionCompleteCallback: (response: TyroTransactionResponse) => {
          console.log('Tyro transaction complete:', response);
          callbacks?.transactionCompleteCallback?.(response);
        },
      });
    } catch (error) {
      console.error('Purchase error:', error);
      // Call the callback with an error response
      callbacks?.transactionCompleteCallback?.({
        result: TyroTransactionResult.SYSTEM_ERROR,
        transactionReference: '',
        authorisationCode: '',
        surchargeAmount: 0,
        baseAmount: amount * 100,
      });
    }
  }, [getIClientWithUI]);

  /**
   * Process refund
   */
  const refund = useCallback((
    amount: number, 
    callbacks?: TyroTransactionCallbacks
  ) => {
    try {
      const amountInCents = (amount * 100).toFixed(0);
      
      const iClient = getIClientWithUI();
      
      iClient.initiateRefund(
        { amount: amountInCents, integratedReceipt: true },
        {
        receiptCallback: (receipt: any) => {
          console.log('Tyro refund receipt received:', receipt);
          callbacks?.receiptCallback?.(receipt);
        },
        transactionCompleteCallback: (response: TyroTransactionResponse) => {
          console.log('Tyro refund complete:', response);
          callbacks?.transactionCompleteCallback?.(response);
        },
      });
    } catch (error) {
      console.error('Refund error:', error);
      // Call the callback with an error response
      callbacks?.transactionCompleteCallback?.({
        result: TyroTransactionResult.SYSTEM_ERROR,
        transactionReference: '',
        authorisationCode: '',
        surchargeAmount: 0,
        baseAmount: amount * 100,
      });
    }
  }, [getIClientWithUI]);

  /**
   * Check if Tyro is available
   */
  const isAvailable = useCallback(() => {
    return !!(window.TYRO && TYRO_CONFIG.apiKey);
  }, []);

  /**
   * Check if terminal is paired
   */
  const isPaired = useCallback(() => {
    return !!(
      sessionStorage.getItem(TYRO_STORAGE_KEYS.MERCHANT_ID) &&
      sessionStorage.getItem(TYRO_STORAGE_KEYS.TERMINAL_ID)
    );
  }, []);

  /**
   * Get stored pairing information
   */
  const getPairingInfo = useCallback(() => {
    return {
      merchantId: sessionStorage.getItem(TYRO_STORAGE_KEYS.MERCHANT_ID),
      terminalId: sessionStorage.getItem(TYRO_STORAGE_KEYS.TERMINAL_ID),
    };
  }, []);

  /**
   * Clear pairing information
   */
  const clearPairing = useCallback(() => {
    sessionStorage.removeItem(TYRO_STORAGE_KEYS.CLIENT);
    sessionStorage.removeItem(TYRO_STORAGE_KEYS.MERCHANT_ID);
    sessionStorage.removeItem(TYRO_STORAGE_KEYS.TERMINAL_ID);
  }, []);

  return {
    pairTerminal,
    purchase,
    refund,
    isAvailable,
    isPaired,
    getPairingInfo,
    clearPairing,
  };
};