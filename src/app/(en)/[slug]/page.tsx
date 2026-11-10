import { notFound } from "next/navigation";
import { CONTENT } from "@/seo/content";
import { GuidePage } from "@/seo/GuidePage";
import { buildMetadata } from "@/seo/meta";
import { idForSlug, slugsFor } from "@/seo/pages";

/** Only the guides exist; any other address is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return slugsFor("en").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const id = idForSlug("en", (await params).slug);
  if (!id) return {};
  const g = CONTENT.en.guides[id];
  return buildMetadata({ lang: "en", id, title: g.title, description: g.description });
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const id = idForSlug("en", (await params).slug);
  if (!id) notFound();
  return <GuidePage lang="en" id={id} />;
}
