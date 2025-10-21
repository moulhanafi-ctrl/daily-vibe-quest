import { z } from "zod";
import zxcvbn from "zxcvbn";

/**
 * Common weak passwords denylist
 */
const COMMON_PASSWORDS = [
  "password",
  "123456",
  "qwerty",
  "letmein",
  "abc123",
  "password123",
  "welcome",
  "admin",
  "iloveyou",
];

/**
 * Password policy validation (client-side enforcement)
 */
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
    notCommon: boolean;
    strongEnough: boolean;
    noWhitespace: boolean;
    notUserInfo: boolean;
  };
  score: number; // 0-4 from zxcvbn
}

/**
 * Validate password against all requirements
 */
export function validatePassword(
  password: string,
  userInfo?: { email?: string; displayName?: string }
): PasswordValidation {
  const trimmed = password.trim();
  const errors: string[] = [];

  // Check for leading/trailing whitespace
  const noWhitespace = password === trimmed && !password.includes(" ");
  if (!noWhitespace) {
    errors.push("Password cannot contain spaces");
  }

  // Basic requirements
  const minLength = trimmed.length >= 12;
  const hasUppercase = /[A-Z]/.test(trimmed);
  const hasLowercase = /[a-z]/.test(trimmed);
  const hasNumber = /[0-9]/.test(trimmed);
  const hasSymbol = /[^A-Za-z0-9]/.test(trimmed);

  if (!minLength) errors.push("Must be at least 12 characters");
  if (!hasUppercase) errors.push("Must contain an uppercase letter");
  if (!hasLowercase) errors.push("Must contain a lowercase letter");
  if (!hasNumber) errors.push("Must contain a number");
  if (!hasSymbol) errors.push("Must contain a symbol");

  // Check against common passwords
  const lowerPassword = trimmed.toLowerCase();
  const notCommon = !COMMON_PASSWORDS.includes(lowerPassword);
  if (!notCommon) {
    errors.push("This password is too common");
  }

  // Check for user info
  let notUserInfo = true;
  if (userInfo) {
    if (userInfo.email) {
      const emailLocal = userInfo.email.split("@")[0].toLowerCase();
      if (lowerPassword.includes(emailLocal)) {
        notUserInfo = false;
        errors.push("Password cannot contain your email");
      }
    }
    if (userInfo.displayName) {
      const nameLower = userInfo.displayName.toLowerCase();
      if (lowerPassword.includes(nameLower)) {
        notUserInfo = false;
        errors.push("Password cannot contain your name");
      }
    }
  }

  // zxcvbn strength check
  const userInputs = userInfo
    ? [userInfo.email || "", userInfo.displayName || ""].filter(Boolean)
    : [];
  const result = zxcvbn(trimmed, userInputs);
  const strongEnough = result.score >= 3;

  if (!strongEnough && errors.length === 0) {
    errors.push("Password is not strong enough");
  }

  const checks = {
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSymbol,
    notCommon,
    strongEnough,
    noWhitespace,
    notUserInfo,
  };

  const isValid =
    minLength &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSymbol &&
    notCommon &&
    strongEnough &&
    noWhitespace &&
    notUserInfo;

  return {
    isValid,
    errors,
    checks,
    score: result.score,
  };
}

/**
 * Get password strength label
 * @param score - Password strength score (0-5)
 * @returns Human-readable strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  if (score === 0) return "Very Weak";
  if (score === 1) return "Weak";
  if (score === 2) return "Fair";
  if (score === 3) return "Good";
  if (score === 4) return "Strong";
  return "Very Strong";
}

/**
 * Get password strength color
 * @param score - Password strength score (0-5)
 * @returns Tailwind color class
 */
export function getPasswordStrengthColor(score: number): string {
  if (score <= 1) return "bg-destructive";
  if (score === 2) return "bg-warning";
  if (score === 3) return "bg-yellow-500";
  if (score === 4) return "bg-green-500";
  return "bg-green-600";
}
