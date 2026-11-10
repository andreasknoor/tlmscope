import { JsonLd } from "@/seo/JsonLd";
import { buildMetadata } from "@/seo/meta";
import { HOME_META, homeStructuredData } from "@/seo/site";
import { App } from "@/ui/App";

export const metadata = buildMetadata({ lang: "de", title: HOME_META.de.title, description: HOME_META.de.description, share: HOME_META.de.share });

export default function Page() {
  return (
    <>
      <App initialLocale="de" />
      <JsonLd data={homeStructuredData("de", [])} />
    </>
  );
}
