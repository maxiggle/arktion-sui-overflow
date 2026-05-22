type ReaderPageProps = {
  params: Promise<{
    slug: string;
    chapterNum: string;
  }>;
};

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { slug, chapterNum } = await params;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <div className="flex-1 px-6 py-10 sm:px-10 lg:px-16">
        <div className="mx-auto flex h-full w-full max-w-5xl flex-col justify-center gap-4">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Full-screen reader
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-5xl">
            {slug}
          </h1>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Chapter {chapterNum} loads here without nav, sidebar, or creator
            chrome.
          </p>
        </div>
      </div>
    </div>
  );
}
