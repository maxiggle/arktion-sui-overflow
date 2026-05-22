"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { featuredStories, type StoryCategory } from "@/lib/public-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoryCard } from "@/components/site/story-card";

const exploreTabs: Array<{ value: StoryCategory | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "featured", label: "Featured" },
  { value: "novel", label: "Novels" },
  { value: "manga", label: "Manga" },
  { value: "translation", label: "Translations" },
];

export function ExploreBrowser() {
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof exploreTabs)[number]["value"]>("all");
  const debouncedQuery = useDebouncedValue(query, 180);

  const filteredStories = useMemo(() => {
    const searchTerm = debouncedQuery.trim().toLowerCase();

    return featuredStories.filter((story) => {
      const categoryMatches = category === "all" || story.category === category;
      const searchMatches =
        !searchTerm ||
        [story.title, story.tagline, story.description, story.category]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm);

      return categoryMatches && searchMatches;
    });
  }, [category, debouncedQuery]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[1.75rem] border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search stories, tags, and descriptions"
            className="h-11 pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="px-3 py-1.5">
            {filteredStories.length} result
            {filteredStories.length === 1 ? "" : "s"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            Reset
          </Button>
        </div>
      </div>

      <Tabs
        value={category}
        onValueChange={(value) => setCategory(value as typeof category)}
      >
        <TabsList className="w-full flex-wrap justify-start gap-2 rounded-[1.5rem] bg-transparent p-0">
          {exploreTabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-full border border-border/60 px-4 py-2 data-active:bg-primary data-active:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={category} className="mt-6">
          {filteredStories.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredStories.map((story) => (
                <StoryCard key={story.slug} story={story} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-border/70 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
              No stories matched your filters. Try a different search or reset
              the category.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
