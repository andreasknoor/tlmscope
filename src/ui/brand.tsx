export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0d6a83" />
      <path d="M12 46H21L27 37L32 40L39 27L44 30L51 17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="51" cy="17" r="5" fill="#fff" />
    </svg>
  );
}

export function Wordmark() {
  return <span className="wordmark"><b>TLM</b>scope</span>;
}
