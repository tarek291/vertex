import type { Metadata } from "next";
import { SearchExperience } from "@/components/search/SearchExperience";
import { Navbar } from "@/components/ui/Navigation";
import { searchSortSchema, type SearchSort } from "@/lib/search/contract";

export const metadata: Metadata = {
  title: "Search | Vertex",
  description: "Search every lesson across your courses in plain English.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;

  const rawQuery = params.q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery ?? "").trim();

  const rawSort = Array.isArray(params.sort) ? params.sort[0] : params.sort;
  const sort: SearchSort = searchSortSchema.safeParse(rawSort).success
    ? (rawSort as SearchSort)
    : "relevance";

  return (
    <div className="flex-1">
      <Navbar />
      <main>
        <SearchExperience initialQuery={query} initialSort={sort} />
      </main>
    </div>
  );
}
