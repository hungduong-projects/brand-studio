import { Platform } from 'react-native';

/**
 * Switches for the web export, which stands in for a phone during automated review. Native builds ignore them.
 *   ?os=android  follow Android conventions instead of iOS
 *   ?insets      reserve a phone's status bar and home-indicator areas, which a desktop browser reports as zero
 */
const params = Platform.OS === 'web' && typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;

export const previewOs = params?.get('os') === 'android' ? 'android' : null;

/** Typical insets: iPhone 15 with Dynamic Island; a Pixel with gesture navigation. */
export const previewInsets = params?.has('insets')
  ? previewOs === 'android' ? { top: 28, bottom: 24, left: 0, right: 0 } : { top: 47, bottom: 34, left: 0, right: 0 }
  : null;
