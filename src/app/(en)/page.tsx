import { JsonLd } from "@/seo/JsonLd";
import { buildMetadata } from "@/seo/meta";
import { HOME_META, homeStructuredData } from "@/seo/site";
import { App } from "@/ui/App";

export const metadata = buildMetadata({ lang: "en", title: HOME_META.en.title, description: HOME_META.en.description, share: HOME_META.en.share });

export default function Page() {
  return (
    <>
      <App initialLocale="en" />
      <JsonLd data={homeStructuredData("en", [])} />
    </>
  );
}
