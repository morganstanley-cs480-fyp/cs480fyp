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

