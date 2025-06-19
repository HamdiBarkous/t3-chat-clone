/**
 * Utility functions for the application
 */

/**
 * Get the correct site URL for the current environment
 * Follows Vercel best practices for handling URLs across environments
 */
export const getSiteUrl = (): string => {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000'; // Fallback for local development

  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`;
  
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`;
  
  return url;
};

/**
 * Get redirect URL for auth flows
 */
export const getAuthRedirectUrl = (path: string = '/auth/confirm'): string => {
  const baseUrl = getSiteUrl();
  return `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}${path}`;
}; 