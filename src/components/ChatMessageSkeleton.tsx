import { Skeleton } from "@/components/ui/skeleton";

export const ChatMessageSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
          <div className="max-w-[70%] space-y-2">
            {i % 2 !== 0 && <Skeleton className="h-4 w-20" />}
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};