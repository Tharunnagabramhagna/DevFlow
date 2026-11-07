import React, { useState } from 'react';
import { cn } from '@/utils/cn';

interface SparklineDataPoint {
  label: string;
  value: number;
}

export const RevenueSparkline: React.FC<{
  data?: SparklineDataPoint[];
  height?: number;
  currency?: string;
}> = ({
  data = [
    { label: 'Aug', value: 1800 },
    { label: 'Sep', value: 3200 },
    { label: 'Oct', value: 4900 },
    { label: 'Nov (Current)', value: 7600 },
  ],
  height = 120,
  currency = 'USD',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const values = data.map((d) => d.value);
  const min = Math.min(...values) * 0.8;
  const max = Math.max(...values) * 1.1;
  const range = max - min || 1;

  const width = 360;
  const paddingX = 24;
  const paddingY = 16;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * innerWidth;
    const y = height - paddingY - ((d.value - min) / range) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, curr, idx) => {
    if (idx === 0) return `M ${curr.x} ${curr.y}`;
    const prev = points[idx - 1];
    const cx = (prev.x + curr.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
        style={{ maxHeight: height }}
      >
        <defs>
          <linearGradient id="mintAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#86DDBB" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#86DDBB" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="mintLineGradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#34D399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Subtle grid lines */}
        <line
          x1={paddingX}
          y1={paddingY}
          x2={width - paddingX}
          y2={paddingY}
          stroke="#E9EAF2"
          strokeDasharray="4 4"
        />
        <line
          x1={paddingX}
          y1={height / 2}
          x2={width - paddingX}
          y2={height / 2}
          stroke="#E9EAF2"
          strokeDasharray="4 4"
        />

        {/* Shaded Area */}
        <path d={areaD} fill="url(#mintAreaGradient)" />

        {/* Smooth Curve */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#mintLineGradient)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Data points */}
        {points.map((pt, i) => (
          <g key={i}>
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoveredIdx === i ? 6 : 4}
              fill="#FFFFFF"
              stroke="#10B981"
              strokeWidth="2.5"
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          </g>
        ))}
      </svg>

      {/* Interactive Tooltip & Axis */}
      <div className="flex items-center justify-between text-[11px] text-[#777B91] pt-1.5 px-2">
        {data.map((d, i) => (
          <button
            key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            className={cn(
              'transition-colors font-medium',
              hoveredIdx === i ? 'text-[#15803D] font-semibold' : 'text-[#777B91]'
            )}
          >
            {d.label}
          </button>
        ))}
      </div>

      {hoveredIdx !== null && (
        <div className="absolute top-1 right-2 bg-white/95 backdrop-blur-xs border border-[#BBF7D0] shadow-sm px-2.5 py-1 rounded-lg text-xs">
          <span className="text-[#777B91]">{data[hoveredIdx].label}: </span>
          <span className="font-bold text-[#15803D]">
            ${data[hoveredIdx].value.toLocaleString()} {currency}
          </span>
        </div>
      )}
    </div>
  );
};

export const MilestoneStatusDonut: React.FC<{
  completed: number;
  inReview: number;
  inProgress: number;
  total: number;
}> = ({ completed, inReview, inProgress, total }) => {
  const safeTotal = total || 1;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;

  const pctCompleted = completed / safeTotal;
  const pctReview = inReview / safeTotal;
  const pctProgress = inProgress / safeTotal;

  const strokeCompleted = pctCompleted * circumference;
  const strokeReview = pctReview * circumference;
  const strokeProgress = pctProgress * circumference;

  const offsetReview = -strokeCompleted;
  const offsetProgress = -(strokeCompleted + strokeReview);

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90 transform">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#F1F3FA"
            strokeWidth="10"
          />
          {/* Completed (Mint) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#86DDBB"
            strokeWidth="10"
            strokeDasharray={`${strokeCompleted} ${circumference}`}
            strokeLinecap="round"
          />
          {/* In Review (Yellow) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#FDE68A"
            strokeWidth="10"
            strokeDasharray={`${strokeReview} ${circumference}`}
            strokeDashoffset={offsetReview}
            strokeLinecap="round"
          />
          {/* In Progress (Powder Blue) */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="transparent"
            stroke="#93C5FD"
            strokeWidth="10"
            strokeDasharray={`${strokeProgress} ${circumference}`}
            strokeDashoffset={offsetProgress}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-base font-bold text-[#25263A] leading-none">{completed}/{total}</span>
          <span className="text-[10px] text-[#777B91] mt-0.5 font-medium">Done</span>
        </div>
      </div>

      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[#25263A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#86DDBB]" />
            Paid & Verified
          </span>
          <span className="font-semibold text-[#15803D]">{completed}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[#25263A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FDE68A]" />
            Client Review
          </span>
          <span className="font-semibold text-[#A16207]">{inReview}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-[#25263A]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#93C5FD]" />
            Active Delivery
          </span>
          <span className="font-semibold text-[#1D4ED8]">{inProgress}</span>
        </div>
      </div>
    </div>
  );
};

export const AICertaintyGauge: React.FC<{ score: number }> = ({ score }) => {
  const radius = 42;
  const circumference = Math.PI * radius; // Half circle
  const progress = (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <div className="w-36 h-20 overflow-hidden relative">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          <defs>
            <linearGradient id="aiGaugeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#A78BFA" />
              <stop offset="100%" stopColor="#86DDBB" />
            </linearGradient>
          </defs>
          {/* Track */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#F1F3FA"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Progress */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="url(#aiGaugeGrad)"
            strokeWidth="9"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className="text-center mt-[-10px]">
        <span className="text-2xl font-bold text-[#25263A] tracking-tight">{score}%</span>
        <p className="text-[11px] text-[#777B91] font-medium">Confidence Score</p>
      </div>
    </div>
  );
};

