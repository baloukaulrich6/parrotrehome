// ParrotRehome logo — inline SVG
// Charter p.04: "ParrotRehome / BIRDS • SUPPLIES • AVIAN CARE"

export function ParrotRehomeLogo({
  variant = "color",
  size = "md",
  showTagline = true,
  name = "ParrotRehome",
  tagline = "Birds · Supplies · Avian Care",
}: {
  variant?: "color" | "mono-light" | "mono-dark";
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  name?: string;
  tagline?: string;
}) {
  const sizes = {
    sm: { word: "text-xl", tag: "text-[10px]", emblem: 24 },
    md: { word: "text-2xl", tag: "text-[11px]", emblem: 32 },
    lg: { word: "text-4xl", tag: "text-sm", emblem: 44 },
  };
  const s = sizes[size];

  const emblemColor =
    variant === "mono-light"
      ? "#F7F6F1"
      : variant === "mono-dark"
      ? "#424B50"
      : "#424B50";
  const wingAccent =
    variant === "mono-light"
      ? "#F7F6F1"
      : variant === "mono-dark"
      ? "#424B50"
      : "#D54149";

  const parrotColor =
    variant === "mono-light"
      ? "text-ivory"
      : variant === "mono-dark"
      ? "text-slate"
      : "text-slate";

  const rehomeColor =
    variant === "mono-light"
      ? "text-ivory"
      : variant === "mono-dark"
      ? "text-slate"
      : "text-tail-red";

  const tagColor =
    variant === "mono-light"
      ? "text-ivory/70"
      : "text-feather";

  return (
    <div className="flex items-center gap-3 select-none">
      <span className="inline-flex" aria-hidden>
        <svg
          width={s.emblem}
          height={s.emblem}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22 14c-7 0-12 5-12 12 0 4 1 6 3 8-3 4-4 9-1 13 2 3 5 5 9 6 2 4 6 6 10 6 5 0 9-3 11-7 4-1 7-4 8-8 1-4 0-7-3-10 2-2 4-5 4-9 0-7-5-12-12-12-3 0-6 1-8 3-2-2-5-3-9-3z"
            fill={emblemColor}
          />
          <path d="M30 30c5-2 11-2 17 0-2 4-6 7-10 7s-7-3-7-7z" fill={wingAccent} />
          <circle cx="26" cy="22" r="2" fill="#F7F6F1" />
          <circle cx="26" cy="22" r="1" fill="#424B50" />
          <path d="M40 46c4-1 8-1 12 0-3 2-6 3-9 3s-3-2-3-3z" fill={wingAccent} />
        </svg>
      </span>
      <div className="flex flex-col leading-none">
        <div className={`font-heading font-bold tracking-tight ${s.word}`}>
          {name === "ParrotRehome" ? <><span className={parrotColor}>Parrot</span><span className={rehomeColor}>Rehome</span></> : <span className={parrotColor}>{name}</span>}
        </div>
        {showTagline && (
          <span className={`${s.tag} ${tagColor} font-body font-medium tracking-[0.18em] uppercase mt-1`}>
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}
