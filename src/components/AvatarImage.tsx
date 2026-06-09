import { useEffect, useState } from "react";
import { User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
  iconClassName?: string;
  alt?: string;
}

/** Avatar with graceful fallback to initials (or icon) on missing/broken image. */
export default function AvatarImage({
  src,
  name,
  className,
  fallbackClassName,
  iconClassName,
  alt = "",
}: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);

  const initials = (name || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const hasSrc = typeof src === "string" && src.trim().length > 0;

  if (hasSrc && !failed) {
    return (
      <img
        src={src!}
        alt={alt}
        onError={() => setFailed(true)}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center bg-primary/10 text-primary font-bold",
        className,
        fallbackClassName
      )}
    >
      {initials ? (
        <span>{initials}</span>
      ) : (
        <UserIcon className={cn("w-1/2 h-1/2 text-muted-foreground", iconClassName)} />
      )}
    </div>
  );
}
