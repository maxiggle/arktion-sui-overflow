"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Droplets,
  BookOpen,
  Library,
  ArrowRight,
  Fingerprint,
  BookMarked,
  Compass,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useInkStore } from "@/stores/ink.store";
import { usePassportStore } from "@/stores/passport.store";
import { useReadingStore } from "@/stores/reading.store";
import { useSeriesStore } from "@/stores/series.store";
import { ReadingStatus } from "@/lib/types/reading";
import type { ReadingRecordDto } from "@/lib/types/reading";
import type { SeriesDto } from "@/lib/types/series";

// ─── Stat skeleton ────────────────────────────────────────────────────────────

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-3 shadow-sm shadow-black/5 animate-pulse">
      <div className="h-8 w-8 rounded-lg bg-muted" />
      <div className="space-y-1.5">
        <div className="h-7 w-16 rounded bg-muted" />
        <div className="h-3 w-24 rounded bg-muted/60" />
      </div>
      <div className="h-3 w-20 rounded bg-muted/40" />
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconClass,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  iconClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 flex flex-col gap-3 shadow-sm shadow-black/5">
      <div
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${iconClass ?? "bg-muted"}`}
      >
        <Icon className="h-4 w-4 text-foreground/60" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-xs text-muted-foreground mt-1 leading-none">
            {sub}
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground tracking-wide">{label}</p>
    </div>
  );
}

// ─── Continue reading card ────────────────────────────────────────────────────

function ContinueReadingCard({
  record,
  series,
}: {
  record: ReadingRecordDto;
  series: SeriesDto | undefined;
}) {
  const title = series?.title ?? "Loading…";
  const coverUrl = series?.coverUrl ?? null;

  return (
    <Link
      href={`/series/${record.seriesId}`}
      className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 hover:border-border hover:bg-accent/40 transition-all shadow-sm shadow-black/5"
    >
      <div className="shrink-0 h-16 w-12 rounded-lg overflow-hidden bg-muted border border-border/40 flex items-center justify-center">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            width={48}
            height={64}
            className="object-cover w-full h-full"
          />
        ) : (
          <BookOpen
            className="h-5 w-5 text-muted-foreground/40"
            strokeWidth={1.5}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground/90 group-hover:text-foreground truncate transition-colors">
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          chapter {record.currentChapter}
        </p>
      </div>
      <ArrowRight
        className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors"
        strokeWidth={1.5}
      />
    </Link>
  );
}

// ─── Quick link card ──────────────────────────────────────────────────────────

function QuickCard({
  icon: Icon,
  label,
  description,
  href,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-xl border border-border/60 bg-card p-5 hover:border-border hover:bg-accent/40 transition-all shadow-sm shadow-black/5"
    >
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0 mt-0.5">
        <Icon
          className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors"
          strokeWidth={1.5}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-1 leading-snug">
          {description}
        </p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 mt-1 transition-colors" />
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();

  const { balance, balanceLoading, fetchBalance } = useInkStore();
  const { passport, isLoading: passportLoading, fetchPassport } = usePassportStore();
  const { records, isLoading: readingLoading, fetchRecords } = useReadingStore();
  const { byId: seriesById, fetchSeriesForIds } = useSeriesStore();

  useEffect(() => {
    fetchBalance();
    fetchPassport();
    fetchRecords(ReadingStatus.READING);
  }, [fetchBalance, fetchPassport, fetchRecords]);

  useEffect(() => {
    if (records.length > 0) {
      fetchSeriesForIds(records.map((r) => r.seriesId));
    }
  }, [records, fetchSeriesForIds]);

  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "reader";

  const walletShort = user?.walletAddress
    ? `${user.walletAddress.slice(0, 6)}…${user.walletAddress.slice(-4)}`
    : null;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "good morning" : hour < 18 ? "good afternoon" : "good evening";

  const inkBalanceDisplay = balance
    ? Number(balance.balance).toLocaleString()
    : "0";
  const inkLevelDisplay = balance ? `level ${balance.level}` : undefined;

  const chaptersReadDisplay = passport
    ? passport.chaptersRead.toLocaleString()
    : "0";

  const seriesTrackedDisplay = passport
    ? passport.seriesTracked.toLocaleString()
    : "0";

  const statsLoading = balanceLoading || passportLoading;

  return (
    <div className="min-h-screen bg-background px-6 py-10 lg:px-10">
      {/* ── Header ── */}
      <div className="mb-10">
        <p className="text-xs text-muted-foreground mb-1 tracking-widest uppercase">
          {greeting}
        </p>
        <h1
          className="hero-title font-medium text-foreground leading-none"
          style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
        >
          {displayName}
        </h1>
        {walletShort && (
          <p className="text-xs text-muted-foreground font-mono mt-2 tracking-wider">
            {walletShort}
          </p>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {statsLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCard
              icon={Droplets}
              label="ink balance"
              value={inkBalanceDisplay}
              sub={inkLevelDisplay}
              iconClass="bg-sky-500/10"
            />
            <StatCard
              icon={BookOpen}
              label="chapters read"
              value={chaptersReadDisplay}
              sub="all time"
              iconClass="bg-violet-500/10"
            />
            <StatCard
              icon={Library}
              label="series tracked"
              value={seriesTrackedDisplay}
              sub="in your library"
              iconClass="bg-orange-500/10"
            />
          </>
        )}
      </div>

      {/* ── Continue reading ── */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground tracking-wide">
            continue reading
          </h2>
          <Link
            href="/history"
            className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            view all
          </Link>
        </div>

        {readingLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border/60 bg-card p-4 flex gap-4 animate-pulse"
              >
                <div className="h-16 w-12 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-40 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted/60" />
                </div>
              </div>
            ))}
          </div>
        ) : records.length > 0 ? (
          <div className="space-y-2">
            {records.slice(0, 5).map((record) => (
              <ContinueReadingCard
                key={record.id}
                record={record}
                series={seriesById[record.seriesId]}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border/60 border-dashed bg-muted/10 px-8 py-14 flex flex-col items-center text-center gap-4">
            <div className="h-10 w-10 rounded-full border border-border/60 flex items-center justify-center bg-muted/40">
              <BookOpen
                className="h-5 w-5 text-muted-foreground/40"
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                no reading history yet
              </p>
              <p className="text-xs text-muted-foreground/60 leading-snug max-w-xs">
                start reading and your progress will appear here, synced
                on-chain
              </p>
            </div>
            <Link
              href="/explore"
              className="mt-1 inline-flex items-center gap-1.5 text-xs bg-primary text-primary-foreground font-medium rounded-full px-4 py-2 hover:bg-primary/90 transition-colors"
            >
              explore series
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </section>

      {/* ── Quick links ── */}
      <section>
        <h2 className="text-sm font-medium text-muted-foreground tracking-wide mb-4">
          your arktion
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <QuickCard
            icon={Fingerprint}
            label="passport"
            description="your on-chain identity and reader profile"
            href="/passport"
          />
          <QuickCard
            icon={BookMarked}
            label="journal"
            description="notes and highlights from what you've read"
            href="/journal"
          />
          <QuickCard
            icon={Compass}
            label="explore"
            description="discover manga, manhwa, and web novels"
            href="/explore"
          />
        </div>
      </section>
    </div>
  );
}
