import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  HelpCircle, 
  Sparkles, 
  ArrowUpRight,
  ArrowDownRight,
  GitBranch,
  Calendar,
  Layers,
  MessageSquare
} from 'lucide-react';

export const Insights = ({ stats, data, generatedInsights }) => {
  const [selectedCol, setSelectedCol] = useState('');

  // Grouped aggregation calculations for specific cards
  const aggregatedCards = useMemo(() => {
    if (!stats || data.length === 0) return null;

    let bestCategory = { col: '', name: 'N/A', sum: 0 };
    let worstCategory = { col: '', name: 'N/A', sum: 0 };
    
    // 1. Calculate Best / Worst Grouped Categories
    if (stats.categoricalColumns.length > 0 && stats.numericColumns.length > 0) {
      const catCol = stats.categoricalColumns[0];
      const numCol = stats.numericColumns[0];
      
      const groups = {};
      data.forEach(row => {
        const cat = String(row[catCol] || 'Unknown');
        const num = Number(row[numCol]);
        if (!isNaN(num)) {
          groups[cat] = (groups[cat] || 0) + num;
        }
      });
      
      const sorted = Object.entries(groups)
        .map(([name, sum]) => ({ name, sum }))
        .sort((a, b) => b.sum - a.sum);
        
      if (sorted.length > 0) {
        bestCategory = { col: catCol, name: sorted[0].name, sum: sorted[0].sum, measure: numCol };
        worstCategory = { col: catCol, name: sorted[sorted.length - 1].name, sum: sorted[sorted.length - 1].sum, measure: numCol };
      }
    }

    // 2. Correlation Summary
    let correlationText = "No significant correlations detected in the current measures.";
    if (stats.numericColumns.length > 1) {
      const pairs = [];
      const seen = new Set();
      stats.numericColumns.forEach(c1 => {
        stats.numericColumns.forEach(c2 => {
          if (c1 === c2) return;
          const key = [c1, c2].sort().join('-');
          if (seen.has(key)) return;
          seen.add(key);
          const r = stats.correlationMatrix[c1][c2];
          pairs.push({ c1, c2, r });
        });
      });
      pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
      if (pairs.length > 0 && Math.abs(pairs[0].r) >= 0.4) {
        const strength = Math.abs(pairs[0].r) > 0.75 ? 'strong' : 'moderate';
        const direction = pairs[0].r > 0 ? 'positive' : 'negative';
        correlationText = `Detected a **${strength} ${direction} correlation** (r = **${pairs[0].r}**) between **${pairs[0].c1}** and **${pairs[0].c2}**.`;
      }
    }

    // 3. Trend Detection
    let trendText = "Timeline timeline is flat or lacks sequential timestamps for linear forecasts.";
    if (stats.dateColumns.length > 0 && stats.numericColumns.length > 0) {
      const dateCol = stats.dateColumns[0];
      const numCol = stats.numericColumns[0];
      
      const dateGroups = {};
      data.forEach(row => {
        const d = row[dateCol];
        const n = Number(row[numCol]);
        if (d && d !== 'Unknown' && !isNaN(n)) {
          dateGroups[d] = (dateGroups[d] || 0) + n;
        }
      });
      const timeline = Object.entries(dateGroups)
        .map(([date, sum]) => ({ date, time: new Date(date).getTime(), sum }))
        .filter(t => !isNaN(t.time))
        .sort((a, b) => a.time - b.time);
        
      if (timeline.length >= 4) {
        const first = timeline[0].sum;
        const last = timeline[timeline.length - 1].sum;
        const change = (((last - first) / (first || 1)) * 100).toFixed(1);
        const direction = last > first ? 'upward growth' : 'downward slope';
        trendText = `The timeline in **${dateCol}** shows an overall **${direction}** for *${numCol}* (moving **${change}%** from start to end).`;
      }
    }

    return { bestCategory, worstCategory, correlationText, trendText };
  }, [stats, data]);

  // Column Profile Inspector
  const columnInsight = useMemo(() => {
    if (!selectedCol || !stats) return null;
    
    const type = stats.numericColumns.includes(selectedCol) ? 'numeric' :
                 stats.categoricalColumns.includes(selectedCol) ? 'categorical' :
                 stats.dateColumns.includes(selectedCol) ? 'date' : 'text';
                 
    if (type === 'numeric') {
      const info = stats.numericStats[selectedCol];
      if (!info) return null;
      
      return (
        <div className="glass-card animate-scale-in" style={{ padding: '1.25rem', marginTop: '1rem', background: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ color: 'var(--secondary)', marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Layers size={14} /> Numerical Summary Profile
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            The values in <strong>{selectedCol}</strong> range between <strong>{info.min.toLocaleString()}</strong> and <strong>{info.max.toLocaleString()}</strong>, 
            averaging <strong>{info.mean.toLocaleString(undefined, {maximumFractionDigits:1})}</strong>. 
            {info.outliersCount > 0 ? ` Standard IQR checks detected ${info.outliersCount} outliers.` : ' No statistical anomalies found.'}
          </p>
        </div>
      );
    } else if (type === 'categorical') {
      const info = stats.categoricalStats[selectedCol];
      if (!info || !info.topValues.length) return null;
      
      const top = info.topValues[0];
      return (
        <div className="glass-card animate-scale-in" style={{ padding: '1.25rem', marginTop: '1rem', background: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ color: 'var(--primary)', marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <GitBranch size={14} /> Categorical Distribution
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            There are <strong>{info.uniqueCount} unique categories</strong>. 
            The most dominant segment is <strong>"{top.value}"</strong>, representing <strong>{top.percentage}%</strong> of all records.
          </p>
        </div>
      );
    } else if (type === 'date') {
      const dates = data
        .map(row => row[selectedCol])
        .filter(d => d && d !== 'Unknown')
        .map(d => new Date(d).getTime())
        .filter(t => !isNaN(t))
        .sort((a, b) => a - b);
        
      if (dates.length === 0) return null;
      const start = new Date(dates[0]).toLocaleDateString();
      const end = new Date(dates[dates.length - 1]).toLocaleDateString();
      
      return (
        <div className="glass-card animate-scale-in" style={{ padding: '1.25rem', marginTop: '1rem', background: 'rgba(255,255,255,0.02)' }}>
          <h4 style={{ color: 'var(--accent)', marginBottom: '0.5rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={14} /> Timeline Span
          </h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            The time sequence spans from <strong>{start}</strong> to <strong>{end}</strong>.
          </p>
        </div>
      );
    }
    return null;
  }, [selectedCol, stats, data]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 5 Premium AI Insight Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card 1: Best Performing Category */}
        <div className="glass-card hoverable" style={{ borderLeft: '4px solid var(--primary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowUpRight size={16} /> Best Performing Category
          </h4>
          {aggregatedCards?.bestCategory.name !== 'N/A' ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Under the dimension <strong>{aggregatedCards.bestCategory.col}</strong>, the category <strong>"{aggregatedCards.bestCategory.name}"</strong> 
              leads performance, accumulating a total <strong>{aggregatedCards.bestCategory.measure}</strong> of <strong>{aggregatedCards.bestCategory.sum.toLocaleString(undefined, {maximumFractionDigits:1})}</strong>.
            </p>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No categorical performance metrics detected.</p>
          )}
        </div>

        {/* Card 2: Lowest Performing Category */}
        <div className="glass-card hoverable" style={{ borderLeft: '4px solid var(--danger)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowDownRight size={16} /> Lowest Performing Category
          </h4>
          {aggregatedCards?.worstCategory.name !== 'N/A' ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              The lowest recording category is <strong>"{aggregatedCards.worstCategory.name}"</strong> under <strong>{aggregatedCards.worstCategory.col}</strong>, 
              reporting a sum of <strong>{aggregatedCards.worstCategory.sum.toLocaleString(undefined, {maximumFractionDigits:1})}</strong>. 
              Optimize resources or evaluate divesting.
            </p>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No categorical performance metrics detected.</p>
          )}
        </div>

        {/* Card 3: Correlation Summary */}
        <div className="glass-card hoverable" style={{ borderLeft: '4px solid var(--secondary)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--secondary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <GitBranch size={16} /> Correlation Index
          </h4>
          <p 
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}
            dangerouslySetInnerHTML={{ __html: aggregatedCards?.correlationText || '' }}
          />
        </div>

        {/* Card 4: Trend Detection */}
        <div className="glass-card hoverable" style={{ borderLeft: '4px solid var(--accent)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} /> Chronological Trend
          </h4>
          <p 
            style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}
            dangerouslySetInnerHTML={{ __html: aggregatedCards?.trendText || '' }}
          />
        </div>

        {/* Card 5: Business Recommendation */}
        <div className="glass-card hoverable" style={{ borderLeft: '4px solid var(--success)', display: 'flex', flexDirection: 'column', gap: '0.75rem', gridColumn: 'span 1' }}>
          <h4 style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lightbulb size={16} style={{ color: 'var(--success)' }} /> AI Recommendation
          </h4>
          <ul className="recommendations-list" style={{ marginTop: '0', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {generatedInsights.recommendations.slice(0, 2).map((rec, idx) => (
              <li key={idx} style={{ fontSize: '0.78rem', lineHeight: '1.4', paddingLeft: '1.15rem' }}>{rec}</li>
            ))}
          </ul>
        </div>

      </div>

      {/* Interactive Column Explorer Card */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HelpCircle size={18} style={{ color: 'var(--primary)' }} />
          Inspect Dimension Profiles
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
          Choose any column to run a local profiling sweep and analyze distribution attributes.
        </p>

        <select 
          className="select-control"
          value={selectedCol}
          onChange={(e) => setSelectedCol(e.target.value)}
          style={{ width: '100%', maxWidth: '360px' }}
        >
          <option value="">-- Select Column --</option>
          {Object.keys(stats.missingValuesReport).map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>

        {columnInsight}
      </div>

    </div>
  );
};
