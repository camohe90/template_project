import { Ticket } from "lucide-react";

/** Renders ticket artwork, falling back to a branded gradient placeholder. */
export function Artwork({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`object-cover ${className}`} />;
  }
  return (
    <div
      className={`grid place-items-center bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 text-white/90 ${className}`}
    >
      <Ticket className="h-10 w-10" />
    </div>
  );
}
