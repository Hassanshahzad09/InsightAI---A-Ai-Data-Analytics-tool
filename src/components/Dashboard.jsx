import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  ScatterChart, 
  Scatter, 
  FunnelChart, 
  Funnel, 
  LabelList,
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ZAxis,
  ComposedChart
} from 'recharts';
import { 
  SlidersHorizontal,
  Search,
  Maximize2,
  X,
  TrendingUp,
  DollarSign,
  Info
} from 'lucide-react';

const COLORS = ['#06b6d4', '#84cc16', '#10b981', '#f59e0b', '#22c55e', '#ef4444'];

export const Dashboard = ({ data, schema, stats }) => {
  // Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Zoom Modal State
  const [zoomedChart, setZoomedChart] = useState(null);

  const resetFilters = () => {
    setSelectedFilters({});
    setGlobalSearch('');
    setStartDate('');
    setEndDate('');
  };

  const handleFilterChange = (col, val) => {
    setSelectedFilters(prev => {
      const updated = { ...prev };
      if (val === '') {
        delete updated[col];
      } else {
        updated[col] = val;
      }
      return updated;
    });
  };

  // Filtered rows
  const filteredData = useMemo(() => {
    return data.filter(row => {
      if (!row) return false;
      
      if (globalSearch.trim() !== '') {
        const query = globalSearch.toLowerCase();
        const matchesQuery = Object.values(row).some(v => String(v).toLowerCase().includes(query));
        if (!matchesQuery) return false;
      }

      for (const [col, filterVal] of Object.entries(selectedFilters)) {
        if (row[col] !== filterVal) return false;
      }

      if (stats.dateColumns.length > 0) {
        const dateCol = stats.dateColumns[0];
        const rowDateStr = row[dateCol];
        if (rowDateStr && rowDateStr !== 'Unknown') {
          const rowTime = new Date(rowDateStr).getTime();
          if (startDate && rowTime < new Date(startDate).getTime()) return false;
          if (endDate && rowTime > new Date(endDate).getTime()) return false;
        }
      }

      return true;
    });
  }, [data, globalSearch, selectedFilters, startDate, endDate, stats]);

  // Determine dynamic columns to map to reference layout
  const primaryNum = stats.numericColumns[0] || '';
  const secondaryNum = stats.numericColumns[1] || primaryNum || '';
  const numName = primaryNum || 'Value';

  const catStage = stats.categoricalColumns[0] || 'Stage';
  const catPartner = stats.categoricalColumns[1] || stats.categoricalColumns[0] || 'Partner';
  const catRegion = stats.categoricalColumns[2] || stats.categoricalColumns[0] || 'Region';
  const catSize = stats.categoricalColumns[3] || stats.categoricalColumns[0] || 'Size';
  const dateCol = stats.dateColumns[0] || '';

  // Helper to sum a column
  const getSum = (col) => {
    if (!col) return 0;
    return filteredData.reduce((acc, row) => acc + (Number(row[col]) || 0), 0);
  };

  // Universal dynamic grouped aggregator
  const getGroupedChartData = (xAxisCol, groupCol, measureCol, operation = 'count') => {
    if (!xAxisCol) return { keys: [], data: [] };
    const groups = {};
    const uniqueGroupVals = new Set();

    filteredData.forEach(row => {
      if (!row) return;
      const xVal = String(row[xAxisCol] || 'No');
      const gVal = groupCol ? String(row[groupCol] || 'Standard') : 'Count';
      
      uniqueGroupVals.add(gVal);

      if (!groups[xVal]) {
        groups[xVal] = { name: xVal, _sums: {}, _counts: {} };
      }
      
      const mVal = measureCol ? Number(row[measureCol]) : 0;
      if (!groups[xVal]._sums[gVal]) {
        groups[xVal]._sums[gVal] = 0;
        groups[xVal]._counts[gVal] = 0;
      }
      
      groups[xVal]._sums[gVal] += isNaN(mVal) ? 0 : mVal;
      groups[xVal]._counts[gVal] += 1;
    });

    const groupKeysArr = Array.from(uniqueGroupVals);

    return {
      keys: groupKeysArr,
      data: Object.entries(groups).map(([xName, obj]) => {
        const res = { name: xName };
        groupKeysArr.forEach(gVal => {
          if (operation === 'sum') {
            res[gVal] = parseFloat((obj._sums[gVal] || 0).toFixed(1));
          } else if (operation === 'mean') {
            const count = obj._counts[gVal] || 0;
            res[gVal] = count > 0 ? parseFloat((obj._sums[gVal] / count).toFixed(1)) : 0;
          } else {
            res[gVal] = obj._counts[gVal] || 0;
          }
        });
        return res;
      })
    };
  };

  // Groupings for reference dashboard cards
  const chart1Data = useMemo(() => getGroupedChartData(catPartner, catSize, null, 'count'), [filteredData, catPartner, catSize]);
  
  // Composed Volume/Value Chart: Category vs volume count & value sum
  const composedData = useMemo(() => {
    if (!catStage) return [];
    const groups = {};
    filteredData.forEach(row => {
      if (!row) return;
      const key = String(row[catStage] || 'Unknown');
      if (!groups[key]) {
        groups[key] = { name: key, count: 0, sum: 0 };
      }
      groups[key].count += 1;
      groups[key].sum += primaryNum ? (Number(row[primaryNum]) || 0) : 0;
    });
    return Object.entries(groups).map(([name, obj]) => ({
      name,
      Count: obj.count,
      Average: obj.count > 0 ? parseFloat((obj.sum / obj.count).toFixed(1)) : 0
    })).slice(0, 8);
  }, [filteredData, catStage, primaryNum]);

  const donutData = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      if (!row) return;
      const val = String(row[catRegion] || 'Central');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).slice(0, 4);
  }, [filteredData, catRegion]);

  // Line Graph data: Sum of primary numerical field over chronological dates
  const lineChartData = useMemo(() => {
    const xCol = dateCol || catStage;
    if (!xCol) return [];
    const groups = {};
    filteredData.forEach(row => {
      if (!row) return;
      const nameVal = String(row[xCol] || 'Unknown');
      const val = primaryNum ? Number(row[primaryNum]) : 1;
      groups[nameVal] = (groups[nameVal] || 0) + (isNaN(val) ? 0 : val);
    });
    const arr = Object.entries(groups).map(([name, value]) => ({ name, value }));
    if (dateCol) {
      return arr.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    }
    return arr;
  }, [filteredData, dateCol, catStage, primaryNum]);

  const chart5Data = useMemo(() => getGroupedChartData(catRegion, catSize, null, 'count'), [filteredData, catRegion, catSize]);

  // Funnel Chart data: sorted stages by count
  const funnelData = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      if (!row) return;
      const val = String(row[catStage] || 'Prospect');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData, catStage]);

  // Scatter Plot data: primaryNum (x) vs secondaryNum (y)
  const scatterData = useMemo(() => {
    if (!primaryNum) return [];
    return filteredData
      .map((row, idx) => ({
        x: parseFloat(Number(row[primaryNum]).toFixed(1)) || 0,
        y: parseFloat(Number(row[secondaryNum || primaryNum]).toFixed(1)) || idx,
        name: String(row[catStage] || `Row ${idx}`)
      }))
      .filter(item => item.x > 0 || item.y > 0)
      .slice(0, 75);
  }, [filteredData, primaryNum, secondaryNum, catStage]);

  const chart8Data = useMemo(() => getGroupedChartData(catStage, catPartner, primaryNum, 'sum'), [filteredData, catStage, catPartner, primaryNum]);
  const chart9Data = useMemo(() => getGroupedChartData(catPartner, catSize, primaryNum, 'mean'), [filteredData, catPartner, catSize, primaryNum]);
  const chart10Data = useMemo(() => getGroupedChartData(catSize, null, primaryNum, 'sum'), [filteredData, catSize, primaryNum]);

  // Aggregate stats
  const totalOpportunityCount = filteredData.length;
  const totalRevenue = useMemo(() => {
    if (!primaryNum) return 0;
    return filteredData.reduce((acc, row) => {
      if (!row) return acc;
      const val = Number(row[primaryNum]);
      return acc + (isNaN(val) ? 0 : val);
    }, 0);
  }, [filteredData, primaryNum]);

  const factoredRevenue = Math.round(totalRevenue * 0.75);

  const formatCurrency = (val) => {
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}bn`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}m`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}k`;
    return `$${val.toLocaleString()}`;
  };

  // Helper to render card header with Zoom button
  const renderCardHeader = (title, chartId, renderFn) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', width: '100%' }}>
      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </span>
      <button 
        type="button"
        onClick={() => setZoomedChart({ id: chartId, title, render: renderFn })}
        style={{ 
          background: 'transparent', 
          border: 'none', 
          color: 'var(--text-muted)', 
          cursor: 'pointer', 
          padding: '2px', 
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        title="Maximize Chart"
      >
        <Maximize2 size={12} />
      </button>
    </div>
  );

  // Chart rendering functions (passed to modal zoom)
  const renderChart1 = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chart1Data.data} margin={{ top: 5, right: 5, left: isZoomed ? 0 : -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <YAxis stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <Tooltip wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        {isZoomed && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {chart1Data.keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderComposedChart = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={composedData} margin={{ top: 5, right: 5, left: isZoomed ? 0 : -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <Tooltip wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        {isZoomed && <Legend wrapperStyle={{ fontSize: 11 }} />}
        <Bar yAxisId="left" dataKey="Count" name="Opp Count" fill="var(--primary)" radius={[2, 2, 0, 0]} barSize={isZoomed ? 20 : 10} />
        <Line yAxisId="right" type="monotone" dataKey="Average" name={`Avg ${primaryNum || 'Revenue'}`} stroke="var(--secondary)" strokeWidth={2} dot={{ r: 2 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const renderChart3 = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={donutData}
          cx="50%"
          cy="50%"
          innerRadius={isZoomed ? 30 : 18}
          outerRadius={isZoomed ? 60 : 30}
          paddingAngle={2}
          dataKey="value"
        >
          {donutData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        {isZoomed && <Legend wrapperStyle={{ fontSize: 11 }} />}
      </PieChart>
    </ResponsiveContainer>
  );

  const renderChart4 = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={lineChartData} margin={{ top: 5, right: 5, left: isZoomed ? 0 : -25, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <YAxis stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <Tooltip wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        {isZoomed && <Legend wrapperStyle={{ fontSize: 11 }} />}
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="var(--secondary)" 
          strokeWidth={isZoomed ? 3 : 2} 
          dot={{ r: isZoomed ? 4 : 2, fill: 'var(--secondary)' }} 
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderChart5 = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chart5Data.data} layout="vertical" margin={{ top: 5, right: 5, left: isZoomed ? 0 : -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
        <XAxis type="number" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <Tooltip wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        {isZoomed && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {chart5Data.keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[(i + 4) % COLORS.length]} radius={[0, 2, 2, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderChart6 = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <FunnelChart margin={{ top: 5, right: isZoomed ? 40 : 15, left: isZoomed ? 40 : 15, bottom: 5 }}>
        <Tooltip wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        <Funnel dataKey="value" data={funnelData} isAnimationActive>
          <LabelList position="right" fill="var(--text-muted)" stroke="none" dataKey="name" fontSize={isZoomed ? 10 : 7} />
          {funnelData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );

  const renderChart7 = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 5, right: 5, left: isZoomed ? 0 : -20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
        <XAxis type="number" dataKey="x" name={primaryNum} stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <YAxis type="number" dataKey="y" name={secondaryNum || 'Index'} stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <ZAxis type="number" range={[isZoomed ? 60 : 40, isZoomed ? 60 : 40]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        {isZoomed && <Legend wrapperStyle={{ fontSize: 11 }} />}
        <Scatter name="Distribution" data={scatterData}>
          {scatterData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );

  const renderChart8 = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chart8Data.data} margin={{ top: 5, right: 5, left: isZoomed ? 0 : -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <YAxis stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <Tooltip wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        {isZoomed && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {chart8Data.keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderChart9 = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chart9Data.data} layout="vertical" margin={{ top: 5, right: 5, left: isZoomed ? 0 : -15, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
        <XAxis type="number" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <Tooltip wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        {isZoomed && <Legend wrapperStyle={{ fontSize: 11 }} />}
        {chart9Data.keys.map((k, i) => (
          <Bar key={k} dataKey={k} fill={COLORS[(i + 3) % COLORS.length]} radius={[0, 2, 2, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  const renderChart10 = (isZoomed = false) => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chart10Data.data} margin={{ top: 5, right: 5, left: isZoomed ? 0 : -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <YAxis stroke="var(--text-muted)" fontSize={isZoomed ? 10 : 8} />
        <Tooltip wrapperStyle={{ fontSize: isZoomed ? 11 : 9 }} />
        {isZoomed && <Legend wrapperStyle={{ fontSize: 11 }} />}
        <Bar dataKey="Count" fill="var(--secondary)" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Workspace Filters cockpit */}
      <div className="glass-card" style={{ padding: '1.25rem 1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <SlidersHorizontal size={16} style={{ color: 'var(--primary)' }} />
            Executive Workspace Filters
          </h3>
          <button className="btn btn-secondary" onClick={resetFilters} style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', height: '30px' }}>
            Reset Filters
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={14} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search data..." 
              className="search-input" 
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              style={{ paddingLeft: '2.25rem', width: '100%', minWidth: 'unset', height: '36px' }}
            />
          </div>

          {stats.categoricalColumns.slice(0, 2).map(col => {
            const uniqueVals = stats.categoricalStats[col]?.topValues?.map(v => v.value) || [];
            return (
              <div key={col}>
                <select 
                  className="select-control"
                  value={selectedFilters[col] || ''}
                  onChange={(e) => handleFilterChange(col, e.target.value)}
                  style={{ width: '100%', height: '36px' }}
                >
                  <option value="">All {col}s</option>
                  {uniqueVals.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            );
          })}

          {stats.dateColumns.length > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input 
                type="date" 
                className="select-control" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '50%', padding: '0.3rem', height: '36px', fontSize: '0.75rem' }}
              />
              <input 
                type="date" 
                className="select-control" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ width: '50%', padding: '0.3rem', height: '36px', fontSize: '0.75rem' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* 4 Premium Top KPI Cards (Unique & Attractive, Green glowing, matching your reference layout) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', width: '100%', marginBottom: '0.5rem' }}>
        
        {/* KPI 1: Opp Count */}
        <div className="glass-card hoverable animate-scale-in" style={{ 
          padding: '1.4rem 1.25rem', 
          borderRadius: '14px', 
          border: '1px solid rgba(132, 204, 22, 0.22)', 
          background: 'linear-gradient(135deg, var(--panel-bg-solid) 0%, rgba(132, 204, 22, 0.04) 100%)',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(132, 204, 22, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--secondary)' }} />
          <strong style={{ display: 'block', fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
            {totalOpportunityCount.toLocaleString()}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
            Total Opportunities
          </span>
        </div>

        {/* KPI 2: Total Revenue */}
        <div className="glass-card hoverable animate-scale-in" style={{ 
          padding: '1.4rem 1.25rem', 
          borderRadius: '14px', 
          border: '1px solid rgba(132, 204, 22, 0.22)', 
          background: 'linear-gradient(135deg, var(--panel-bg-solid) 0%, rgba(132, 204, 22, 0.04) 100%)',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(132, 204, 22, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--secondary)' }} />
          <strong style={{ display: 'block', fontSize: '1.85rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
            {formatCurrency(totalRevenue)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
            Total {primaryNum || 'Revenue'}
          </span>
        </div>

        {/* KPI 3: Avg Value */}
        <div className="glass-card hoverable animate-scale-in" style={{ 
          padding: '1.4rem 1.25rem', 
          borderRadius: '14px', 
          border: '1px solid rgba(132, 204, 22, 0.22)', 
          background: 'linear-gradient(135deg, var(--panel-bg-solid) 0%, rgba(132, 204, 22, 0.04) 100%)',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(132, 204, 22, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--secondary)' }} />
          <strong style={{ display: 'block', fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
            {totalOpportunityCount > 0 ? formatCurrency(Math.round(totalRevenue / totalOpportunityCount)) : '$0'}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
            Average Deal Value
          </span>
        </div>

        {/* KPI 4: Secondary metric sum or Factored Pipeline */}
        <div className="glass-card hoverable animate-scale-in" style={{ 
          padding: '1.4rem 1.25rem', 
          borderRadius: '14px', 
          border: '1px solid rgba(132, 204, 22, 0.22)', 
          background: 'linear-gradient(135deg, var(--panel-bg-solid) 0%, rgba(132, 204, 22, 0.04) 100%)',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(132, 204, 22, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--secondary)' }} />
          <strong style={{ display: 'block', fontSize: '1.85rem', fontWeight: 800, color: 'var(--secondary)', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
            {secondaryNum && secondaryNum !== primaryNum ? getSum(secondaryNum).toLocaleString() : formatCurrency(factoredRevenue)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em' }}>
            {secondaryNum && secondaryNum !== primaryNum ? `Total ${secondaryNum}` : 'Factored Pipeline (75%)'}
          </span>
        </div>

      </div>

      {/* Grid Layout (Refined to 3 columns in row 1 to fit composed chart and remove redundancies) */}
      <div className="executive-dashboard-grid">
        
        {/* ROW 1: 3 Columns (Chart 1, Composed Value/Volume Chart, Chart 3 Donut) */}

        {/* Card 2: Opportunity Count by Partner, Size */}
        <div className="glass-card" style={{ gridColumn: 'span 4', minHeight: '180px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`Opp Volume BY ${catPartner}, ${catSize}`, 'chart1', renderChart1)}
          <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
            {renderChart1()}
          </div>
        </div>

        {/* Card 3: NEW Composed Volume & Average Value Chart (Attractive composed model) */}
        <div className="glass-card" style={{ gridColumn: 'span 4', minHeight: '180px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`Volume & Avg Value BY ${catStage}`, 'composedChart', renderComposedChart)}
          <div style={{ width: '100%', flex: 1, minHeight: 0 }}>
            {renderComposedChart()}
          </div>
        </div>

        {/* Card 4: Donut Share */}
        <div className="glass-card" style={{ gridColumn: 'span 4', minHeight: '180px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`Opportunity Share BY ${catRegion}`, 'chart3', renderChart3)}
          <div style={{ width: '100%', flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {renderChart3()}
          </div>
        </div>

        {/* ROW 2: 4 Columns (Line Graph, Horiz Region, Funnel Chart, Scatter Plot) */}

        {/* Card 6: Timeline Line Graph */}
        <div className="glass-card" style={{ gridColumn: 'span 4', minHeight: '230px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`Opportunity Value Timeline Trend`, 'chart4', renderChart4)}
          <div style={{ width: '100%', height: 160 }}>
            {renderChart4()}
          </div>
        </div>

        {/* Card 7: Clustered Horizontal Region by size */}
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '230px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`BY ${catRegion}, ${catSize} (Horizontal)`, 'chart5', renderChart5)}
          <div style={{ width: '100%', height: 160 }}>
            {renderChart5()}
          </div>
        </div>

        {/* Card 8: Sales Funnel Progression */}
        <div className="glass-card" style={{ gridColumn: 'span 2', minHeight: '230px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`Sales Stage Funnel`, 'chart6', renderChart6)}
          <div style={{ width: '100%', height: 160 }}>
            {renderChart6()}
          </div>
        </div>

        {/* Card 9: Scatter Plot distribution */}
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '230px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`Metric Distribution Scatter`, 'chart7', renderChart7)}
          <div style={{ width: '100%', height: 160 }}>
            {renderChart7()}
          </div>
        </div>

        {/* ROW 3: 4 Columns (Revenue by sales stage, Average Partner Revenue, Factored Revenue KPI, Factored Revenue sizing) */}

        {/* Card 10: Revenue by Sales Stage */}
        <div className="glass-card" style={{ gridColumn: 'span 4', minHeight: '230px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`Revenue BY ${catStage}, ${catPartner}`, 'chart8', renderChart8)}
          <div style={{ width: '100%', height: 160 }}>
            {renderChart8()}
          </div>
        </div>

        {/* Card 11: Average Revenue Horizontal */}
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '230px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`Avg Revenue BY ${catPartner}, ${catSize}`, 'chart9', renderChart9)}
          <div style={{ width: '100%', height: 160 }}>
            {renderChart9()}
          </div>
        </div>

        {/* Card 12: KPI Factored Revenue */}
        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', minHeight: '230px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Factored Revenue
          </span>
          <strong style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0.8rem 0', color: 'var(--text-main)' }}>
            {formatCurrency(factoredRevenue)}
          </strong>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
            75% Pipeline factored projection
          </span>
        </div>

        {/* Card 13: Factored Revenue by Size */}
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '230px', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          {renderCardHeader(`Factored Revenue BY ${catSize}`, 'chart10', renderChart10)}
          <div style={{ width: '100%', height: 160 }}>
            {renderChart10()}
          </div>
        </div>

      </div>

      {/* Lightbox Zoom Modal Overlay */}
      {zoomedChart && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '85%',
            maxWidth: '1000px',
            height: '75%',
            maxHeight: '650px',
            padding: '2.5rem',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)',
            background: 'var(--panel-bg-solid)'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--secondary)' }} />
                {zoomedChart.title}
              </h3>
              <button 
                type="button"
                onClick={() => setZoomedChart(null)}
                style={{ 
                  background: 'var(--panel-bg-solid)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '50%', 
                  width: '32px', 
                  height: '32px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: 'pointer', 
                  color: 'var(--text-main)',
                  transition: 'all 0.2s'
                }}
              >
                <X size={16} />
              </button>
            </div>
            
            {/* Modal Chart Content */}
            <div style={{ flex: 1, width: '100%', minHeight: 0 }}>
              {zoomedChart.render(true)}
            </div>

            {/* Modal Description Footer */}
            <div style={{ 
              fontSize: '0.82rem', 
              color: 'var(--text-muted)', 
              borderTop: '1px solid var(--border-color)', 
              paddingTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Info size={14} style={{ color: 'var(--primary)' }} />
              <span>Use your mouse cursor to hover over points, columns, or line nodes for exact metrics.</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
