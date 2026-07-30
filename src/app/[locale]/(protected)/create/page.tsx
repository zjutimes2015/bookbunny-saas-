'use client';

import { getBookAction } from '@/actions/get-book';
import { saveBookAction, updateBookStatusAction } from '@/actions/save-book';
import { BunnyMascot } from '@/components/bookbunny/bunny-mascot';
import { MultiCharacterManager } from '@/components/bookbunny/multi-character-manager';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

/**
 * Book Create Page
 *
 * Migrated from BookBunny's app/create/page.tsx
 * Adapted to MkSaaS: uses bunny-* CSS classes, removed Turnstile (MkSaaS has its own),
 * uses MkSaaS API routes with auth.
 *
 * Flow: Characters → Story → Illustrating → Preview
 */

type Step = 'characters' | 'story' | 'generating' | 'preview';

interface CharData {
  id: string;
  name: string;
  photoPreview?: string;
  refSeed?: number;
}

interface GenProgress {
  total: number;
  completed: number;
  status: string;
  pages: { index: number; status: string; imageB64?: string }[];
}

export default function CreatePage() {
  const searchParams = useSearchParams();
  const editBookId = searchParams.get('bookId');

  const [step, setStep] = useState<Step>('characters');
  const [characters, setCharacters] = useState<CharData[]>([]);
  const [story, setStory] = useState<{ title: string; pages: string[] } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generation state
  const [genId, setGenId] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<GenProgress | null>(null);
  const [pageImages, setPageImages] = useState<(string | null)[]>([]);
  const [bookId, setBookId] = useState<string | null>(null);
  const [savingBook, setSavingBook] = useState(false);

  const [theme, setTheme] = useState('');
  const [ageGroup, setAgeGroup] = useState('3-5');

  // Load existing book if bookId is provided
  useEffect(() => {
    if (!editBookId) return;

    const loadBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getBookAction({ bookId: editBookId });
        if (!result?.data) {
          setError('Book not found');
          return;
        }

        const {
          book: bookData,
          character,
          story: storyData,
        } = result.data as any;

        // Restore state
        setBookId(bookData.id);
        setTheme(storyData?.theme || '');
        setAgeGroup(storyData?.ageGroup || '3-5');

        if (character) {
          setCharacters([
            {
              id: character.id,
              name: character.name,
              photoPreview: character.imageUrl || undefined,
              refSeed: character.refSeed || undefined,
            },
          ]);
        }

        if (storyData) {
          setStory({
            title: storyData.title,
            pages: storyData.content,
          });
        }

        if (bookData.pageImageUrls && bookData.pageImageUrls.length > 0) {
          setPageImages(bookData.pageImageUrls);
          setStep('preview');
        } else if (storyData) {
          setStep('story');
        }
      } catch (err) {
        console.error('Failed to load book:', err);
        setError('Failed to load book');
      } finally {
        setLoading(false);
      }
    };

    loadBook();
  }, [editBookId]);

  // --- Character handlers ---
  const handleAddCharacter = useCallback((name: string, photo?: File) => {
    const newChar: CharData = { id: `char_${Date.now()}`, name };
    if (photo) newChar.photoPreview = URL.createObjectURL(photo);
    setCharacters((prev) => [...prev, newChar]);
  }, []);

  const handleRemoveCharacter = useCallback((id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  }, []);

  // --- Story generation ---
  const handleGenerateStory = async () => {
    if (!theme || characters.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const charNames = characters.map((c) => c.name).join(', ');
      const res = await fetch('/api/create-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme,
          ageGroup,
          characterName: charNames,
          pages: 20,
        }),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Failed');

      setStory(data.data);
      setStep('generating');
      // Auto-start illustration generation
      startGeneration(data.data);

      // Persist character + story + book skeleton to DB immediately
      persistBook(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  // --- Persist book to database ---
  const persistBook = async (
    storyData: { title: string; pages: string[] },
    currentImages: (string | null)[] = []
  ) => {
    if (characters.length === 0) return;
    setSavingBook(true);
    try {
      const result = await saveBookAction({
        character: {
          name: characters[0].name,
          imageUrl: characters[0].photoPreview ?? undefined,
          style: 'watercolor',
          refSeed: characters[0].refSeed,
        },
        story: {
          title: storyData.title,
          content: storyData.pages,
          ageGroup,
          theme,
        },
        pageImageUrls:
          currentImages.length > 0
            ? currentImages.filter((img): img is string => Boolean(img))
            : undefined,
        status: currentImages.some(Boolean) ? 'generating' : 'draft',
      });

      if (result?.data?.success) {
        setBookId(result.data.bookId);
        toast.success('Book saved to your library');
      } else {
        console.warn('saveBookAction warning:', result?.data);
      }
    } catch (err) {
      console.error('Failed to save book:', err);
    } finally {
      setSavingBook(false);
    }
  };

  // --- Image generation ---
  const startGeneration = async (storyData: {
    title: string;
    pages: string[];
  }) => {
    try {
      const res = await fetch('/api/generate-pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: storyData.title,
          pages: storyData.pages,
          characterImageB64: null,
          refSeed: null,
          style: 'childrens book illustration, soft watercolor, warm colors',
        }),
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setGenId(data.genId);
    } catch (err) {
      setError(
        'Generation failed: ' + (err instanceof Error ? err.message : 'Error')
      );
    }
  };

  // --- Poll generation progress ---
  useEffect(() => {
    if (!genId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate-pages?genId=${genId}`);
        const data = await res.json();
        setGenProgress(data);

        // Update page images as they arrive
        const images: (string | null)[] = [];
        for (const p of data.pages || []) {
          images[p.index] = p.imageB64
            ? `data:image/png;base64,${p.imageB64}`
            : null;
        }
        setPageImages(images);

        if (data.status === 'done' || data.status === 'error') {
          clearInterval(interval);

          // Update saved book with images and ready status
          if (bookId && images.some(Boolean)) {
            updateBookStatusAction({
              bookId,
              status: data.status === 'error' ? 'draft' : 'ready',
              pageImageUrls: images.filter((img): img is string =>
                Boolean(img)
              ),
            }).catch((err) =>
              console.error('Failed to update book status:', err)
            );
          }

          setTimeout(() => setStep('preview'), 500);
        }
      } catch {
        // ignore polling errors
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [genId, bookId]);

  // --- Export handlers ---
  const handleExportPDF = async () => {
    if (!story) return;
    setLoading(true);
    try {
      const pagesWithImages = story.pages.map((text, i) => ({
        text,
        imageB64: pageImages[i]?.split(',')[1],
        characters: characters.map((c) => c.name),
      }));
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: story.title,
          author: characters.map((c) => c.name).join(' & '),
          pages: pagesWithImages,
          size: '8.5x8.5',
        }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');

      // Mark book as exported if persisted
      if (bookId) {
        updateBookStatusAction({ bookId, status: 'exported' }).catch((err) =>
          console.error('Failed to mark book exported:', err)
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportVideo = async () => {
    if (!story) return;
    setLoading(true);
    try {
      const pagesWithImages = story.pages.map((text, i) => ({
        text,
        imageB64: pageImages[i]?.split(',')[1],
      }));
      const res = await fetch('/api/export-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: story.title,
          pages: pagesWithImages,
        }),
      });
      if (!res.ok) throw new Error('Video export failed');
      const blob = await res.blob();
      window.open(URL.createObjectURL(blob), '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Video export failed');
    } finally {
      setLoading(false);
    }
  };

  const progress = genProgress
    ? Math.round((genProgress.completed / genProgress.total) * 100)
    : 0;

  const isBusy = loading || savingBook;

  const steps: Step[] = ['characters', 'story', 'generating', 'preview'];
  const stepLabels = ['Characters', 'Story', 'Illustrating', 'Preview'];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 md:py-12">
      {/* Error banner */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Progress Steps */}
      <div className="mb-10 flex items-center justify-center gap-3">
        {steps.map((s, i) => {
          const currentIdx = steps.indexOf(step);
          const isActive = step === s;
          const isDone = steps.indexOf(s) <= currentIdx && s !== 'generating';
          return (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  isActive
                    ? 'bg-[#2D2D2D] text-white dark:bg-white dark:text-black'
                    : isDone
                      ? 'bg-[#FF6B8A] text-white'
                      : 'bg-[#F2F2F7] text-[#8E8E93] dark:bg-gray-800 dark:text-gray-500'
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm font-medium ${isActive ? 'text-[#2D2D2D] dark:text-white' : 'text-[#8E8E93]'}`}
              >
                {stepLabels[i]}
              </span>
              {i < 3 && (
                <div className="h-px w-6 bg-[#E5E5EA] dark:bg-gray-700" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step 1: Characters */}
      {step === 'characters' && (
        <div className="bunny-card p-8">
          <div className="mb-6 text-center">
            <BunnyMascot size={60} />
            <h2 className="mt-3 text-xl font-bold text-[#2D2D2D] dark:text-white">
              Create Your Characters
            </h2>
            <p className="mt-1 text-sm text-[#8E8E93]">
              Add up to 5 characters
            </p>
          </div>
          <div className="space-y-6">
            <MultiCharacterManager
              characters={characters}
              onAdd={handleAddCharacter}
              onRemove={handleRemoveCharacter}
              maxCharacters={5}
            />
            {characters.length > 0 && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#2D2D2D] dark:text-white">
                    Story Theme
                  </label>
                  <input
                    className="bunny-input"
                    placeholder="e.g. A magical forest adventure..."
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-[#2D2D2D] dark:text-white">
                    Age Group
                  </label>
                  <select
                    className="bunny-input"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                  >
                    <option value="0-3">Baby (0-3)</option>
                    <option value="3-5">Preschool (3-5)</option>
                    <option value="5-7">Early Reader (5-7)</option>
                    <option value="7-10">Chapter Book (7-10)</option>
                  </select>
                </div>
                <button
                  className="bunny-btn w-full disabled:opacity-50"
                  disabled={!theme || isBusy}
                  onClick={handleGenerateStory}
                >
                  {isBusy
                    ? '✨ Saving...'
                    : `✨ Create Book with ${characters.length} Character${characters.length > 1 ? 's' : ''}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Generating Illustrations */}
      {step === 'generating' && (
        <div className="bunny-card p-8 text-center">
          <div className="bunny-bounce">
            <BunnyMascot size={80} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-[#2D2D2D] dark:text-white">
            Painting Your Story...
          </h2>
          <p className="mb-6 mt-1 text-sm text-[#8E8E93]">
            {genProgress
              ? `Page ${genProgress.completed} of ${genProgress.total}`
              : 'Starting...'}
          </p>

          {/* Progress bar */}
          <div className="mx-auto mb-8 h-3 w-full max-w-md rounded-full bg-[#F2F2F7] dark:bg-gray-800">
            <div
              className="bunny-gradient h-3 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Page thumbnail grid */}
          <div className="mx-auto grid max-w-2xl grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
            {(genProgress?.pages || Array(20).fill({ status: 'pending' })).map(
              (p: { status: string }, i: number) => (
                <div
                  key={i}
                  className={`flex aspect-[3/4] items-center justify-center rounded-xl text-xs font-medium transition-all duration-500 ${
                    p.status === 'done'
                      ? 'ring-2 ring-[#98D8C8]'
                      : p.status === 'generating'
                        ? 'animate-pulse ring-2 ring-[#FF6B8A]'
                        : p.status === 'failed'
                          ? 'ring-2 ring-red-300'
                          : 'bg-[#F2F2F7] text-[#C8A2E8] dark:bg-gray-800'
                  }`}
                  style={
                    pageImages[i]
                      ? {
                          backgroundImage: `url(${pageImages[i]})`,
                          backgroundSize: 'cover',
                        }
                      : {}
                  }
                >
                  {!pageImages[i] && (
                    <span>
                      {p.status === 'pending'
                        ? i + 1
                        : p.status === 'generating'
                          ? '✨'
                          : p.status === 'failed'
                            ? '⚠️'
                            : i + 1}
                    </span>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Step 4: Preview */}
      {step === 'preview' && story && (
        <div className="space-y-6">
          <div className="bunny-card p-8">
            <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-[#2D2D2D] dark:text-white">
                  {story.title}
                </h2>
                <p className="text-sm text-[#8E8E93]">
                  {characters.map((c) => c.name).join(' & ')} •{' '}
                  {story.pages.length} pages • {ageGroup}
                </p>
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  className="bunny-btn flex-1 px-4 py-2.5 text-sm disabled:opacity-50 sm:flex-none"
                  disabled={isBusy}
                  onClick={handleExportPDF}
                >
                  {isBusy ? '...' : '📄 Download PDF'}
                </button>
                <button
                  className="bunny-btn-secondary flex-1 px-4 py-2.5 text-sm disabled:opacity-50 sm:flex-none"
                  disabled={isBusy}
                  onClick={handleExportVideo}
                >
                  {isBusy ? '...' : '🎬 Export Video'}
                </button>
              </div>
            </div>

            {/* Page grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {/* Cover */}
              <div className="bunny-card col-span-2 p-3 text-center sm:col-span-1">
                <div className="bunny-gradient mb-2 flex aspect-[3/4] flex-col items-center justify-center rounded-xl text-white">
                  <span className="mb-1 text-3xl">📖</span>
                  <span className="px-1 text-center text-sm font-bold">
                    {story.title}
                  </span>
                </div>
                <p className="text-[10px] text-[#8E8E93]">Cover</p>
              </div>

              {/* Pages with images */}
              {story.pages.map((page, i) => (
                <div key={i} className="bunny-card p-2.5 text-center">
                  <div
                    className="mb-1.5 flex aspect-[3/4] items-center justify-center overflow-hidden rounded-xl bg-[#FFF5EE] dark:bg-gray-800"
                    style={
                      pageImages[i]
                        ? {
                            backgroundImage: `url(${pageImages[i]})`,
                            backgroundSize: 'cover',
                          }
                        : {}
                    }
                  >
                    {!pageImages[i] && (
                      <span className="text-3xl text-[#C8A2E8]">{i + 1}</span>
                    )}
                  </div>
                  <p className="line-clamp-2 text-[10px] leading-relaxed text-[#8E8E93]">
                    {page}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center">
            <button
              className="bunny-btn-secondary px-6 py-3 text-sm"
              onClick={() => {
                setStep('characters');
                setStory(null);
                setPageImages([]);
                setGenProgress(null);
                setGenId(null);
              }}
            >
              ← Create Another Book
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
