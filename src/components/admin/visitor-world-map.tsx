'use client';

import { useMemo, useState } from 'react';

import { countryLabel, countryMapPoint, flagEmoji } from '@/lib/analytics-geo';
import { WORLD_LAND_PATH } from '@/lib/world-land-path';
import type { CountryStat } from '@/lib/visitor-analytics';

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function VisitorWorldMap({ countries }: { countries: CountryStat[] }) {
  const [hover, setHover] = useState<string | null>(null);

  const points = useMemo(() => {
    const max = Math.max(1, ...countries.map((row) => row.visits));
    return countries
      .map((row) => {
        const point = countryMapPoint(row.code);
        if (!point) return null;
        const t = Math.sqrt(row.visits / max);
        return {
          ...row,
          x: point.x,
          y: point.y,
          r: 4 + t * 18,
          opacity: 0.35 + t * 0.55,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.visits - a.visits);
  }, [countries]);

  const active = points.find((row) => row.code === hover) ?? null;
  const totalVisits = countries.reduce((sum, row) => sum + row.visits, 0);

  return (
    <div className="overflow-hidden border border-blue-200 bg-white">
      <div className="relative">
        <svg
          viewBox="0 0 1000 500"
          className="h-auto w-full"
          role="img"
          aria-label="Visitor countries on a world map"
        >
          <rect width="1000" height="500" fill="#eff6ff" />
          <path d={WORLD_LAND_PATH} fill="#93c5fd" fillOpacity={0.85} />
          {points.map((row) => (
            <g key={row.code}>
              <circle
                cx={row.x}
                cy={row.y}
                r={row.r + 6}
                fill="#2563eb"
                fillOpacity={hover === row.code ? 0.16 : 0}
                className="pointer-events-none"
              />
              <circle
                cx={row.x}
                cy={row.y}
                r={row.r}
                fill="#2563eb"
                stroke="#ffffff"
                strokeWidth={1.5}
                opacity={row.opacity}
                className="pointer-events-none"
              />
              <circle
                cx={row.x}
                cy={row.y}
                r={Math.max(row.r + 12, 18)}
                fill="transparent"
                onMouseEnter={() => setHover(row.code)}
                onMouseLeave={() => setHover((current) => (current === row.code ? null : current))}
                onFocus={() => setHover(row.code)}
                onBlur={() => setHover((current) => (current === row.code ? null : current))}
                tabIndex={0}
                role="img"
                aria-label={`${countryLabel(row.code)}: ${formatCount(row.visits)} visits`}
              >
                <title>{`${countryLabel(row.code)}: ${formatCount(row.visits)} visits · ${formatCount(row.pageviews)} views`}</title>
              </circle>
            </g>
          ))}
        </svg>

        {active ? (
          <div className="pointer-events-none absolute left-3 top-3 border border-blue-200 bg-white/95 px-3 py-2 text-sm shadow-sm">
            <p className="font-medium text-blue-800">
              <span className="mr-1.5" aria-hidden>
                {flagEmoji(active.code)}
              </span>
              {countryLabel(active.code)}
            </p>
            <p className="mt-0.5 text-xs text-blue-500">
              {formatCount(active.visits)} visits · {formatCount(active.pageviews)} views
            </p>
          </div>
        ) : countries.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-blue-400">
            No country data for this range.
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-blue-100 px-4 py-2 text-xs text-blue-400">
        <span>{formatCount(totalVisits)} visits plotted</span>
        <span className="inline-flex items-center gap-2">
          Fewer
          <span className="inline-flex h-2 w-16 overflow-hidden bg-blue-100">
            <span className="h-full w-full bg-gradient-to-r from-blue-200 to-blue-600" />
          </span>
          More
        </span>
      </div>
    </div>
  );
}
