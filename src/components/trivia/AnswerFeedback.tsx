import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { CheckCircle2, XCircle } from "lucide-react";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  onComplete: () => void;
  enabled: boolean;
}

export const AnswerFeedback = ({ isCorrect, onComplete, enabled }: AnswerFeedbackProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!enabled) {
      onComplete();
      return;
    }

    // Trigger effects
    if (isCorrect) {
      // Green confetti burst
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#86efac', '#4ade80'],
        zIndex: 9999,
        disableForReducedMotion: true
      });
    }

    // Auto-dismiss after animation
    const timer = setTimeout(() => {
      setShow(false);
      onComplete();
    }, isCorrect ? 1200 : 900);

    return () => clearTimeout(timer);
  }, [isCorrect, enabled, onComplete]);

  if (!enabled || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <motion.div
          animate={
            isCorrect
              ? {
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    "0 0 0px rgba(34, 197, 94, 0)",
                    "0 0 30px rgba(34, 197, 94, 0.6)",
                    "0 0 0px rgba(34, 197, 94, 0)"
                  ]
                }
              : {
                  x: [-10, 10, -10, 10, 0],
                  scale: [1, 0.95, 1]
                }
          }
          transition={{ duration: isCorrect ? 1.2 : 0.9 }}
          className={`rounded-2xl p-8 ${
            isCorrect
              ? "bg-green-500/90 text-white"
              : "bg-destructive/90 text-destructive-foreground"
          }`}
        >
          <div className="flex items-center gap-4">
            {isCorrect ? (
              <CheckCircle2 className="h-12 w-12" />
            ) : (
              <XCircle className="h-12 w-12" />
            )}
            <div>
              <div className="text-2xl font-bold">
                {isCorrect ? "Correct!" : "Try again"}
              </div>
              <div className="sr-only">
                {isCorrect ? "Your answer is correct" : "Your answer is incorrect, please try again"}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
