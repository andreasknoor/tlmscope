import type { IconName } from "@/seo/content/types";

/** Line icons with round ends, drawn in the style of the logo. */
const PATHS: Record<IconName, React.ReactNode> = {
  drop: <path d="M12 3v11M8 10l4 4 4-4M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />,
  summary: <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />,
  chart: <path d="M4 20V4M4 20h16M7 15l4-4 3 3 5-6" />,
  map: <><path d="M12 21s-6-5.2-6-10a6 6 0 1112 0c0 4.8-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></>,
  battery: <><rect x="2" y="7.5" width="17" height="9" rx="2" /><path d="M21.5 11v2M6 11v2M9.5 11v2" /></>,
  lock: <><rect x="5.5" y="11" width="13" height="9.5" rx="2" /><path d="M8.5 11V8a3.5 3.5 0 017 0v3" /></>,
  device: <><rect x="2.5" y="5.5" width="13" height="9" rx="1.5" /><path d="M1 18h16M19 9h3v10h-3z" /></>,
  usb: <><rect x="5" y="8" width="14" height="6" rx="1.5" /><path d="M8.5 8V5M15.5 8V5M12 14v6" /></>,
  radio: <><circle cx="12" cy="12" r="1.6" /><path d="M7.7 7.7a6 6 0 000 8.6M16.3 7.7a6 6 0 010 8.6M4.8 4.8a10 10 0 000 14.4M19.2 4.8a10 10 0 010 14.4" /></>,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9.6a2.5 2.5 0 114 2c-.9.7-1.6 1.2-1.6 2.4M12 17h.01" /></>,
  play: <path d="M8 5l11 7-11 7z" />,
  help: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />,
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`.trim()} viewBox="0 0 24 24" aria-hidden="true">{PATHS[name]}</svg>;
}
