import { useEffect, useMemo, useState } from "react";
import { User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src?: string | null;
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
  iconClassName?: string;
  alt?: string;
  /** Pass a changing value (e.g. updatedAt) to bust the browser cache after upload. */
  version?: string | number;
}

/** Avatar with graceful fallback to initials (or icon) on missing/broken image. */
export default function AvatarImage({
  src,
  name,
  className,
  fallbackClassName,
  iconClassName,
  alt = "",
  version,
}: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src, version]);

  const initials = (name || "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const finalSrc = useMemo(() => {
    if (!src || typeof src !== "string" || src.trim().length === 0) return null;
    if (version === undefined || version === null) return src;
    try {
      const u = new URL(src);
      u.searchParams.set("v", String(version));
      return u.toString();
    } catch {
      return src;
    }
  }, [src, version]);

  // Only Google/Gravatar style external avatars need no-referrer. Supabase storage doesn't.
  const isExternal =
    !!finalSrc && /googleusercontent\.com|gravatar\.com/i.test(finalSrc);

  if (finalSrc && !failed) {
    return (
      <img
        src={finalSrc}
        alt={alt}
        onError={() => {
          // eslint-disable-next-line no-console
          console.warn("[AvatarImage] failed to load", finalSrc);
          setFailed(true);
        }}
        loading="lazy"
        referrerPolicy={isExternal ? "no-referrer" : undefined}
        className={cn("object-cover w-full h-full", className)}
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
