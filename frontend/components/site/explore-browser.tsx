"use client";

import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeriesCard } from "@/components/site/series-card";
import { useSeriesStore } from "@/stores/series.store";
import { FormatType } from "@/lib/types/series";
import type { SeriesQuery } from "@/lib/types/series";

type FormatTab = "all" | FormatType;

const FORMAT_TABS: Array<{ value: FormatTab; label: string }> = [
  { value: "all", label: "All" },
  { value: FormatType.MANGA, label: "Manga" },
  { value: FormatType.MANHWA, label: "Manhwa" },
  { value: FormatType.MANHUA, label: "Manhua" },
  { value: FormatType.WEBTOON, label: "Webtoon" },
  { value: FormatType.NOVEL, label: "Novel" },
];

export function ExploreBrowser() {
  const [searchInput, setSearchInput] = useState("");
  const [activeTab, setActiveTab] = useState<FormatTab>("all");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const { page, listLoading, fetchSeries } = useSeriesStore();

  useEffect(() => {
    const query: SeriesQuery = {
      page: 1,
      limit: 24,
      search: debouncedSearch || undefined,
      formatType: activeTab === "all" ? undefined : activeTab,
    };
    fetchSeries(query);
  }, [debouncedSearch, activeTab, fetchSeries]);

  const series = page?.data ?? [];
  const total = page?.total ?? 0;

  function handleReset() {
    setSearchInput("");
    setActiveTab("all");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-[1.75rem] border border-border/60 bg-card/80 p-4 shadow-sm backdrop-blur sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by title or description"
            className="h-11 pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {listLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Badge variant="outline" className="px-3 py-1.5">
              {total} result{total === 1 ? "" : "s"}
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      <Tabs
        value={String(activeTab)}
        onValueChange={(value) =>
          setActiveTab(value === "all" ? "all" : (Number(value) as FormatType))
        }
      >
        <TabsList className="w-full flex-wrap justify-start gap-2 rounded-[1.5rem] bg-transparent p-0">
          {FORMAT_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={String(tab.value)}
              className="rounded-full border border-border/60 px-4 py-2 data-active:bg-primary data-active:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={String(activeTab)} className="mt-6">
          {listLoading ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/60 bg-card overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-muted" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-full rounded bg-muted/60" />
                    <div className="h-3 w-5/6 rounded bg-muted/60" />
                    <div className="h-9 w-full rounded-md bg-muted/40 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : series.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {series.map((s) => (
                <SeriesCard key={s.id} series={s} />
              ))}
            </div>
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-border/70 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
              No series matched your filters. Try a different search or reset
              the category.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
