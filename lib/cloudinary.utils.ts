// lib/cloudinary.utils.ts
// Cloudinary image URL parser and fallback handler

/**
 * Parse and validate Cloudinary URL
 * @param url - Cloudinary URL from database
 * @returns Transformed or fallback URL
 */
export const parseCloudinaryURL = (url?: string | null): string => {
  if (!url || url.trim() === '') {
    return getFallbackImageURL('account');
  }

  // Check if URL is already a valid Cloudinary URL
  if (url.includes('cloudinary.com') || url.includes('res.cloudinary.com')) {
    return url;
  }

  // If it's a Cloudinary public_id, construct the full URL
  const CLOUDINARY_BASE_URL = process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL || 
    'https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/';
  
  return `${CLOUDINARY_BASE_URL}${url}`;
};

/**
 * Get fallback image URL based on entity type
 * @param type - Entity type (account, people, category, etc.)
 * @returns Local fallback image path
 */
export const getFallbackImageURL = (type: 'account' | 'people' | 'category' | 'shop'): string => {
  const fallbacks = {
    account: '/images/fallback/account-default.png',
    people: '/images/fallback/people-default.png',
    category: '/images/fallback/category-default.png',
    shop: '/images/fallback/shop-default.png',
  };

  return fallbacks[type] || '/images/fallback/default.png';
};

/**
 * Transform Cloudinary URL with specific transformations
 * @param url - Original Cloudinary URL
 * @param options - Transformation options
 * @returns Transformed URL
 */
interface CloudinaryTransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'crop';
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'jpg' | 'png';
}

export const transformCloudinaryURL = (
  url: string,
  options: CloudinaryTransformOptions = {}
): string => {
  const {
    width = 400,
    height = 250,
    crop = 'fill',
    quality = 'auto',
    format = 'auto',
  } = options;

  // If not a Cloudinary URL, return as-is
  if (!url.includes('cloudinary.com')) {
    return url;
  }

  // Extract base URL and public_id
  const parts = url.split('/upload/');
  if (parts.length !== 2) return url;

  const [baseURL, publicId] = parts;

  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `q_${quality}`,
    `f_${format}`,
  ].join(',');

  return `${baseURL}/upload/${transformations}/${publicId}`;
};

/**
 * Generate account card background gradient based on account type
 * @param accountType - Type of account
 * @returns CSS gradient string
 */
export const getAccountCardGradient = (
  accountType: 'account' | 'cc' | 'emoney' | 'paylater' | 'investment' | 'other'
): string => {
  const gradients = {
    account: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cc: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    emoney: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    paylater: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    investment: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    other: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  };

  return gradients[accountType] || gradients.other;
};

/**
 * Format currency for display
 * @param amount - Amount in number
 * @param currency - Currency code (default: IDR)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currency: string = 'IDR'): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Get account type label
 * @param type - Account type enum
 * @returns Human-readable label
 */
export const getAccountTypeLabel = (
  type: 'account' | 'cc' | 'emoney' | 'paylater' | 'investment' | 'other'
): string => {
  const labels = {
    account: 'Bank Account',
    cc: 'Credit Card',
    emoney: 'E-Money',
    paylater: 'Pay Later',
    investment: 'Investment',
    other: 'Other',
  };

  return labels[type] || 'Unknown';
};

/**
 * Get account status color
 * @param status - Account status
 * @returns Tailwind color class
 */
export const getAccountStatusColor = (
  status: 'active' | 'closed' | 'frozen' | 'pending'
): string => {
  const colors = {
    active: 'text-green-600 bg-green-100',
    closed: 'text-gray-600 bg-gray-100',
    frozen: 'text-blue-600 bg-blue-100',
    pending: 'text-yellow-600 bg-yellow-100',
  };

  return colors[status] || colors.pending;
};
