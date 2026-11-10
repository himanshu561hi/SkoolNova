import React, { useMemo, useState, createContext } from "react";
import type { ReactNode } from "react";

import EmptyState from "./EmptyState";
import TableSkeleton from "./TableSkeleton";
import ColumnVisibilityDropdown from "./ColumnVisibilityDropdown";
import { exportToCsv } from "@/utils/exportCsv";

// Context to manage which row is expanded
export const ExpandedRowContext = createContext<{
  expandedRowId: string | null;
  setExpandedRowId: (id: string | null) => void;
}>({
  expandedRowId: null,
  setExpandedRowId: () => {},
});

export type Column<T> = {
  key: keyof T;
  header: string;
  sortable?: boolean;
  render?: (value: T[keyof T], row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
};

type SortConfig<T> = {
  key: keyof T;
  direction: "asc" | "desc";
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
  emptyIcon?: ReactNode;
  striped?: boolean;
  hoverable?: boolean;
  selectable?: boolean;
  onBulkDelete?: (selectedIds: string[]) => void;
  bulkActions?: (selectedIds: string[]) => ReactNode;
  exportFileName?: string;
  renderExpandedRow?: (row: T) => ReactNode;
  renderMobileCard?: (row: T, isSelected: boolean, onSelect: () => void, isExpanded: boolean, onExpand: () => void) => ReactNode;
};

function DataTable<T extends { id: string }>({
  data = [],
  columns = [],
  loading = false,
  emptyMessage = "No data found.",
  emptyDescription,
  emptyIcon,
  striped = false,
  hoverable = true,
  selectable = false,
  onBulkDelete,
  bulkActions,
  exportFileName = "table-data",
  renderExpandedRow,
  renderMobileCard,
}: DataTableProps<T>) {
  const safeData = Array.isArray(data) ? data : [];
  const safeColumns = Array.isArray(columns) ? columns : [];

  // expanded row tracking
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // sorting state
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(null);

  // row selection state
  const [selectedRows, setSelectedRows] = useState<string[]>([]);

  // column visibility state
  const columnKeysStr = safeColumns.map((c) => String(c.key)).join(",");
  const [visibleColumns, setVisibleColumns] = useState<(keyof T)[]>(() =>
    safeColumns.map((c) => c.key)
  );
  const [prevColumnKeys, setPrevColumnKeys] = useState(columnKeysStr);
  if (prevColumnKeys !== columnKeysStr) {
    setPrevColumnKeys(columnKeysStr);
    setVisibleColumns(safeColumns.map((c) => c.key));
  }

  const filteredColumns = useMemo(() => {
    return safeColumns.filter((c) => visibleColumns.includes(c.key));
  }, [safeColumns, visibleColumns]);

  const handleToggleColumn = (key: keyof T) => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSort = (key: keyof T) => {
    setSortConfig((prev) => {
      if (prev?.key === key && prev.direction === "asc") {
        return { key, direction: "desc" };
      }
      if (prev?.key === key && prev.direction === "desc") {
        return null;
      }
      return { key, direction: "asc" };
    });
  };

  const handleSelectRow = (rowId: string) => {
    setSelectedRows((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === safeData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(safeData.map((r) => r.id));
    }
  };

  const selectedCount = selectedRows.length;
  const selectedData = safeData.filter((r) => selectedRows.includes(r.id));

  const sortedData = useMemo(() => {
    if (!sortConfig) return safeData;
    return [...safeData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      const isNum = typeof aVal === "number" && typeof bVal === "number";
      const normA = isNum ? aVal : String(aVal ?? "").toLowerCase();
      const normB = isNum ? bVal : String(bVal ?? "").toLowerCase();
      if (normA < normB) return sortConfig.direction === "asc" ? -1 : 1;
      if (normA > normB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [safeData, sortConfig]);

  return (
    <ExpandedRowContext.Provider value={{ expandedRowId, setExpandedRowId }}>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* ========================= */}
        {/* SELECTION BANNER (mobile) - smooth animated */}
        {/* ========================= */}
        {selectable && selectedCount > 0 && (
          <div className="flex items-center justify-between gap-2 border-b border-primary/20 bg-primary/5 px-3 py-2 md:hidden animate-in slide-in-from-top duration-200">
            <span className="text-xs font-bold text-primary">
              {selectedCount} selected
            </span>
            <div className="flex items-center gap-2">
              {selectable && selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => exportToCsv(selectedData, `${exportFileName}-selected`)}
                  className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                >
                  Export
                </button>
              )}
              {!bulkActions && onBulkDelete && (
                <button
                  type="button"
                  onClick={() => { onBulkDelete(selectedRows); setSelectedRows([]); }}
                  className="rounded-lg bg-red-500 px-2.5 py-1 text-xs font-bold text-white"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedRows([])}
                className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* ========================= */}
        {/* TABLE ACTION BAR (desktop only for clutter) */}
        {/* ========================= */}

        <div className="hidden md:flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-800">
          {/* LEFT */}
          <div>
            {selectable && selectedCount > 0 ? (
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {selectedCount} row
                {selectedCount > 1 ? "s" : ""} selected
              </p>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Manage table data
              </p>
            )}
          </div>

          {/* RIGHT */}
          <div className="flex flex-wrap items-center gap-2">
            {/* COLUMN VISIBILITY */}
            <ColumnVisibilityDropdown
              columns={safeColumns}
              visibleColumns={visibleColumns}
              onToggleColumn={handleToggleColumn}
            />

            {/* EXPORT ALL */}
            <button
              type="button"
              onClick={() => exportToCsv(sortedData, exportFileName)}
              className="
                rounded-xl
                border
                border-slate-300
                bg-white
                px-4
                py-2
                text-sm
                font-medium
                text-slate-700
                transition
                hover:bg-slate-100
                dark:border-slate-700
                dark:bg-slate-900
                dark:text-slate-200
                dark:hover:bg-slate-800
              "
            >
              Export All
            </button>

            {/* EXPORT SELECTED */}
            {selectable && selectedCount > 0 && (
              <button
                type="button"
                onClick={() =>
                  exportToCsv(selectedData, `${exportFileName}-selected`)
                }
                className="
                  rounded-xl
                  border
                  border-blue-200
                  bg-blue-50
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-blue-700
                  transition
                  hover:bg-blue-100
                  dark:border-blue-900
                  dark:bg-blue-950/30
                  dark:text-blue-300
                "
              >
                Export Selected
              </button>
            )}

            {/* CUSTOM ACTIONS */}
            {bulkActions && bulkActions(selectedRows)}

            {/* DELETE */}
            {!bulkActions && selectable && selectedCount > 0 && onBulkDelete && (
              <button
                type="button"
                onClick={() => {
                  onBulkDelete(selectedRows);
                  setSelectedRows([]);
                }}
                className="
                  rounded-xl
                  bg-red-600
                  px-4
                  py-2
                  text-sm
                  font-medium
                  text-white
                  transition
                  hover:bg-red-700
                "
              >
                Delete Selected
              </button>
            )}
          </div>
        </div>

        {/* ========================= */}
        {/* TABLE (DESKTOP) */}
        {/* ========================= */}

        <div className={`overflow-x-auto ${renderMobileCard ? 'hidden md:block' : ''}`}>
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            {/* HEADER */}
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                {selectable && (
                  <th className="w-14 px-6 py-4">
                    <input
                      type="checkbox"
                      checked={safeData.length > 0 && selectedRows.length === safeData.length}
                      onChange={handleSelectAll}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                )}
                {filteredColumns.map((col) => (
                  <th
                    key={String(col.key)}
                    onClick={() => {
                      if (col.sortable !== false) handleSort(col.key);
                    }}
                    className={`
                      ${col.sortable !== false ? "cursor-pointer" : ""}
                      ${col.sortable !== false ? "hover:bg-slate-100 dark:hover:bg-slate-700" : ""}
                      select-none px-6 py-4 text-left text-sm font-semibold text-slate-600 transition dark:text-slate-300 ${col.headerClassName ?? ""}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {col.header}
                      {col.sortable !== false && (
                        <span className="inline-flex w-4 justify-center">
                          {sortConfig?.key === col.key
                            ? sortConfig.direction === "asc"
                              ? "↑"
                              : "↓"
                            : "↕"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            {/* BODY */}
            {loading ? (
              <TableSkeleton rows={5} columns={filteredColumns.length + (selectable ? 1 : 0)} />
            ) : (
              <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                {sortedData.length === 0 ? (
                  <tr>
                    <td colSpan={filteredColumns.length + (selectable ? 1 : 0)}>
                      <EmptyState title={emptyMessage} description={emptyDescription} icon={emptyIcon} />
                    </td>
                  </tr>
                ) : (
                  sortedData.map((row, idx) => (
                    <React.Fragment key={row.id}>
                      <tr
                        className={`
                          transition
                          ${selectedRows.includes(row.id) ? "bg-primary/5" : ""}
                          ${hoverable ? "hover:bg-slate-50 dark:hover:bg-slate-800" : ""}
                          ${striped && idx % 2 === 0 ? "bg-slate-50/40 dark:bg-slate-800/40" : ""}
                        `}
                      >
                        {selectable && (
                          <td className="px-6 py-5">
                            <input
                              type="checkbox"
                              checked={selectedRows.includes(row.id)}
                              onChange={() => handleSelectRow(row.id)}
                              className="h-4 w-4 rounded border-slate-300"
                            />
                          </td>
                        )}
                        {filteredColumns.map((col) => {
                          const value = row[col.key];
                          return (
                            <td
                              key={String(col.key)}
                              className={`px-6 py-5 text-slate-600 dark:text-slate-300 ${col.className ?? ""}`}
                            >
                              {col.render ? col.render(value, row) : String(value)}
                            </td>
                          );
                        })}
                      </tr>
                      {expandedRowId === row.id && renderExpandedRow && (
                        <tr>
                          <td
                            colSpan={filteredColumns.length + (selectable ? 1 : 0)}
                            className="bg-white dark:bg-slate-900 p-4"
                          >
                            {renderExpandedRow(row)}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            )}
          </table>
        </div>

        {/* ========================= */}
        {/* MOBILE CARDS */}
        {/* ========================= */}
        
        {renderMobileCard && (
          <div className="block md:hidden p-4 space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl h-24 w-full" />
                ))}
              </div>
            ) : sortedData.length === 0 ? (
              <EmptyState title={emptyMessage} description={emptyDescription} icon={emptyIcon} />
            ) : (
              sortedData.map((row) => (
                <div key={row.id}>
                  {renderMobileCard(
                    row, 
                    selectedRows.includes(row.id), 
                    () => handleSelectRow(row.id),
                    expandedRowId === row.id,
                    () => setExpandedRowId(expandedRowId === row.id ? null : row.id)
                  )}
                  
                  {expandedRowId === row.id && renderExpandedRow && (
                    <div className="mt-2 rounded-xl bg-slate-50 dark:bg-slate-800 p-4 border border-slate-100 dark:border-slate-700 shadow-inner">
                      {renderExpandedRow(row)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </ExpandedRowContext.Provider>
  );
}

export default DataTable;
