import { z } from "zod";

/**
 * Password policy validation (client-side enforcement)
 * Server-side policy must be configured in Supabase Auth settings
 */

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character (!@#$%^&*)");

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string;
  meetsPolicy: boolean;
}

/**
 * Evaluate password strength
 * @param password - Password to evaluate
 * @returns Strength score and feedback
 */
export function evaluatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  // Length check
  if (password.length >= 12) {
    score++;
  } else {
    feedback.push("Use at least 12 characters");
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score++;
  } else {
    feedback.push("Add an uppercase letter");
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score++;
  } else {
    feedback.push("Add a lowercase letter");
  }

  // Number check
  if (/[0-9]/.test(password)) {
    score++;
  } else {
    feedback.push("Add a number");
  }

  // Special character check
  if (/[^A-Za-z0-9]/.test(password)) {
    score++;
  } else {
    feedback.push("Add a special character (!@#$%^&*)");
  }

  // Bonus for extra length
  if (password.length >= 16) score++;

  const meetsPolicy = score >= 5;
  const finalScore = Math.min(score, 5); // Cap at 5

  return {
    score: finalScore,
    feedback: meetsPolicy ? "Strong password!" : feedback.join(". "),
    meetsPolicy,
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
