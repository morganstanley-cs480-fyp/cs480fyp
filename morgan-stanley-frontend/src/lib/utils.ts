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

export const requireAuth = ({ context }: { context: RouterContext }) => {
  if (!context.authentication.isAuthenticated) {
    throw redirect({ to: "/" });
  }
};

export const getWebSocketUrl = () => {
  // 1. If you explicitly set a VITE var (like for local testing), use it!
  if (import.meta.env.VITE_WEBSOCKET_URL) {
    return import.meta.env.VITE_WEBSOCKET_URL;
  }

  // 2. Otherwise, dynamically build the CloudFront URL
  // If the site is HTTPS, use WSS. If HTTP, use WS.
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  
  // Grab the current domain (e.g., d1oo9htiiea9na.cloudfront.net)
  const host = window.location.host;
  
  // Attach the routing prefix so CloudFront knows to send it to the ALB
  return `${protocol}//${host}/api/ws`;
};
