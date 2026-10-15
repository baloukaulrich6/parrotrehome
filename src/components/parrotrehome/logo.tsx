// Approved identity: a forest-green parrot sheltered by a gold roof.
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
    sm: { word: "text-xl", tag: "text-[9px]", emblem: "h-10 w-10" },
    md: { word: "text-2xl", tag: "text-[10px]", emblem: "h-14 w-14" },
    lg: { word: "text-4xl", tag: "text-sm", emblem: "h-20 w-20" },
  };
  const s = sizes[size];
  const light = variant === "mono-light";
  const wordColor = light ? "text-ivory" : variant === "mono-dark" ? "text-slate" : "text-forest";
  return (
    <div className="flex items-center gap-2 select-none">
      <img src="/brand/parrotrehome-emblem.png" alt="" aria-hidden="true" width={64} height={64}
        className={`${s.emblem} shrink-0 object-contain ${light ? "brightness-0 invert" : variant === "mono-dark" ? "brightness-0" : ""}`} />
      <div className="flex flex-col leading-none">
        <div className={`font-heading font-semibold tracking-tight ${s.word}`}>
          {name === "ParrotRehome" ? <><span className={wordColor}>Parrot</span><span className={light ? "text-ivory" : "text-slate"}>Rehome</span></> : <span className={wordColor}>{name}</span>}
        </div>
        {showTagline && <span className={`${s.tag} ${light ? "text-ivory/70" : "text-feather"} font-body font-medium tracking-[0.12em] uppercase mt-1`}>{tagline}</span>}
      </div>
    </div>
  );
}
