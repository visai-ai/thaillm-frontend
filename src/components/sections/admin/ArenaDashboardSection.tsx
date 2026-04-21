"use client";

import { useState, useMemo } from "react";
import { useQueryArenaStats } from "@/hooks/useQueryArenaStats";
import { LoadingSpinner } from "@/components/common/Loading";
import { ArenaStatsResponse } from "@/lib/api/arena";
import { cn } from "@/lib/utils";
import { Swords } from "lucide-react";
import { formatThaiDate } from "@/utils/time";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import TextDropdown from "@/components/common/TextDropdown";

// ─── Sort options for leaderboard ───
type SortKey = "win_rate" | "wins" | "losses" | "total_battles";
const SORT_KEYS: SortKey[] = ["win_rate", "wins", "losses", "total_battles"];
const SORT_LABELS: Record<SortKey, string> = {
  win_rate: "อัตราชนะ",
  wins: "จำนวนชนะ",
  losses: "จำนวนแพ้",
  total_battles: "แข่งทั้งหมด",
};

// ─── Vote type labels ───
const VOTE_LABELS: Record<string, string> = {
  A: "A ชนะ",
  B: "B ชนะ",
  EQUAL: "เสมอ",
  NO: "ไม่ดีทั้งคู่",
};
const VOTE_COLORS: Record<string, string> = {
  A: "bg-blue-500",
  B: "bg-error-400",
  EQUAL: "bg-gray-300",
  NO: "bg-primary-500",
};

// ─── Sub-components ───

function VoteDistributionBar({
  voteTypes,
  total,
}: {
  voteTypes: ArenaStatsResponse["voteTypes"];
  total: number;
}) {
  if (total === 0) return null;
  const order = ["A", "B", "EQUAL", "NO"];
  const sorted = order
    .map((key) => voteTypes.find((v) => v.vote_key === key))
    .filter(Boolean) as ArenaStatsResponse["voteTypes"];

  return (
    <div className="flex flex-col gap-2">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {sorted.map((v) => {
          const pct = (Number(v.count) / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={v.vote_key}
              className={cn("h-full", VOTE_COLORS[v.vote_key] || "bg-gray-200")}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {sorted.map((v) => {
          const pct = ((Number(v.count) / total) * 100).toFixed(0);
          return (
            <div
              key={v.vote_key}
              className="flex items-center gap-1.5 text-xs text-gray-600"
            >
              <div
                className={cn(
                  "w-2.5 h-2.5 rounded-full",
                  VOTE_COLORS[v.vote_key] || "bg-gray-200",
                )}
              />
              <span>
                {VOTE_LABELS[v.vote_key] || v.vote_key}{" "}
                <span className="font-semibold text-gray-800">
                  {Number(v.count)} ({pct}%)
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeadToHeadSection({
  headToHead,
}: {
  headToHead: ArenaStatsResponse["headToHead"];
}) {
  if (!headToHead || headToHead.length === 0) return null;

  type CellData = {
    rowWins: number;
    colWins: number;
    equal: number;
    bothBad: number;
  };
  const matrix = new Map<string, Map<string, CellData>>();
  const modelSet = new Set<string>();

  const addToMatrix = (
    row: string,
    col: string,
    rWins: number,
    cWins: number,
    eq: number,
    bad: number,
  ) => {
    if (!matrix.has(row)) matrix.set(row, new Map());
    const existing = matrix.get(row)!.get(col);
    if (existing) {
      existing.rowWins += rWins;
      existing.colWins += cWins;
      // eq/bad are symmetric — don't re-add on reverse direction
    } else {
      matrix
        .get(row)!
        .set(col, { rowWins: rWins, colWins: cWins, equal: eq, bothBad: bad });
    }
  };

  for (const row of headToHead) {
    const a = row.model_a as string;
    const b = row.model_b as string;
    const aWins = Number(row.a_wins);
    const bWins = Number(row.b_wins);
    const eq = Number(row.equal);
    const bad = Number(row.both_bad);
    modelSet.add(a);
    modelSet.add(b);
    addToMatrix(a, b, aWins, bWins, eq, bad);
    addToMatrix(b, a, bWins, aWins, eq, bad);
  }

  const models = Array.from(modelSet);

  const getCell = (row: string, col: string): CellData | null => {
    return matrix.get(row)?.get(col) ?? null;
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-auto">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0 z-10">
          <tr>
            <th className="py-2 px-3 text-xs font-medium text-gray-500 text-left sticky left-0 bg-gray-50 z-20 min-w-[100px]">
              vs
            </th>
            {models.map((m) => (
              <th
                key={m}
                className="py-2 px-3 text-xs font-medium text-gray-700 text-center min-w-[90px]"
              >
                {m}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((rowModel) => (
            <tr key={rowModel} className="border-t border-gray-100">
              <td className="py-2 px-3 text-xs font-semibold text-gray-700 sticky left-0 bg-white z-10">
                {rowModel}
              </td>
              {models.map((colModel) => {
                if (rowModel === colModel) {
                  return (
                    <td
                      key={colModel}
                      className="py-2 px-3 text-center bg-gray-50"
                    >
                      <span className="text-gray-300 text-xs">-</span>
                    </td>
                  );
                }
                const cell = getCell(rowModel, colModel);
                if (!cell) {
                  return (
                    <td
                      key={colModel}
                      className="py-2 px-3 text-center text-xs text-gray-300"
                    >
                      -
                    </td>
                  );
                }
                const isWin = cell.rowWins > cell.colWins;
                const isLoss = cell.rowWins < cell.colWins;
                const hasExtra = cell.equal > 0 || cell.bothBad > 0;
                const total =
                  cell.rowWins + cell.colWins + cell.equal + cell.bothBad;

                return (
                  <td
                    key={colModel}
                    className={cn(
                      "py-1.5 px-2 text-center",
                      isWin && "bg-green-50",
                      isLoss && "bg-red-50",
                    )}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-0.5 cursor-default">
                          <div className="flex items-center gap-0.5 text-xs font-semibold tabular-nums">
                            <span
                              className={cn(
                                isWin ? "text-green-600" : "text-gray-400",
                              )}
                            >
                              {cell.rowWins}
                            </span>
                            <span className="text-gray-300">:</span>
                            <span
                              className={cn(
                                isLoss ? "text-red-500" : "text-gray-400",
                              )}
                            >
                              {cell.colWins}
                            </span>
                          </div>
                          {hasExtra && (
                            <div className="flex items-center gap-1.5 text-[9px] tabular-nums leading-none">
                              {cell.equal > 0 && (
                                <span className="text-gray-500">
                                  = {cell.equal}
                                </span>
                              )}
                              {cell.bothBad > 0 && (
                                <span className="text-primary-600">
                                  - {cell.bothBad}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="text-xs leading-relaxed"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span>
                            <span className="font-semibold text-blue-600">
                              {rowModel}
                            </span>{" "}
                            ชนะ {cell.rowWins} ครั้ง
                          </span>
                          <span>
                            <span className="font-semibold text-error-500">
                              {colModel}
                            </span>{" "}
                            ชนะ {cell.colWins} ครั้ง
                          </span>
                          {cell.equal > 0 && (
                            <span>เสมอ {cell.equal} ครั้ง</span>
                          )}
                          {cell.bothBad > 0 && (
                            <span>ไม่ดีทั้งคู่ {cell.bothBad} ครั้ง</span>
                          )}
                          <span className="text-gray-400">
                            รวม {total} ครั้ง
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecentBattlesSection({
  recentVotes,
}: {
  recentVotes: ArenaStatsResponse["recentVotes"];
}) {
  if (!recentVotes || recentVotes.length === 0) return null;

  const formatTime = (iso: string) =>
    formatThaiDate(new Date(iso), {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const resultLabel = (v: ArenaStatsResponse["recentVotes"][0]) => {
    if (v.voteKey === "EQUAL") return { text: "เสมอ", cls: "text-gray-500" };
    if (v.voteKey === "NO")
      return { text: "ไม่ดีทั้งคู่", cls: "text-primary-500" };
    return {
      text: v.chosenModel || "",
      cls: "text-gray-800 font-semibold",
    };
  };

  return (
    <div className="flex flex-col">
      {recentVotes.map((v, i) => {
        const result = resultLabel(v);
        return (
          <div
            key={v.id}
            className={cn(
              "flex items-center gap-3 py-2.5 px-1 text-sm",
              i < recentVotes.length - 1 && "border-b border-gray-100",
            )}
          >
            <span className="text-xs text-gray-400 w-24 shrink-0">
              {v.createdAt ? formatTime(v.createdAt) : "-"}
            </span>
            <span className="text-gray-600 truncate">
              {v.modelAName} <span className="text-gray-400">vs</span>{" "}
              {v.modelBName}
            </span>
            <span className={cn("ml-auto shrink-0 text-xs", result.cls)}>
              {result.text}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main ───

export default function ArenaDashboardSection() {
  const { data, isLoading, error } = useQueryArenaStats();
  const [sortKey, setSortKey] = useState<SortKey>("win_rate");

  const rawModels = (data?.models ?? []) as ArenaStatsResponse["models"];
  const totalVotes = data?.totalVotes ?? 0;

  const models = useMemo(() => {
    return [...rawModels].sort((a, b) => {
      const aBattles = Number(a.total_battles || 0);
      const bBattles = Number(b.total_battles || 0);
      if (sortKey === "win_rate") {
        const aRate = aBattles > 0 ? Number(a.wins || 0) / aBattles : 0;
        const bRate = bBattles > 0 ? Number(b.wins || 0) / bBattles : 0;
        return bRate - aRate;
      }
      if (sortKey === "wins") return Number(b.wins || 0) - Number(a.wins || 0);
      if (sortKey === "losses")
        return Number(b.losses || 0) - Number(a.losses || 0);
      return bBattles - aBattles;
    });
  }, [rawModels, sortKey]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p className="text-lg font-medium">เกิดข้อผิดพลาด</p>
        <p className="text-sm">{error.message}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (models.length === 0 && totalVotes === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Swords className="w-12 h-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">ไม่มีข้อมูล</p>
        <p className="text-sm">เริ่มใช้งาน Chatbot Arena เพื่อดูสถิติ</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* ── Leaderboard ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">อันดับโมเดล</h2>
          <TextDropdown
            items={SORT_KEYS}
            selectedItem={sortKey}
            handleSetSelectedItem={(item) => setSortKey(item as SortKey)}
            getFormatText={(item) => SORT_LABELS[item as SortKey]}
            dropdownClassName="py-1.5 px-2.5 text-xs !rounded-md !shadow-none"
            className="!space-y-0"
          />
        </div>
        <div className="border border-gray-200 rounded-lg overflow-auto max-h-[420px]">
          <table className="w-full min-w-[600px]">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  #
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  โมเดล
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  ชนะ
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  เสมอ
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  แพ้
                </th>
                <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                  แข่งทั้งหมด
                </th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                  อัตรา ชนะ / เสมอ / แพ้
                </th>
              </tr>
            </thead>
            <tbody>
              {models.map((model, index) => {
                const battles = Number(model.total_battles || 0);
                const wins = Number(model.wins || 0);
                const draws = Number(model.draws || 0);
                const losses = Number(model.losses || 0);
                const winRate = battles > 0 ? (wins / battles) * 100 : 0;
                const drawRate = battles > 0 ? (draws / battles) * 100 : 0;
                const lossRate = battles > 0 ? (losses / battles) * 100 : 0;

                return (
                  <tr
                    key={model.model_name}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4 text-sm text-gray-500 font-medium">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                      {model.model_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-center font-medium text-green-600">
                      {wins}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-400">
                      {draws}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-red-500">
                      {losses}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-gray-700">
                      {battles}
                    </td>
                    <td className="py-3 px-4">
                      {battles > 0 ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 w-32">
                            <div
                              className="h-full bg-green-500"
                              style={{ width: `${winRate}%` }}
                            />
                            <div
                              className="h-full bg-gray-300"
                              style={{ width: `${drawRate}%` }}
                            />
                            <div
                              className="h-full bg-red-400"
                              style={{ width: `${lossRate}%` }}
                            />
                          </div>
                          <div className="flex gap-2 text-[11px] tabular-nums">
                            <span className="text-green-600">
                              {winRate.toFixed(0)}%
                            </span>
                            <span className="text-gray-400">
                              {drawRate.toFixed(0)}%
                            </span>
                            <span className="text-red-400">
                              {lossRate.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Two-column: Head-to-head + Recent battles ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Head-to-head */}
        {data?.headToHead && data.headToHead.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-800">
              เปรียบเทียบรายคู่
            </h2>
            <HeadToHeadSection headToHead={data.headToHead} />
            <div className="flex items-start gap-4 mt-1 text-[11px] text-gray-400">
              {/* Mini example matrix */}
              <table className="border border-gray-200 rounded text-center text-[10px] shrink-0">
                <thead>
                  <tr>
                    <th className="px-2 py-1 bg-gray-50 text-gray-400 font-medium">
                      vs
                    </th>
                    <th className="px-2 py-1 bg-gray-50 text-gray-600 font-semibold">
                      B
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-100">
                    <td className="px-2 py-1 font-semibold text-gray-600 bg-white">
                      A
                    </td>
                    <td className="px-2 py-1 bg-green-50">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-0.5 font-semibold">
                          <span className="text-green-600">3</span>
                          <span className="text-gray-300">:</span>
                          <span className="text-gray-400">1</span>
                        </div>
                        <div className="text-[9px]">
                          <span className="text-gray-500">= 1</span>{" "}
                          <span className="text-primary-600">- 1</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              {/* Explanation */}
              <div className="flex flex-col gap-1.5 pt-0.5 text-gray-500">
                <span>
                  <span className="font-bold text-green-600">3</span>
                  <span className="text-gray-400"> : </span>
                  <span className="font-bold text-gray-400">1</span>
                  <span> = A ชนะ 3, แพ้ 1</span>
                </span>
                <span>
                  <span className="font-bold text-gray-500">= 1</span>
                  <span> = เสมอ 1 ครั้ง</span>
                </span>
                <span>
                  <span className="font-bold text-primary-600">- 1</span>
                  <span> = ไม่ดีทั้งคู่ 1 ครั้ง</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recent battles */}
        {data?.recentVotes && data.recentVotes.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-800">โหวตล่าสุด</h2>
            <div className="border border-gray-200 rounded-lg p-3">
              <RecentBattlesSection recentVotes={data.recentVotes} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
