"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { OLD_HOST, SITE_URL } from "@/seo/site";

const noSubscribe = () => () => {};
const onOldHost = () => location.hostname === OLD_HOST;

/**
 * Shown only on the address before version 2.0, which redirects to the new one. It appears when an old copy is
 * still open or started offline there: the settings saved at that address do not move along.
 */
export function MovedNotice() {
  const t = useTranslations("app");
  const old = useSyncExternalStore(noSubscribe, onOldHost, () => false);
  if (!old) return null;
  const host = new URL(SITE_URL).host;
  return (
    <div className="infobox moved" role="status">
      {t("moved")} <a href={SITE_URL}>{host}</a>. {t("movedSettings")}
    </div>
  );
}
