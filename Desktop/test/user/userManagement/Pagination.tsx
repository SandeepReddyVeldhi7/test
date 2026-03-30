import { ArrowLeft, ArrowRight } from "lucide-react";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-4 mt-4 select-none">
      <button
        className={`p-2 transition-colors rounded ${currentPage === 1
          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
          : "bg-white text-black hover:bg-gray-100 cursor-pointer"
          }`}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ArrowLeft size={12} />
      </button>

      <span className="text-xl font-medium text-white min-w-[20px] text-center">
        {currentPage}
      </span>

      <button
        className={`p-2 transition-colors rounded ${currentPage === totalPages
          ? "bg-gray-600 text-gray-400 cursor-not-allowed"
          : "bg-brand text-white hover:bg-brand-dark"
          }`}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ArrowRight size={12} />
      </button>
    </div>
  );
}
