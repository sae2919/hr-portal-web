type PaginationProps = {
  meta: any;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  meta,
  onPageChange,
}: PaginationProps) {

  if (!meta) return null;

  return (
    <div className="flex items-center justify-between mt-6">

      <p className="text-sm text-slate-500">
        Page {meta.current_page} of {meta.last_page}
      </p>

      <div className="flex items-center gap-2">

        <button
          disabled={!meta.prev_page_url}
          onClick={() =>
            onPageChange(meta.current_page - 1)
          }
          className="px-4 py-2 rounded-xl border border-slate-200 disabled:opacity-50"
        >
          Previous
        </button>

        <button
          disabled={!meta.next_page_url}
          onClick={() =>
            onPageChange(meta.current_page + 1)
          }
          className="px-4 py-2 rounded-xl border border-slate-200 disabled:opacity-50"
        >
          Next
        </button>

      </div>

    </div>
  );
}