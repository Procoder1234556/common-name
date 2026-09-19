import type { MatchType } from "@/lib/types/check";
import { cn } from "@/lib/utils";

export interface MatchListItem {
  cin: string;
  name: string;
  status: string | null;
  matchType: MatchType;
  score: number;
}

export interface MatchListProps {
  matches: MatchListItem[];
  className?: string;
}

function matchLabel(type: MatchType, score: number): string {
  if (type === "exact") return "Exact";
  return `Similar (${Math.round(score * 100)}%)`;
}

export function MatchList({ matches, className }: MatchListProps) {
  if (matches.length === 0) {
    return (
      <p className={cn("text-sm text-neutral-600", className)}>
        No close names in this snapshot. Still verify on MCA before filing.
      </p>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile: stacked rows */}
      <ul className="divide-y divide-neutral-200 border-t border-neutral-200 md:hidden">
        {matches.map((row) => (
          <li key={row.cin} className="py-3">
            <p className="font-medium text-neutral-900">{row.name}</p>
            <p className="mt-1 font-mono text-sm text-neutral-800">{row.cin}</p>
            <p className="mt-1 text-sm text-neutral-600">
              {row.status ?? "—"} · {matchLabel(row.matchType, row.score)}
            </p>
          </li>
        ))}
      </ul>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-600">
            <tr>
              <th className="py-2 pr-3 font-medium">Registered name</th>
              <th className="py-2 pr-3 font-medium">CIN</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Match</th>
            </tr>
          </thead>
          <tbody>
            {matches.map((row) => (
              <tr
                key={row.cin}
                className="border-b border-neutral-100 last:border-0"
              >
                <td className="py-2.5 pr-3 text-neutral-900">{row.name}</td>
                <td className="py-2.5 pr-3 font-mono text-neutral-800">
                  {row.cin}
                </td>
                <td className="py-2.5 pr-3 text-neutral-700">
                  {row.status ?? "—"}
                </td>
                <td className="py-2.5 text-neutral-700">
                  {matchLabel(row.matchType, row.score)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
