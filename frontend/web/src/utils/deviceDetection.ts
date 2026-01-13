// =================================================================================
// 设备检测工具 (Device Detection)
// 检测设备类型、操作系统、触摸支持等
// =================================================================================

/**
 * 检测是否为移动设备
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * 检测是否为iOS设备
 */
export const isIOS = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * 检测是否为Android设备
 */
export const isAndroid = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
};

/**
 * 检测是否为触摸设备
 */
export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

/**
 * 检测是否为平板设备
 */
export const isTablet = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua) ||
    (isIOS() && window.innerWidth >= 768)
  );
};

/**
 * 获取屏幕尺寸类别
 */
export const getScreenSize = (): 'mobile' | 'tablet' | 'desktop' => {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 641) return 'mobile';
  if (width < 1025) return 'tablet';
  return 'desktop';
};

/**
 * 获取设备信息
 */
export const getDeviceInfo = () => {
  return {
    isMobile: isMobile(),
    isIOS: isIOS(),
    isAndroid: isAndroid(),
    isTablet: isTablet(),
    isTouchDevice: isTouchDevice(),
    screenSize: getScreenSize(),
    userAgent: typeof window !== 'undefined' ? navigator.userAgent : '',
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  };
};

/**
 * 检测是否支持相机
 */
export const isCameraSupported = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia
  );
};

/**
 * 检测是否为微信浏览器
 */
export const isWeChat = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /MicroMessenger/i.test(navigator.userAgent);
};

/**
 * 检测是否为支付宝浏览器
 */
export const isAlipay = (): boolean => {
  if (typeof window === 'undefined') return false;
  return /AlipayClient/i.test(navigator.userAgent);
};

/**
 * 获取安全区域insets（用于刘海屏适配）
 */
export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0', 10),
    right: parseInt(style.getPropertyValue('--sar') || '0', 10),
    bottom: parseInt(style.getPropertyValue('--sab') || '0', 10),
    left: parseInt(style.getPropertyValue('--sal') || '0', 10),
  };
};
