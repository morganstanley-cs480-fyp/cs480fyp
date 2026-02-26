import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { redirect } from '@tanstack/react-router';
import type { RouterContext } from "@/routes/__root";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const padDatePart = (value: number) => String(value).padStart(2, "0");

export function formatDateShort(value?: string | number | Date | null): string {
  if (!value) return "";

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return `${padDatePart(value.getDate())}/${padDatePart(value.getMonth() + 1)}/${value.getFullYear()}`;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    const match = /^\d{4}-(\d{2})-(\d{2})/.exec(trimmed);
    if (match) {
      const [, month, day] = match;
      const year = trimmed.slice(0, 4);
      return `${day}/${month}/${year}`;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return `${padDatePart(parsed.getDate())}/${padDatePart(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
    }
    return trimmed;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value);
  return `${padDatePart(parsed.getDate())}/${padDatePart(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
}

const isCognitoConfigured = !!import.meta.env.VITE_COGNITO_CLIENT_ID;

export const requireAuth = ({ context }: { context: RouterContext }) => {
  const { authentication } = context;

  // If Cognito is not even used (local dev), skip auth entirely (return truthy object)
  if (!isCognitoConfigured) {

      console.log('🔓 Cognito not configured, skipping auth');
    return true;

  }
  // 1. THE ANTI-FLICKER CHECK:
  // If the library is still initializing, DO NOTHING.
  // The Router will wait. Once loading is false, this function runs again.
  if (authentication.isLoading) {
    console.log('⏳ Auth initialization in progress... holding route.');
    return; 
  }

  // 2. THE ACTUAL CHECK:
  // Now that we know loading is done, if they aren't authenticated, kick them out.
  if (!authentication.isAuthenticated) {
    console.log('🚫 Not authenticated. Redirecting to login.');
    throw redirect({ 
      to: "/",
      search: {
        // Save where they were trying to go so we can send them back after login
        redirect: window.location.href 
      }
    });
  }

  console.log('✅ Auth verified, allowing access.');
  return true;
};

export const getWebSocketUrl = () => {
    // 1. If explicitly set a VITE var (like for local testing), use it.
    if (import.meta.env.VITE_WEBSOCKET_URL) {
        return import.meta.env.VITE_WEBSOCKET_URL;
    }

    // 2. Otherwise, dynamically build the CloudFront URL
    // If the site is HTTPS, use WSS. If HTTP, use WS.
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    // Grab the current domain (e.g., d1oo9htiiea9na.cloudfront.net)
    const host = window.location.host;

    // Attach the routing prefix so CloudFront knows to send it to the ALB
    return `${protocol}://${host}/api/ws`;
};

