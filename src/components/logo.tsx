/** The ABAPilot mark: the ABAP comment quote joined to a +, as a change tag reads ("C075+). */
export function LogoMark({
  size = 28,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="14" fill="var(--spruce)" />
      <path fill="var(--on-spruce)" d="M15 16h9l-4.5 17h-9z" />
      <path fill="var(--on-spruce)" d="M28 16h9l-4.5 17h-9z" />
      <path fill="var(--on-spruce)" d="M41 33h7v8h8v7h-8v8h-7v-8h-8v-7h8z" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-[19px] font-extrabold tracking-tight text-ink">
        ABAPilot
      </span>
    </span>
  );
}
