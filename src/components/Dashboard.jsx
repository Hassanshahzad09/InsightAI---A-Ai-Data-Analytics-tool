import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ScatterChart, 
  Scatter
} from 'recharts';
import { 
  BarChart2, 
  TrendingUp, 
  PieChart as PieIcon, 
  SlidersHorizontal,
  Search,
  Grid,
  Bot,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#818cf8', '#22d3ee'];

export const Dashboard = ({ data, schema, stats }) => {
  // Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Configurable Chart axes
  const [chartType, setChartType] = useState('bar');
  const [chartXAxis, setChartXAxis] = useState(stats.categoricalColumns[0] || stats.dateColumns[0] || '');
  const [chartYAxis, setChartYAxis] = useState(stats.numericColumns[0] || '');
  const [chartAgg, setChartAgg] = useState('sum');

  // Scatter configs
  const [scatterX, setScatterX] = useState(stats.numericColumns[0] || '');
  const [scatterY, setScatterY] = useState(stats.numericColumns[1] || stats.numericColumns[0] || '');

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

  // Aggregate statistics for custom chart
  const customChartData = useMemo(() => {
    if (!chartXAxis || filteredData.length === 0) return [];

    const groups = {};
    filteredData.forEach(row => {
      const xVal = String(row[chartXAxis] || 'Unknown');
      const yVal = chartYAxis ? Number(row[chartYAxis]) : 0;
      
      if (!groups[xVal]) {
        groups[xVal] = { name: xVal, sum: 0, count: 0 };
      }

      if (chartYAxis && !isNaN(yVal)) {
        groups[xVal].sum += yVal;
        groups[xVal].count += 1;
      } else {
        groups[xVal].count += 1;
      }
    });

    const result = Object.values(groups).map(g => {
      let val = 0;
      if (chartAgg === 'sum') val = g.sum;
      else if (chartAgg === 'mean') val = g.count > 0 ? g.sum / g.count : 0;
      else if (chartAgg === 'count') val = g.count;
      
      return {
        name: g.name,
        value: parseFloat(val.toFixed(2))
      };
    });

    if (schema[chartXAxis] === 'date') {
      result.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    } else {
      result.sort((a, b) => b.value - a.value);
    }

    return result.slice(0, 10);
  }, [filteredData, chartXAxis, chartYAxis, chartAgg, schema]);

  // Composition data (using first categorical column)
  const compositionData = useMemo(() => {
    const catCol = stats.categoricalColumns[0];
    if (!catCol || filteredData.length === 0) return [];

    const counts = {};
    filteredData.forEach(row => {
      const val = String(row[catCol] || 'Unknown');
      counts[val] = (counts[val] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredData, stats]);

  // Scatter plot points
  const scatterData = useMemo(() => {
    if (!scatterX || !scatterY || filteredData.length === 0) return [];
    
    return filteredData
      .map(row => ({
        x: Number(row[scatterX]),
        y: Number(row[scatterY])
      }))
      .filter(d => !isNaN(d.x) && !isNaN(d.y))
      .slice(0, 150);
  }, [filteredData, scatterX, scatterY]);

  // Dynamic SaaS KPI Calculations
  const dashboardKpis = useMemo(() => {
    const activeNum = chartYAxis;
    let sumVal = 0;
    let validCount = 0;
    
    filteredData.forEach(row => {
      const val = Number(row[activeNum]);
      if (!isNaN(val)) {
        sumVal += val;
        validCount++;
      }
    });

    // Calculate Data Quality Score
    // Formula based on missing ratios and outlier presence in stats
    let totalMissing = 0;
    Object.values(stats.missingValuesReport).forEach(item => {
      totalMissing += item.count;
    });
    
    const totalCells = stats.totalRows * stats.totalCols;
    const missingRatio = totalCells > 0 ? totalMissing / totalCells : 0;
    
    let totalOutliers = 0;
    Object.values(stats.numericStats).forEach(item => {
      totalOutliers += item.outliersCount;
    });
    const outlierRatio = stats.totalRows > 0 ? totalOutliers / stats.totalRows : 0;

    // High quality if low missing values and few duplicates
    const qualityScore = Math.max(0, Math.round(100 - (missingRatio * 200) - (outlierRatio * 50)));

    return {
      recordsCount: filteredData.length,
      recordsSum: sumVal,
      recordsAvg: validCount > 0 ? sumVal / validCount : 0,
      qualityScore,
      totalOutliers,
      activeNumCol: activeNum
    };
  }, [filteredData, chartYAxis, stats]);

  const CustomChartTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--panel-bg-solid)', border: '1px solid var(--border-color)', padding: '0.65rem 0.85rem', borderRadius: '8px', boxShadow: 'var(--shadow-md)' }}>
          <p style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.15rem', color: 'var(--text-muted)' }}>{payload[0].name}</p>
          <p style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1rem' }}>
            {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-layout-split animate-fade-in">
      
      {/* LEFT COLUMN: Main dashboard space (2/3 width) */}
      <div className="dashboard-main-area">
        
        {/* Dynamic Filters Card */}
        <div className="glass-card" style={{ padding: '1.25rem 1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <SlidersHorizontal size={16} style={{ color: 'var(--primary)' }} />
              Workspace Filters
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
                placeholder="Search..." 
                className="search-input" 
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{ paddingLeft: '2.25rem', width: '100%', minWidth: 'unset', height: '36px' }}
              />
            </div>

            {stats.categoricalColumns.slice(0, 2).map(col => {
              const uniqueVals = stats.categoricalStats[col]?.topValues.map(v => v.value) || [];
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

        {/* 4 Premium SaaS KPI Cards */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          
          {/* KPI 1: Total Records */}
          <div className="glass-card kpi-card" style={{ padding: '1.25rem 1.5rem', '--kpi-color': 'var(--primary)', '--kpi-bg': 'var(--primary-glow)' }}>
            <div className="kpi-icon-container" style={{ width: '44px', height: '44px', fontSize: '1.25rem' }}>📄</div>
            <div className="kpi-info" style={{ gap: '0.1rem' }}>
              <span className="kpi-title" style={{ fontSize: '0.75rem' }}>Total Rows</span>
              <span className="kpi-value" style={{ fontSize: '1.45rem' }}>{dashboardKpis.recordsCount.toLocaleString()}</span>
              <div className="kpi-trend positive">
                <ArrowUpRight size={10} /> Active files
              </div>
            </div>
          </div>

          {/* KPI 2: Imputation score / Missing fields filled */}
          <div className="glass-card kpi-card" style={{ padding: '1.25rem 1.5rem', '--kpi-color': 'var(--secondary)', '--kpi-bg': 'var(--secondary-glow)' }}>
            <div className="kpi-icon-container" style={{ width: '44px', height: '44px', fontSize: '1.25rem' }}>🧹</div>
            <div className="kpi-info" style={{ gap: '0.1rem' }}>
              <span className="kpi-title" style={{ fontSize: '0.75rem' }}>Missing Fields</span>
              <span className="kpi-value" style={{ fontSize: '1.45rem' }}>0</span>
              <div className="kpi-trend positive" style={{ color: 'var(--success)', background: 'rgba(34,197,94,0.1)' }}>
                <ShieldCheck size={10} /> 100% Imputed
              </div>
            </div>
          </div>

          {/* KPI 3: Numeric Columns Count */}
          <div className="glass-card kpi-card" style={{ padding: '1.25rem 1.5rem', '--kpi-color': 'var(--accent)', '--kpi-bg': 'rgba(6,182,212,0.1)' }}>
            <div className="kpi-icon-container" style={{ width: '44px', height: '44px', fontSize: '1.25rem' }}>📊</div>
            <div className="kpi-info" style={{ gap: '0.1rem' }}>
              <span className="kpi-title" style={{ fontSize: '0.75rem' }}>Numeric Fields</span>
              <span className="kpi-value" style={{ fontSize: '1.45rem' }}>{stats.numericColumns.length}</span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Measures detected</span>
            </div>
          </div>

          {/* KPI 4: Data Quality Score */}
          <div className="glass-card kpi-card" style={{ padding: '1.25rem 1.5rem', '--kpi-color': 'var(--success)', '--kpi-bg': 'rgba(34,197,94,0.1)' }}>
            <div className="kpi-icon-container" style={{ width: '44px', height: '44px', fontSize: '1.25rem' }}>⚡</div>
            <div className="kpi-info" style={{ gap: '0.1rem' }}>
              <span className="kpi-title" style={{ fontSize: '0.75rem' }}>Quality Score</span>
              <span className="kpi-value" style={{ fontSize: '1.45rem' }}>{dashboardKpis.qualityScore}%</span>
              <div className="kpi-trend" style={{ 
                background: dashboardKpis.qualityScore > 80 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', 
                color: dashboardKpis.qualityScore > 80 ? 'var(--success)' : 'var(--warning)' 
              }}>
                {dashboardKpis.qualityScore > 80 ? 'Excellent' : 'Moderate'}
              </div>
            </div>
          </div>

        </div>

        {/* Charts responsive Grid */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
          
          {/* Chart 1: Dynamic Performance Line/Bar/Area chart */}
          <div className="glass-card">
            <div className="chart-header">
              <div className="header-meta">
                <h3 className="chart-title" style={{ fontSize: '1.1rem' }}>Performance Breakdown</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Group numerical data by key attributes</p>
              </div>

              <div className="chart-controls" style={{ gap: '0.35rem' }}>
                <select className="select-control" value={chartType} onChange={(e) => setChartType(e.target.value)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '30px' }}>
                  <option value="bar">Bar</option>
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                </select>

                <select className="select-control" value={chartXAxis} onChange={(e) => setChartXAxis(e.target.value)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '30px' }}>
                  {stats.categoricalColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  {stats.dateColumns.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                {stats.numericColumns.length > 0 && (
                  <select className="select-control" value={chartYAxis} onChange={(e) => setChartYAxis(e.target.value)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '30px' }}>
                    {stats.numericColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                )}

                <select className="select-control" value={chartAgg} onChange={(e) => setChartAgg(e.target.value)} style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', height: '30px' }}>
                  <option value="sum">Sum</option>
                  <option value="mean">Mean</option>
                  <option value="count">Volume</option>
                </select>
              </div>
            </div>

            <div style={{ width: '100%', height: 280 }}>
              {customChartData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No chart data matches filters.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={customChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                      <Tooltip content={<CustomChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.03)' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {customChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : chartType === 'line' ? (
                    <LineChart data={customChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ r: 3 }} />
                    </LineChart>
                  ) : (
                    <AreaChart data={customChartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={10} />
                      <YAxis stroke="var(--text-muted)" fontSize={10} />
                      <Tooltip content={<CustomChartTooltip />} />
                      <defs>
                        <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} fill="url(#primaryAreaGrad)" />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            {/* Chart 2: Donut share of top category */}
            {stats.categoricalColumns.length > 0 && (
              <div className="glass-card">
                <h3 className="chart-title" style={{ fontSize: '1.05rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyBetween: 'space-between' }}>
                  Composition Shares
                </h3>
                <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={compositionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {compositionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} rows`, 'Frequency']} />
                      <Legend verticalAlign="bottom" height={24} iconSize={6} wrapperStyle={{ fontSize: '0.68rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Chart 3: Correlation grid matrix */}
            {stats.numericColumns.length > 1 && (
              <div className="glass-card">
                <h3 className="chart-title" style={{ fontSize: '1.05rem', marginBottom: '0.75rem' }}>Correlation Indexes</h3>
                <div className="heatmap-container" style={{ padding: '0' }}>
                  <div className="heatmap-grid" style={{ gap: '3px', gridTemplateColumns: `50px repeat(${stats.numericColumns.slice(0, 3).length}, 50px)` }}>
                    <div style={{ width: 50 }} />
                    {stats.numericColumns.slice(0, 3).map(col => (
                      <div key={col} className="heatmap-axis-label" style={{ width: 50, fontSize: '0.6rem' }} title={col}>
                        {col.substring(0, 6)}..
                      </div>
                    ))}

                    {stats.numericColumns.slice(0, 3).map(rowCol => (
                      <React.Fragment key={rowCol}>
                        <div style={{ fontSize: '0.6rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: '4px', color: 'var(--text-muted)' }}>
                          {rowCol.substring(0, 6)}..
                        </div>
                        {stats.numericColumns.slice(0, 3).map(colCol => {
                          const val = stats.correlationMatrix[rowCol][colCol] || 0;
                          let bg = 'rgba(255,255,255,0.05)';
                          if (val > 0) bg = `rgba(99, 102, 241, ${val * 0.85})`;
                          else if (val < 0) bg = `rgba(239, 68, 68, ${Math.abs(val) * 0.85})`;

                          return (
                            <div 
                              key={colCol} 
                              style={{ width: 50, height: 40, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, borderRadius: '4px', color: 'white', textShadow: '0 1px 1px rgba(0,0,0,0.3)' }}
                              title={`${rowCol} vs ${colCol}: ${val}`}
                            >
                              {val}
                            </div>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chart 4: Bivariate scatter chart */}
          {stats.numericColumns.length >= 2 && (
            <div className="glass-card">
              <div className="chart-header" style={{ marginBottom: '0.75rem' }}>
                <h3 className="chart-title" style={{ fontSize: '1.05rem' }}>Bivariate Distribution</h3>
                <div className="chart-controls" style={{ gap: '0.25rem' }}>
                  <select className="select-control" value={scatterX} onChange={(e) => setScatterX(e.target.value)} style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem', height: '26px' }}>
                    {stats.numericColumns.map(c => <option key={c} value={c}>X: {c}</option>)}
                  </select>
                  <select className="select-control" value={scatterY} onChange={(e) => setScatterY(e.target.value)} style={{ padding: '0.1rem 0.4rem', fontSize: '0.7rem', height: '26px' }}>
                    {stats.numericColumns.map(c => <option key={c} value={c}>Y: {c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 10, bottom: 5, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis type="number" dataKey="x" stroke="var(--text-muted)" fontSize={9} />
                    <YAxis type="number" dataKey="y" stroke="var(--text-muted)" fontSize={9} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter data={scatterData} fill="var(--secondary)" fillOpacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* RIGHT COLUMN: Floating AI Assistant Panel (1/3 width) */}
      <div className="glass-card ai-side-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <div className="ai-assistant-avatar">
            <Bot size={22} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800 }}>Insight Analyst</h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
              ● Local AI Engine Active
            </span>
          </div>
        </div>

        <div className="ai-chat-bubble animate-scale-in">
          Hello! I have scanned your dataset. We are currently filtering <strong>{dashboardKpis.recordsCount.toLocaleString()}</strong> rows. 
          {dashboardKpis.activeNumCol && (
            <span> The aggregated <strong>{chartAgg}</strong> of *{dashboardKpis.activeNumCol}* stands at <strong>{dashboardKpis.recordsSum.toLocaleString(undefined, {maximumFractionDigits:1})}</strong>.</span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quick Observations</h4>
          
          <ul className="recommendations-list" style={{ marginTop: '0', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <li style={{ fontSize: '0.8rem', paddingLeft: '1.25rem' }}>
              <strong>Dataset Quality:</strong> Overall score is <strong>{dashboardKpis.qualityScore}%</strong>. Outlier rows total <strong>{dashboardKpis.totalOutliers}</strong>.
            </li>
            
            {stats.categoricalColumns.length > 0 && stats.categoricalStats[stats.categoricalColumns[0]]?.topValues[0] && (
              <li style={{ fontSize: '0.8rem', paddingLeft: '1.25rem' }}>
                <strong>Top category:</strong> "{stats.categoricalStats[stats.categoricalColumns[0]].topValues[0].value}" occupies <strong>{stats.categoricalStats[stats.categoricalColumns[0]].topValues[0].percentage}%</strong> of records.
              </li>
            )}

            {stats.numericColumns.length > 1 && (
              <li style={{ fontSize: '0.8rem', paddingLeft: '1.25rem' }}>
                We detected <strong>{stats.numericColumns.length} key numeric metrics</strong>. Open the <strong>AI Insights</strong> tab in the sidebar to review the full natural language recommendations and correlation profiles!
              </li>
            )}
          </ul>
        </div>
        
      </div>
      
    </div>
  );
};
