import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  SlidersHorizontal,
  Search,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  Grid
} from 'lucide-react';

const COLORS = ['#06b6d4', '#84cc16', '#10b981', '#f59e0b', '#22c55e', '#ef4444'];

export const Dashboard = ({ data, schema, stats }) => {
  // Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  const catStage = stats.categoricalColumns[0] || 'Stage';
  const catPartner = stats.categoricalColumns[1] || stats.categoricalColumns[0] || 'Partner';
  const catRegion = stats.categoricalColumns[2] || stats.categoricalColumns[0] || 'Region';
  const catSize = stats.categoricalColumns[3] || stats.categoricalColumns[0] || 'Size';
  const dateCol = stats.dateColumns[0] || '';

  // Universal dynamic grouped aggregator
  const getGroupedChartData = (xAxisCol, groupCol, measureCol, operation = 'count') => {
    if (!xAxisCol) return { keys: [], data: [] };
    const groups = {};
    const uniqueGroupVals = new Set();

    filteredData.forEach(row => {
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
  const chart2Data = useMemo(() => getGroupedChartData(catPartner, catStage, null, 'count'), [filteredData, catPartner, catStage]);
  
  const donutData = useMemo(() => {
    const counts = {};
    filteredData.forEach(row => {
      const val = String(row[catRegion] || 'Central');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value })).slice(0, 4);
  }, [filteredData, catRegion]);

  const chart4Data = useMemo(() => getGroupedChartData(dateCol || catStage, catStage, null, 'count'), [filteredData, dateCol, catStage]);
  const chart5Data = useMemo(() => getGroupedChartData(catRegion, catSize, null, 'count'), [filteredData, catRegion, catSize]);
  const chart6Data = useMemo(() => getGroupedChartData(catStage, null, null, 'count'), [filteredData, catStage]);
  const chart7Data = useMemo(() => getGroupedChartData(catPartner, catSize, primaryNum, 'mean'), [filteredData, catPartner, catSize, primaryNum]);
  const chart8Data = useMemo(() => getGroupedChartData(catStage, catPartner, primaryNum, 'sum'), [filteredData, catStage, catPartner, primaryNum]);
  const chart9Data = useMemo(() => getGroupedChartData(catPartner, catSize, primaryNum, 'mean'), [filteredData, catPartner, catSize, primaryNum]);
  const chart10Data = useMemo(() => getGroupedChartData(catSize, null, primaryNum, 'sum'), [filteredData, catSize, primaryNum]);

  // Aggregate stats
  const totalOpportunityCount = filteredData.length;
  const totalRevenue = useMemo(() => {
    if (!primaryNum) return 0;
    return filteredData.reduce((acc, row) => {
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

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Workspace Filters header */}
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

      {/* 13-Card Executive Grid Layout */}
      <div className="executive-dashboard-grid">
        
        {/* ROW 1: 5 Columns (Opportunity Count, Chart 1, Chart 2, Chart 3, Revenue) */}
        
        {/* Card 1: KPI Opportunity Count */}
        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', minHeight: '130px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Opportunity Count
          </span>
          <strong style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--text-main)' }}>
            {totalOpportunityCount}
          </strong>
        </div>

        {/* Card 2: Opportunity Count by Partner, Size */}
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '130px', padding: '1rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Opportunity Count BY {catPartner.toUpperCase()}, {catSize.toUpperCase()}
          </span>
          <div style={{ width: '100%', height: 90 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart1Data.data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} />
                <YAxis stroke="var(--text-muted)" fontSize={8} />
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
                {chart1Data.keys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 3: Opportunity Count by Partner, Stage */}
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '130px', padding: '1rem' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Opportunity Count BY {catPartner.toUpperCase()}, {catStage.toUpperCase()}
          </span>
          <div style={{ width: '100%', height: 90 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart2Data.data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} />
                <YAxis stroke="var(--text-muted)" fontSize={8} />
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
                {chart2Data.keys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={COLORS[(i + 2) % COLORS.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 4: Opportunity Count by Region (Donut) */}
        <div className="glass-card" style={{ gridColumn: 'span 2', minHeight: '130px', padding: '1rem', display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
            BY {catRegion.toUpperCase()}
          </span>
          <div style={{ width: '100%', height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={18}
                  outerRadius={30}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 5: KPI Revenue */}
        <div className="glass-card" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', minHeight: '130px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Revenue ({numName})
          </span>
          <strong style={{ fontSize: '2.1rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--secondary)' }}>
            {formatCurrency(totalRevenue)}
          </strong>
        </div>

        {/* ROW 2: 4 Columns (Stacked Month, Horiz Region, Opportunity Stage, Average Revenue) */}

        {/* Card 6: Opportunity count by month stacked stage */}
        <div className="glass-card" style={{ gridColumn: 'span 4', minHeight: '230px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Opportunity Count BY MONTH / {catStage.toUpperCase()} (100% Stacked)
          </span>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart4Data.data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} />
                <YAxis stroke="var(--text-muted)" fontSize={8} />
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
                {chart4Data.keys.map((k, i) => (
                  <Bar key={k} dataKey={k} stackId="a" fill={COLORS[i % COLORS.length]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 7: Clustered Horizontal Region by size */}
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '230px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            BY {catRegion.toUpperCase()}, {catSize.toUpperCase()} (Horizontal)
          </span>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart5Data.data} layout="vertical" margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={8} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={8} />
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
                {chart5Data.keys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={COLORS[(i + 4) % COLORS.length]} radius={[0, 2, 2, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 8: Opp Count by Stage */}
        <div className="glass-card" style={{ gridColumn: 'span 2', minHeight: '230px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            BY {catStage.toUpperCase()}
          </span>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart6Data.data} layout="vertical" margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={8} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={8} />
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="Count" fill="var(--primary)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 9: Average Revenue by Partner Driven, size */}
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '230px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Average Revenue BY {catPartner.toUpperCase()}
          </span>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart7Data.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} />
                <YAxis stroke="var(--text-muted)" fontSize={8} />
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
                {chart7Data.keys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={COLORS[(i + 1) % COLORS.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROW 3: 4 Columns (Revenue by sales stage, Average Partner Revenue, Factored Revenue KPI, Factored Revenue sizing) */}

        {/* Card 10: Revenue by Sales Stage */}
        <div className="glass-card" style={{ gridColumn: 'span 4', minHeight: '230px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Revenue BY {catStage.toUpperCase()}, {catPartner.toUpperCase()}
          </span>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart8Data.data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} />
                <YAxis stroke="var(--text-muted)" fontSize={8} />
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
                {chart8Data.keys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 11: Average Revenue Horizontal */}
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '230px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Average Revenue BY {catPartner.toUpperCase()}, {catSize.toUpperCase()}
          </span>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart9Data.data} layout="vertical" margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={8} />
                <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={8} />
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
                {chart9Data.keys.map((k, i) => (
                  <Bar key={k} dataKey={k} fill={COLORS[(i + 3) % COLORS.length]} radius={[0, 2, 2, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
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
        <div className="glass-card" style={{ gridColumn: 'span 3', minHeight: '230px', padding: '1.25rem' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Factored Revenue BY {catSize.toUpperCase()}
          </span>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart10Data.data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={8} />
                <YAxis stroke="var(--text-muted)" fontSize={8} />
                <Tooltip wrapperStyle={{ fontSize: 9 }} />
                <Bar dataKey="Count" fill="var(--secondary)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
};
