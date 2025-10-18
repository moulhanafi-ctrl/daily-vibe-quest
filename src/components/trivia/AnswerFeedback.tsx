import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { CheckCircle2, XCircle, Sparkles } from "lucide-react";
import { soundEffects } from "@/lib/soundEffects";

interface AnswerFeedbackProps {
  isCorrect: boolean;
  onComplete: () => void;
  enabled: boolean;
  soundsEnabled?: boolean;
}

export const AnswerFeedback = ({ isCorrect, onComplete, enabled, soundsEnabled = false }: AnswerFeedbackProps) => {
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (!enabled) {
      onComplete();
      return;
    }

    // Play sound effect
    if (soundsEnabled) {
      if (isCorrect) {
        soundEffects.playCorrect();
      } else {
        soundEffects.playIncorrect();
      }
    }

    // Trigger visual effects
    if (isCorrect) {
      // Green confetti burst
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#86efac', '#4ade80', '#dcfce7'],
        zIndex: 9999,
        disableForReducedMotion: true,
        scalar: 1.2,
        ticks: 200
      });
    }

    // Auto-dismiss after animation
    const timer = setTimeout(() => {
      setShow(false);
      onComplete();
    }, isCorrect ? 1500 : 1000);

    return () => clearTimeout(timer);
  }, [isCorrect, enabled, soundsEnabled, onComplete]);

  if (!enabled || !show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        style={{ backgroundColor: isCorrect ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ 
            scale: 1, 
            opacity: 1,
            rotate: isCorrect ? [0, 5, -5, 0] : 0
          }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ 
            duration: isCorrect ? 0.6 : 0.4,
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
          className={`rounded-3xl p-10 shadow-2xl backdrop-blur-sm ${
            isCorrect
              ? "bg-green-500/95 text-white"
              : "bg-destructive/95 text-destructive-foreground"
          }`}
        >
          <motion.div 
            className="flex flex-col items-center gap-4"
            animate={
              isCorrect
                ? { y: [0, -10, 0] }
                : { x: [-10, 10, -10, 10, 0] }
            }
            transition={{ duration: isCorrect ? 1 : 0.5 }}
          >
            <motion.div
              animate={isCorrect ? {
                scale: [1, 1.2, 1],
                rotate: [0, 360]
              } : {
                scale: [1, 0.9, 1]
              }}
              transition={{ duration: isCorrect ? 0.8 : 0.4 }}
            >
              {isCorrect ? (
                <div className="relative">
                  <CheckCircle2 className="h-20 w-20" strokeWidth={2.5} />
                  <Sparkles className="h-8 w-8 absolute -top-2 -right-2 text-yellow-300" />
                </div>
              ) : (
                <XCircle className="h-20 w-20" strokeWidth={2.5} />
              )}
            </motion.div>
            <div className="text-center">
              <motion.div 
                className="text-4xl font-bold mb-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {isCorrect ? "✨ Correct!" : "Try again!"}
              </motion.div>
              <motion.div 
                className="text-lg opacity-90"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                {isCorrect ? "Amazing work!" : "You'll get the next one!"}
              </motion.div>
              <div className="sr-only">
                {isCorrect ? "Your answer is correct. Amazing work!" : "Your answer is incorrect. You'll get the next one!"}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
