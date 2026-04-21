"use client";

import { useState, useCallback } from "react";
import { Download } from "lucide-react";
import arena, { ArenaExportRow } from "@/lib/api/arena";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function downloadCsv(rows: ArenaExportRow[]) {
  const headers = [
    "Question",
    "Model A",
    "Model B",
    "Answer A",
    "Answer B",
    "Vote",
    "Chosen Model",
    "Date",
  ];

  const voteLabels: Record<string, string> = {
    A: "A is better",
    B: "B is better",
    EQUAL: "Equal",
    NO: "Both bad",
  };

  const csvRows = rows.map((row) =>
    [
      escapeCsvField(row.question || ""),
      escapeCsvField(row.modelAName || ""),
      escapeCsvField(row.modelBName || ""),
      escapeCsvField(row.answerA || ""),
      escapeCsvField(row.answerB || ""),
      escapeCsvField(voteLabels[row.voteKey || ""] || row.voteKey || ""),
      escapeCsvField(row.chosenModel || ""),
      escapeCsvField(row.createdAt || ""),
    ].join(","),
  );

  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `arena-export-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export default function ArenaExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await arena.getExportData();
      if (res.ok && res.data) {
        downloadCsv(res.data);
      }
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
    >
      <Download className="w-3.5 h-3.5" />
      {isExporting ? "กำลังส่งออก..." : "ส่งออก CSV"}
    </button>
  );
}
