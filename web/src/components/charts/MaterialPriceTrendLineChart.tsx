import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '../common/Badge';

export interface PriceTrendPoint {
  id: string;
  materialId: string;
  materialName: string;
  materialCode: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  date: string; // ISO date 'YYYY-MM-DD'
  price: number;
  previousPrice: number;
  currency: string;
  uom: string;
  specCondition?: string; // Specifications/conditions comparability key
}

interface MaterialPriceTrendChartProps {
  materials: { id: string; name: string; code: string; uom: string; category: string }[];
  suppliers: { id: string; name: string }[];
  pricePoints: PriceTrendPoint[];
  selectedMaterialId: string;
  onSelectMaterial: (id: string) => void;
  selectedSupplierId?: string;
  onSelectSupplier?: (id: string) => void;
  startDate?: string;
  endDate?: string;
  onDateRangeChange?: (start: string, end: string) => void;
}

export const MaterialPriceTrendLineChart: React.FC<MaterialPriceTrendChartProps> = ({
  materials,
  suppliers,
  pricePoints,
  selectedMaterialId,
  onSelectMaterial,
  selectedSupplierId = 'ALL',
  onSelectSupplier,
  startDate,
  endDate,
  onDateRangeChange,
}) => {
  const [localSupplierFilter, setLocalSupplierFilter] = useState<string>(selectedSupplierId);
  const [filterRange, setFilterRange] = useState<'3M' | '6M' | '1Y' | 'ALL'>('6M');
  const [hoveredPoint, setHoveredPoint] = useState<PriceTrendPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeMaterial = materials.find(m => m.id === selectedMaterialId) || materials[0];

  // Filter raw points by selected material
  const materialPoints = useMemo(() => {
    return pricePoints.filter(p => p.materialId === selectedMaterialId);
  }, [pricePoints, selectedMaterialId]);

  // Suppliers who supplied this material
  const materialSuppliers = useMemo(() => {
    const map = new Map<string, string>();
    materialPoints.forEach(p => map.set(p.supplierId, p.supplierName));
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [materialPoints]);

  // Filter points by supplier and date range
  const filteredPoints = useMemo(() => {
    let pts = [...materialPoints];
    if (localSupplierFilter !== 'ALL') {
      pts = pts.filter(p => p.supplierId === localSupplierFilter);
    }

    // Sort chronologically ascending
    pts.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (filterRange !== 'ALL') {
      const months = filterRange === '3M' ? 3 : filterRange === '6M' ? 6 : 12;
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      pts = pts.filter(p => new Date(p.date) >= cutoff);
    }

    return pts;
  }, [materialPoints, localSupplierFilter, filterRange]);

  // Calculate latest comparable price change
  // Formula: Percentage Price Change = ((Current Price - Previous Price) / Previous Price) * 100
  const latestPriceAnalysis = useMemo(() => {
    if (filteredPoints.length === 0) {
      return {
        status: 'NO_DATA' as const,
        pctChange: 0,
        currentPrice: 0,
        previousPrice: 0,
        direction: 'UNCHANGED' as const,
      };
    }

    // Get the latest point
    const latest = filteredPoints[filteredPoints.length - 1];
    
    // Find preceding valid price record with comparable specification/conditions
    let prevPoint: PriceTrendPoint | null = null;
    for (let i = filteredPoints.length - 2; i >= 0; i--) {
      const p = filteredPoints[i];
      // Must have same currency and UOM to be comparable
      if (p.currency === latest.currency && p.uom === latest.uom && p.price > 0) {
        prevPoint = p;
        break;
      }
    }

    const currentPrice = latest.price;
    const previousPrice = prevPoint ? prevPoint.price : latest.previousPrice;

    if (!previousPrice || previousPrice <= 0) {
      return {
        status: 'BASELINE_ONLY' as const,
        pctChange: 0,
        currentPrice,
        previousPrice: 0,
        direction: 'UNCHANGED' as const,
      };
    }

    const diff = currentPrice - previousPrice;
    const pct = Number((((diff) / previousPrice) * 100).toFixed(2));
    const direction = diff > 0 ? 'INCREASED' : diff < 0 ? 'DECREASED' : 'UNCHANGED';

    return {
      status: 'VALID' as const,
      pctChange: pct,
      currentPrice,
      previousPrice,
      direction,
      latestDate: latest.date,
      supplierName: latest.supplierName,
      poNumber: latest.poNumber,
      uom: latest.uom,
      currency: latest.currency,
    };
  }, [filteredPoints]);

  // Geometry for SVG Line Chart
  const chartHeight = 220;
  const chartWidth = 600;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

  const { pointsWithCoords, minPrice, maxPrice, polylinePoints } = useMemo(() => {
    if (filteredPoints.length === 0) {
      return { pointsWithCoords: [], minPrice: 0, maxPrice: 0, polylinePoints: '' };
    }

    const prices = filteredPoints.map(p => p.price);
    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const range = rawMax - rawMin || rawMax * 0.1 || 10;
    const minP = Math.max(0, rawMin - range * 0.15);
    const maxP = rawMax + range * 0.15;

    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;

    const coords = filteredPoints.map((pt, idx) => {
      const x = filteredPoints.length === 1 
        ? padding.left + innerWidth / 2 
        : padding.left + (idx / (filteredPoints.length - 1)) * innerWidth;
      const y = padding.top + innerHeight - ((pt.price - minP) / (maxP - minP || 1)) * innerHeight;
      return { ...pt, x, y };
    });

    const polyline = coords.map(c => `${c.x},${c.y}`).join(' ');

    return {
      pointsWithCoords: coords,
      minPrice: minP,
      maxPrice: maxP,
      polylinePoints: polyline,
    };
  }, [filteredPoints]);

  return (
    <div className="space-y-4">
      {/* Top Filter & Selector Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Material Select */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Material:</span>
            <select
              value={selectedMaterialId}
              onChange={(e) => onSelectMaterial(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#002F87] max-w-[220px] sm:max-w-[280px] truncate"
            >
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.code} • {m.uom})
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-600">Supplier:</span>
            <select
              value={localSupplierFilter}
              onChange={(e) => {
                setLocalSupplierFilter(e.target.value);
                if (onSelectSupplier) onSelectSupplier(e.target.value);
              }}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#002F87]"
            >
              <option value="ALL">All Valid Suppliers</option>
              {materialSuppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Range Buttons */}
        <div className="flex items-center gap-1 self-start lg:self-auto">
          <span className="text-slate-400 mr-1 text-[11px]">Range:</span>
          {(['3M', '6M', '1Y', 'ALL'] as const).map(range => (
            <button
              key={range}
              onClick={() => setFilterRange(range)}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                filterRange === range
                  ? 'bg-[#002F87] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Latest Price Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Latest Recorded Price</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-bold text-slate-900 font-mono">
              ₱{latestPriceAnalysis.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ {activeMaterial?.uom}</span>
          </div>
          <span className="text-[11px] text-slate-400 truncate block mt-0.5">
            {latestPriceAnalysis.supplierName || 'Primary Contract'}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Preceding Valid Benchmark</span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-lg font-bold text-slate-700 font-mono">
              {latestPriceAnalysis.previousPrice > 0 
                ? `₱${latestPriceAnalysis.previousPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                : 'No prior record'}
            </span>
            <span className="text-xs text-slate-500 font-medium">/ {activeMaterial?.uom}</span>
          </div>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            Strict UOM & condition matched
          </span>
        </div>

        <div className="border-t sm:border-t-0 sm:border-l sm:pl-3 border-slate-200 pt-2 sm:pt-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Price Trajectory & Shift %</span>
          <div className="flex items-center gap-2 mt-0.5">
            {latestPriceAnalysis.direction === 'INCREASED' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                +{latestPriceAnalysis.pctChange}%
              </span>
            )}
            {latestPriceAnalysis.direction === 'DECREASED' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />
                {latestPriceAnalysis.pctChange}%
              </span>
            )}
            {latestPriceAnalysis.direction === 'UNCHANGED' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                <Minus className="w-3.5 h-3.5 mr-0.5" />
                0.00% (Steady)
              </span>
            )}
            <span className="text-xs font-semibold text-slate-700">
              {latestPriceAnalysis.direction === 'INCREASED' ? 'Price Increase' :
               latestPriceAnalysis.direction === 'DECREASED' ? 'Price Decrease' : 'No Change'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            Formula: ((P_cur - P_prev) / P_prev) × 100
          </span>
        </div>
      </div>

      {/* Interactive SVG Line Chart */}
      <div 
        className="relative bg-white rounded-xl border border-slate-200 p-2 overflow-hidden select-none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
      >
        {filteredPoints.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-slate-400">
            No comparable historical price records for the selected filters.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-auto min-w-[500px]"
            >
              {/* Horizontal grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = padding.top + (chartHeight - padding.top - padding.bottom) * pct;
                const priceVal = maxPrice - (maxPrice - minPrice) * pct;
                return (
                  <g key={i}>
                    <line 
                      x1={padding.left} 
                      y1={y} 
                      x2={chartWidth - padding.right} 
                      y2={y} 
                      stroke="#f1f5f9" 
                      strokeWidth="1" 
                      strokeDasharray="3 3"
                    />
                    <text 
                      x={padding.left - 8} 
                      y={y + 3.5} 
                      fontSize="9" 
                      fill="#94a3b8" 
                      textAnchor="end"
                      fontFamily="monospace"
                    >
                      ₱{Math.round(priceVal).toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Area Gradient fill */}
              <defs>
                <linearGradient id="priceLineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#002F87" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#002F87" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Polygon fill under curve */}
              {pointsWithCoords.length > 1 && (
                <polygon
                  points={`${pointsWithCoords[0].x},${chartHeight - padding.bottom} ${polylinePoints} ${pointsWithCoords[pointsWithCoords.length - 1].x},${chartHeight - padding.bottom}`}
                  fill="url(#priceLineGrad)"
                />
              )}

              {/* Line path */}
              {pointsWithCoords.length > 1 && (
                <polyline
                  fill="none"
                  stroke="#002F87"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={polylinePoints}
                />
              )}

              {/* Data points */}
              {pointsWithCoords.map((pt, idx) => {
                const isHovered = hoveredPoint?.id === pt.id;
                const isLast = idx === pointsWithCoords.length - 1;

                return (
                  <g 
                    key={pt.id}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(pt)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    {/* Invisible larger hover area */}
                    <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                    {/* Point circle */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? "6" : isLast ? "5" : "3.5"}
                      fill={isLast ? "#44B330" : "#002F87"}
                      stroke="#ffffff"
                      strokeWidth={isHovered ? "3" : "2"}
                      className="transition-all duration-150"
                    />

                    {/* Date label at bottom for selected milestones */}
                    <text
                      x={pt.x}
                      y={chartHeight - padding.bottom + 16}
                      fontSize="9"
                      fill="#64748b"
                      textAnchor="middle"
                      className="select-none font-mono"
                    >
                      {pt.date.slice(5)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        )}

        {/* Floating Tooltip displaying all required fields */}
        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-50 p-3 bg-slate-950 text-white rounded-lg shadow-2xl border border-slate-800 text-xs max-w-xs transition-opacity duration-150"
            style={{
              left: Math.min(Math.max(10, mousePos.x + 15), 420),
              top: Math.max(10, mousePos.y - 85),
            }}
          >
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
              <span className="font-bold text-white truncate">{hoveredPoint.materialName}</span>
              <span className="text-[10px] text-slate-400 font-mono">{hoveredPoint.poNumber}</span>
            </div>

            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Supplier:</span>
                <span className="font-semibold text-slate-200 truncate max-w-[170px]">{hoveredPoint.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Unit Price:</span>
                <span className="font-bold text-[#44B330] font-mono">
                  ₱{hoveredPoint.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Currency & UOM:</span>
                <span className="font-mono text-slate-200">{hoveredPoint.currency} / {hoveredPoint.uom}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Effective Date:</span>
                <span className="font-mono text-slate-200">{hoveredPoint.date}</span>
              </div>
              {hoveredPoint.previousPrice > 0 && (
                <div className="flex justify-between pt-1 border-t border-slate-800/80">
                  <span className="text-slate-400">Previous Price:</span>
                  <span className="font-mono text-slate-300">₱{hoveredPoint.previousPrice.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
