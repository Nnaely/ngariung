export default function Loading() {
  return (
    <main className="px-5 pb-32 pt-9" aria-busy="true" aria-label="Memuat halaman">
      <span role="status" className="sr-only">Menyiapkan halaman…</span>
      <div aria-hidden="true" className="space-y-5">
        <div className="skeleton h-3 w-28 rounded-full" />
        <div className="skeleton h-8 w-52 rounded-xl" />
        <div className="skeleton h-24 rounded-[26px]" />
        <div className="skeleton h-52 rounded-[26px]" />
        <div className="skeleton h-36 rounded-[26px]" />
      </div>
    </main>
  );
}
