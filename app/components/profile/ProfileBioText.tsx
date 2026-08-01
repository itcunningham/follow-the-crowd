export default function ProfileBioText({ bio }: { bio: string }) {
  const text = bio.trim();

  if (!text) {
    return null;
  }

  return (
    <div className="mt-4">
      <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed text-ftc-text-secondary [overflow-wrap:anywhere]">
        {text}
      </p>
    </div>
  );
}
