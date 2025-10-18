import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const MOTIVATIONAL_QUOTES = [
  "Every right answer is growth! 🌱",
  "You're doing amazing! Keep shining! ✨",
  "Learning is a journey, not a destination! 🚀",
  "Your brain is getting stronger with each question! 💪",
  "Mistakes help us learn and improve! 📚",
  "You're braver than you believe and smarter than you think! 🌟",
  "Progress, not perfection! 🎯",
  "Every question answered is a step forward! 👣",
  "You're making your future self proud! 🌈",
  "Keep going! You've got this! 💫"
];

interface MotivationalQuoteProps {
  score: number;
  total: number;
}

export const MotivationalQuote = ({ score, total }: MotivationalQuoteProps) => {
  const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  const percentage = Math.round((score / (total * 10)) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.5 }}
    >
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <motion.div
              animate={{
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 3
              }}
            >
              <Sparkles className="h-8 w-8 text-primary" />
            </motion.div>
            <div className="flex-1">
              <p className="text-xl font-semibold mb-2">{randomQuote}</p>
              <p className="text-muted-foreground">
                You scored {percentage}% on this session!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
