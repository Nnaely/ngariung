"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[75dvh] flex-col items-center justify-center px-7 text-center">
      <span aria-hidden="true" className="mb-5 text-4xl">☕</span>
      <h1 className="text-xl font-bold">Sebentar, ada yang tersendat.</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">Halaman ini belum berhasil dimuat. Coba buka lagi, ya.</p>
      <button type="button" className="btn-accent mt-6 px-6 py-3 text-sm" onClick={reset}>Coba lagi</button>
    </main>
  );
}
