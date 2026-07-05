type ProfileAvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<ProfileAvatarSize, string> = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-12 w-12 text-xs",
  lg: "h-14 w-14 text-sm",
  xl: "h-28 w-28 text-2xl",
};

function getInitials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "??";
}

export default function ProfileAvatar({
  name,
  avatarUrl,
  size = "md",
  className = "",
}: {
  name: string;
  avatarUrl?: string | null;
  size?: ProfileAvatarSize;
  className?: string;
}) {
  const initials = getInitials(name);
  const baseClasses = `ftc-avatar flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold uppercase tracking-wide ${sizeClasses[size]} ${className}`;

  if (avatarUrl?.trim()) {
    return (
      <div className={baseClasses}>
        <img
          src={avatarUrl}
          alt={`${name} profile`}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return <div className={baseClasses}>{initials}</div>;
}
