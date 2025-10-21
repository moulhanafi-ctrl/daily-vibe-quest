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
 * Password policy constants
 */
const MIN_PASSWORD_LENGTH = 12;

/**
 * Password policy validation (client-side enforcement)
 */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
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
  const errors: string[] = [];
  const checks = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSymbol: false,
    notCommon: true,
    strongEnough: true,
    noWhitespace: true,
    notUserInfo: true,
  };

  // Check minimum length
  checks.minLength = password.length >= MIN_PASSWORD_LENGTH;
  if (!checks.minLength) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Check for uppercase
  checks.hasUppercase = /[A-Z]/.test(password);
  if (!checks.hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase
  checks.hasLowercase = /[a-z]/.test(password);
  if (!checks.hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  checks.hasNumber = /\d/.test(password);
  if (!checks.hasNumber) {
    errors.push('Password must contain at least one number');
  }

  // Check for symbol
  checks.hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (!checks.hasSymbol) {
    errors.push('Password must contain at least one special character');
  }

  // Use zxcvbn for comprehensive password strength analysis
  const result = zxcvbn(
    password,
    userInfo ? [userInfo.email || '', userInfo.displayName || ''] : []
  );

  // Check for whitespace
  checks.noWhitespace = !/\s/.test(password);
  if (!checks.noWhitespace) {
    errors.push('Password must not contain whitespace');
  }

  // STRICT: Block passwords with score < 3 (must be "strong" or "very strong")
  checks.strongEnough = result.score >= 3;
  if (!checks.strongEnough) {
    errors.push('Password is too weak. Please choose a stronger password.');
  }

  // Check if password contains user info
  if (userInfo) {
    const lowerPassword = password.toLowerCase();
    if (userInfo.email) {
      const emailParts = userInfo.email.toLowerCase().split('@')[0].split(/[._-]/);
      for (const part of emailParts) {
        if (part.length > 2 && lowerPassword.includes(part)) {
          checks.notUserInfo = false;
          errors.push('Password should not contain parts of your email');
          break;
        }
      }
    }
    if (userInfo.displayName) {
      const nameParts = userInfo.displayName.toLowerCase().split(/\s+/);
      for (const part of nameParts) {
        if (part.length > 2 && lowerPassword.includes(part)) {
          checks.notUserInfo = false;
          errors.push('Password should not contain parts of your name');
          break;
        }
      }
    }
  }

  // Check common passwords (zxcvbn already does this, but add explicit check)
  if (result.feedback.warning?.includes('common') || result.feedback.warning?.includes('predictable')) {
    checks.notCommon = false;
    errors.push('This password is too common or predictable. Please choose a unique password.');
  }

  const isValid = 
    checks.minLength &&
    checks.hasUppercase &&
    checks.hasLowercase &&
    checks.hasNumber &&
    checks.hasSymbol &&
    checks.noWhitespace &&
    checks.notCommon &&
    checks.strongEnough &&
    checks.notUserInfo &&
    result.score >= 3; // STRICT: Require score of 3 or higher

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
