import { TyroProductInfo } from '../types/tyro';

export const TYRO_PRODUCT_INFO: TyroProductInfo = {
  posProductVendor: 'HEYA',
  posProductName: 'HEYA POS',
  posProductVersion: '2.0.0',
};

// Environment variables for Tyro
export const TYRO_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_TYRO_API_KEY || '',
  merchantId: process.env.NEXT_PUBLIC_TYRO_MERCHANT_ID || '',
  environment: process.env.NEXT_PUBLIC_TYRO_ENVIRONMENT || 'sandbox',
};

// Local storage keys
export const TYRO_STORAGE_KEYS = {
  CLIENT: 'tyro_client',
  MERCHANT_ID: 'tyro_mid',
  TERMINAL_ID: 'tyro_tid',
};