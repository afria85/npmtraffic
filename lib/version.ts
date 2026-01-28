/**
 * Version and User-Agent constants
 * Single source of truth to avoid version mismatch
 */

// Import version from package.json at build time
import pkg from '../package.json';

export const VERSION = pkg.version;
export const USER_AGENT = `npmtraffic/${VERSION} (https://npmtraffic.com)`;
export const SITE_URL = 'https://npmtraffic.com';
