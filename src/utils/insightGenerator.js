/**
 * Utility for generating natural-language business insights from statistical analysis of a dataset.
 */

/**
 * Generate full report of insights.
 * @param {Object} stats - The analysis statistics from analyzeDataset
 * @param {Array<Object>} data - The cleaned rows
 * @returns {Object} { executiveSummary, keyFindings, recommendations, columnSpecific }
 */
export const generateInsights = (stats, data) => {
  if (!stats || !data || data.length === 0) {
    return {
      executiveSummary: "No dataset loaded or analyzed yet.",
      keyFindings: [],
      recommendations: [],
      anomalies: []
    };
  }

  const keyFindings = [];
  const recommendations = [];
  const anomalies = [];

  // 1. Dataset Overview / Scale
  let executiveSummary = `The dataset consists of **${stats.totalRows.toLocaleString()} records** and **${stats.totalCols} fields**. `;
  
  if (stats.numericColumns.length > 0) {
    executiveSummary += `It contains numerical measures such as ${stats.numericColumns.slice(0, 3).map(c => `*${c}*`).join(', ')}. `;
  }
  if (stats.categoricalColumns.length > 0) {
    executiveSummary += `Categorical dimensions include ${stats.categoricalColumns.slice(0, 3).map(c => `*${c}*`).join(', ')}. `;
  }
  
  // 2. Categorical Dominance & Performance Highlights (Grouped Analysis)
  if (stats.categoricalColumns.length > 0) {
    stats.categoricalColumns.forEach(catCol => {
      const catInfo = stats.categoricalStats[catCol];
      if (!catInfo || catInfo.uniqueCount === 0) return;
      
      const topValObj = catInfo.topValues[0];
      const topPercentage = parseFloat(topValObj.percentage);
      
      if (topPercentage > 40) {
        keyFindings.push({
          type: 'dominance',
          title: `Dominant Category in ${catCol}`,
          description: `**"${topValObj.value}"** represents the majority of records in **${catCol}**, accounting for **${topPercentage}%** (${topValObj.count.toLocaleString()} occurrences) of the entire dataset.`,
          severity: 'info'
        });
      }

      // If we have numeric columns, we can find aggregations
      if (stats.numericColumns.length > 0) {
        const primaryNumCol = stats.numericColumns[0]; // e.g. Sales, Amount, Price
        
        // Group by catCol, aggregate sum and mean of primaryNumCol
        const groups = {};
        data.forEach(row => {
          const catVal = String(row[catCol] || 'Unknown');
          const numVal = Number(row[primaryNumCol]);
          if (!isNaN(numVal)) {
            if (!groups[catVal]) groups[catVal] = { sum: 0, count: 0, values: [] };
            groups[catVal].sum += numVal;
            groups[catVal].count += 1;
            groups[catVal].values.push(numVal);
          }
        });

        const groupAggs = Object.entries(groups).map(([cat, info]) => ({
          category: cat,
          sum: info.sum,
          mean: info.sum / info.count,
          count: info.count
        })).sort((a, b) => b.sum - a.sum);

        if (groupAggs.length > 1) {
          const highest = groupAggs[0];
          const lowest = groupAggs[groupAggs.length - 1];
          const ratio = (highest.sum / (lowest.sum || 1)).toFixed(1);
          
          keyFindings.push({
            type: 'performance',
            title: `Performance disparity in ${catCol} by ${primaryNumCol}`,
            description: `**"${highest.category}"** is the top-performing category in **${catCol}** with a total sum of **${highest.sum.toLocaleString(undefined, {maximumFractionDigits: 2})}** for *${primaryNumCol}*. In contrast, **"${lowest.category}"** represents the lowest performance at **${lowest.sum.toLocaleString(undefined, {maximumFractionDigits: 2})}** (a **${ratio}x** performance difference).`,
            severity: 'success'
          });
          
          recommendations.push(
            `Capitalize on the success of **"${highest.category}"** in **${catCol}** by replicating its strategy or increasing resource allocation.`,
            `Investigate potential bottlenecks or lack of demand in the **"${lowest.category}"** category to determine if it should be optimized or divested.`
          );
        }
      }
    });
  }

  // 3. Outlier and Anomaly Warnings
  if (stats.numericColumns.length > 0) {
    stats.numericColumns.forEach(col => {
      const numInfo = stats.numericStats[col];
      if (!numInfo) return;
      
      const outlierPct = (numInfo.outliersCount / stats.totalRows) * 100;
      if (numInfo.outliersCount > 0) {
        anomalies.push({
          column: col,
          count: numInfo.outliersCount,
          percentage: outlierPct.toFixed(1),
          description: `**${numInfo.outliersCount} record(s)** (${outlierPct.toFixed(1)}% of rows) in **${col}** were identified as statistical outliers. Standard range lies between **${numInfo.outlierLower !== null && numInfo.outlierLower !== undefined ? numInfo.outlierLower.toLocaleString(undefined, {maximumFractionDigits:2}) : 'N/A'}** and **${numInfo.outlierUpper !== null && numInfo.outlierUpper !== undefined ? numInfo.outlierUpper.toLocaleString(undefined, {maximumFractionDigits:2}) : 'N/A'}**.`
        });
        
        if (outlierPct > 5) {
          keyFindings.push({
            type: 'anomaly',
            title: `High Outlier Rate in ${col}`,
            description: `**${col}** has a relatively high percentage of outliers (**${outlierPct.toFixed(1)}%**), indicating high volatility or potential data quality issues in this metric.`,
            severity: 'warning'
          });
          recommendations.push(`Review the ${numInfo.outliersCount} outlier values in **${col}** to ensure they do not stem from typing errors or system reporting anomalies.`);
        }
      }
    });
  }

  // 4. Missing Data Warnings
  if (stats.missingValuesReport) {
    Object.entries(stats.missingValuesReport).forEach(([col, info]) => {
      const pct = parseFloat(info.percentage);
      if (pct > 15) {
        keyFindings.push({
          type: 'data_quality',
          title: `Significant Missing Data in ${col}`,
          description: `The column **${col}** is missing **${pct}%** (${info.count} rows) of its data. This high rate of missing values could bias analytical results.`,
          severity: 'warning'
        });
        recommendations.push(`Implement steps to capture the missing data in **${col}** at the source, as imputation may introduce bias in subsequent analyses.`);
      }
    });
  }

  // 5. Correlation Analysis
  if (stats.numericColumns.length > 1 && stats.correlationMatrix) {
    const correlationPairs = [];
    const seen = new Set();
    
    stats.numericColumns.forEach(colA => {
      stats.numericColumns.forEach(colB => {
        if (colA === colB) return;
        const pairKey = [colA, colB].sort().join('-');
        if (seen.has(pairKey)) return;
        seen.add(pairKey);
        
        const r = stats.correlationMatrix[colA][colB];
        if (Math.abs(r) >= 0.5) {
          correlationPairs.push({ colA, colB, r });
        }
      });
    });

    correlationPairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    correlationPairs.slice(0, 3).forEach(pair => {
      const sign = pair.r > 0 ? 'positive' : 'negative';
      const strength = Math.abs(pair.r) > 0.8 ? 'extremely strong' : 'moderate-to-strong';
      
      keyFindings.push({
        type: 'correlation',
        title: `Correlation: ${pair.colA} & ${pair.colB}`,
        description: `We detected a **${strength} ${sign} correlation** (r = **${pair.r}**) between **${pair.colA}** and **${pair.colB}**. This suggests changes in *${pair.colA}* are closely aligned with changes in *${pair.colB}*.`,
        severity: 'info'
      });
      
      if (pair.r > 0.6) {
        recommendations.push(`Leverage the strong positive link between **${pair.colA}** and **${pair.colB}**. Promoting growth in one parameter will likely drive gains in the other.`);
      }
    });
  }

  // 6. Time Series Trends
  if (stats.dateColumns.length > 0 && stats.numericColumns.length > 0) {
    const dateCol = stats.dateColumns[0];
    const numCol = stats.numericColumns[0];
    
    // Aggregate by date
    const dateGroups = {};
    data.forEach(row => {
      const dVal = row[dateCol];
      const nVal = Number(row[numCol]);
      if (dVal && dVal !== 'Unknown' && !isNaN(nVal)) {
        dateGroups[dVal] = (dateGroups[dVal] || 0) + nVal;
      }
    });
    
    const sortedTimeline = Object.entries(dateGroups)
      .map(([date, sum]) => ({ date, time: new Date(date).getTime(), sum }))
      .filter(item => !isNaN(item.time))
      .sort((a, b) => a.time - b.time);
      
    if (sortedTimeline.length >= 5) {
      // Calculate simple linear regression slope
      const n = sortedTimeline.length;
      const xMean = sortedTimeline.reduce((sum, item) => sum + item.time, 0) / n;
      const yMean = sortedTimeline.reduce((sum, item) => sum + item.sum, 0) / n;
      
      let num = 0;
      let den = 0;
      sortedTimeline.forEach(item => {
        num += (item.time - xMean) * (item.sum - yMean);
        den += Math.pow(item.time - xMean, 2);
      });
      
      const slope = den !== 0 ? num / den : 0;
      const startVal = sortedTimeline[0].sum;
      const endVal = sortedTimeline[n - 1].sum;
      const changePct = (((endVal - startVal) / (startVal || 1)) * 100).toFixed(1);
      
      const direction = slope > 0 ? 'upward' : slope < 0 ? 'downward' : 'stable';
      
      keyFindings.push({
        type: 'trend',
        title: `Timeline Trend for ${numCol}`,
        description: `Over the observed period in **${dateCol}**, *${numCol}* shows an overall **${direction} trend**. Total metric moved from **${startVal.toLocaleString(undefined, {maximumFractionDigits:1})}** at the start to **${endVal.toLocaleString(undefined, {maximumFractionDigits:1})}** at the end (a change of **${changePct}%**).`,
        severity: direction === 'upward' ? 'success' : direction === 'downward' ? 'warning' : 'info'
      });
      
      if (slope > 0) {
        recommendations.push(`The upward trajectory in **${numCol}** over time indicates positive growth. Study factors active in the latter half of the timeline to sustain momentum.`);
      } else if (slope < 0) {
        recommendations.push(`The downward trend in **${numCol}** demands immediate attention. Conduct customer interviews or audit operational changes that occurred along the timeline.`);
      }
    }
  }

  // Fallback if no findings or recommendations
  if (keyFindings.length === 0) {
    keyFindings.push({
      type: 'general',
      title: 'Initial Overview',
      description: 'The dataset has a standard, uniform distribution. No major correlations, outliers, or dominant categories were immediately flagged.',
      severity: 'info'
    });
  }
  
  if (recommendations.length === 0) {
    recommendations.push(
      "Conduct segmentations of the categorical variables against numerical performance metrics to uncover hidden value streams.",
      "Check data entry systems to ensure columns with high variations are recorded with consistent units."
    );
  }

  return {
    executiveSummary,
    keyFindings,
    recommendations,
    anomalies
  };
};
