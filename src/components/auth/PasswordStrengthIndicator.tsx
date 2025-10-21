import { Check, X } from "lucide-react";
import { validatePassword, type PasswordValidation } from "@/lib/validation/passwordPolicy";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect, useState } from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
  userInfo?: { email?: string; displayName?: string };
  onValidationChange?: (validation: PasswordValidation) => void;
}

export function PasswordStrengthIndicator({
  password,
  userInfo,
  onValidationChange,
}: PasswordStrengthIndicatorProps) {
  const debouncedPassword = useDebounce(password, 150);
  const [validation, setValidation] = useState<PasswordValidation>({
    isValid: false,
    errors: [],
    checks: {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSymbol: false,
      notCommon: false,
      strongEnough: false,
      noWhitespace: false,
      notUserInfo: false,
    },
    score: 0,
  });

  useEffect(() => {
    if (debouncedPassword) {
      const result = validatePassword(debouncedPassword, userInfo);
      setValidation(result);
      onValidationChange?.(result);
    } else {
      const emptyValidation: PasswordValidation = {
        isValid: false,
        errors: [],
        checks: {
          minLength: false,
          hasUppercase: false,
          hasLowercase: false,
          hasNumber: false,
          hasSymbol: false,
          notCommon: false,
          strongEnough: false,
          noWhitespace: false,
          notUserInfo: false,
        },
        score: 0,
      };
      setValidation(emptyValidation);
      onValidationChange?.(emptyValidation);
    }
  }, [debouncedPassword, userInfo?.email, userInfo?.displayName, onValidationChange]);

  if (!password) return null;

  const requirements = [
    { key: "minLength", label: "At least 12 characters", checked: validation.checks.minLength },
    { key: "hasUppercase", label: "Uppercase letter (A-Z)", checked: validation.checks.hasUppercase },
    { key: "hasLowercase", label: "Lowercase letter (a-z)", checked: validation.checks.hasLowercase },
    { key: "hasNumber", label: "Number (0-9)", checked: validation.checks.hasNumber },
    { key: "hasSymbol", label: "Symbol (!@#$%^&*)", checked: validation.checks.hasSymbol },
    { key: "notCommon", label: "Not a common password", checked: validation.checks.notCommon },
    { key: "strongEnough", label: "Strong enough (zxcvbn score ≥ 3)", checked: validation.checks.strongEnough },
    { key: "noWhitespace", label: "No spaces", checked: validation.checks.noWhitespace },
  ];

  if (userInfo?.email || userInfo?.displayName) {
    requirements.push({
      key: "notUserInfo",
      label: "Doesn't contain your email or name",
      checked: validation.checks.notUserInfo,
    });
  }

  return (
    <div
      className="mt-2 p-3 rounded-md bg-muted/50 border border-border"
      role="status"
      aria-live="polite"
      aria-label="Password requirements"
    >
      <p className="text-xs font-medium mb-2 text-muted-foreground">Password Requirements:</p>
      <ul className="space-y-1" aria-label="Password validation checklist">
        {requirements.map((req) => (
          <li key={req.key} className="flex items-center gap-2 text-xs">
            {req.checked ? (
              <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0" aria-hidden="true" />
            ) : (
              <X className="h-3.5 w-3.5 text-destructive flex-shrink-0" aria-hidden="true" />
            )}
            <span className={req.checked ? "text-foreground" : "text-muted-foreground"}>
              {req.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
