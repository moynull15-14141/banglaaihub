import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "rounded-md bg-muted bg-[linear-gradient(100deg,transparent_20%,var(--muted-foreground)_50%,transparent_80%)] bg-size-[200%_100%] bg-no-repeat opacity-40 animate-[shimmer_1.8s_ease-in-out_infinite]",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }
