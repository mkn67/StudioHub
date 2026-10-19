"use client";
import { useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/common";
export type Column<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
};
export function DataTable<T>({
  rows,
  columns,
  id,
  label = "Bảng dữ liệu",
}: {
  rows: T[];
  columns: Column<T>[];
  id: (row: T) => string;
  label?: string;
}) {
  const [sort, setSort] = useState<{ key: string; direction: number } | null>(
    null,
  );
  const column = columns.find((c) => c.key === sort?.key);
  const sorted = column?.sort
    ? [...rows].sort((a, b) => {
        const x = column.sort!(a),
          y = column.sort!(b);
        return (x < y ? -1 : x > y ? 1 : 0) * (sort?.direction ?? 1);
      })
    : rows;
  if (!rows.length)
    return (
      <EmptyState
        title="Không có kết quả"
        description="Thử thay đổi bộ lọc hoặc thêm dữ liệu mới."
      />
    );
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label={`${label} — cuộn ngang để xem đủ cột`}
      tabIndex={0}
    >
      <table>
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={
                  sort?.key === c.key
                    ? sort.direction === 1
                      ? "ascending"
                      : "descending"
                    : c.sort
                      ? "none"
                      : undefined
                }
              >
                {c.sort ? (
                  <button
                    className="table-sort"
                    onClick={() =>
                      setSort({
                        key: c.key,
                        direction: sort?.key === c.key ? -sort.direction : 1,
                      })
                    }
                  >
                    {c.label}
                    {sort?.key === c.key ? (
                      sort.direction === 1 ? (
                        <ArrowUp size={14} />
                      ) : (
                        <ArrowDown size={14} />
                      )
                    ) : null}
                  </button>
                ) : (
                  c.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={id(row)}>
              {columns.map((c) => (
                <td key={c.key}>{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export function Pagination({
  page,
  total,
  onChange,
  pageSize = 10,
}: {
  page: number;
  total: number;
  onChange: (page: number) => void;
  pageSize?: number;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages < 2) return null;
  const numbers = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (i) => i === 1 || i === pages || Math.abs(i - page) <= 2,
  );
  return (
    <nav aria-label="Phân trang" className="pagination">
      <Button
        variant="outline"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Trước
      </Button>
      {numbers.map((i, index) => (
        <span key={i}>
          {index > 0 && i - numbers[index - 1] > 1 && (
            <span className="muted">… </span>
          )}
          <Button
            variant={i === page ? "secondary" : "ghost"}
            aria-current={i === page ? "page" : undefined}
            onClick={() => onChange(i)}
          >
            {i}
          </Button>
        </span>
      ))}
      <Button
        variant="outline"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Sau
      </Button>
    </nav>
  );
}
