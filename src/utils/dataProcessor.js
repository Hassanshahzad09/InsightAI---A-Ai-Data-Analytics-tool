/**
 * Utility functions for parsing, cleaning, profiling, and analyzing datasets.
 */

// Helper: check if a value is numeric
export const isNumeric = (val) => {
  if (val === null || val === undefined || val === '') return false;
  return !isNaN(Number(val));
};

// Helper: check if a value is a date
export const isDate = (val) => {
  if (val === null || val === undefined || val === '') return false;
  if (isNumeric(val)) return false; // Avoid treating timestamps as dates for basic typing
  const timestamp = Date.parse(val);
  if (isNaN(timestamp)) return false;
  
  // Extra check to ensure it looks like a date (contains slashes, dashes, or word months)
  const dateRegex = /[\d]{1,4}[-/\\.][\d]{1,2}[-/\\.][\d]{1,4}|[A-Za-z]+ \d{1,2},? \d{4}/;
  return dateRegex.test(String(val));
};

/**
 * Infer data types for all columns in a dataset.
 * @param {Array<Object>} data - Raw parsed rows
 * @returns {Object} Schema mapping column name to type ('numeric' | 'date' | 'categorical' | 'text')
 */
export const inferSchema = (data) => {
  if (!data || data.length === 0) return {};
  
  const columns = Object.keys(data[0]);
  const schema = {};
  
  // Sample up to 100 rows to determine type
  const sampleSize = Math.min(data.length, 100);
  const sampleRows = data.slice(0, sampleSize);
  
  columns.forEach(col => {
    let numericCount = 0;
    let dateCount = 0;
    let emptyCount = 0;
    const uniqueValues = new Set();
    
    sampleRows.forEach(row => {
      const val = row[col];
      if (val === null || val === undefined || String(val).trim() === '') {
        emptyCount++;
        return;
      }
      uniqueValues.add(val);
      if (isNumeric(val)) {
        numericCount++;
      } else if (isDate(val)) {
        dateCount++;
      }
    });
    
    const validCount = sampleSize - emptyCount;
    if (validCount === 0) {
      schema[col] = 'text'; // Fallback
      return;
    }
    
    // Deciding type
    if (numericCount / validCount > 0.8) {
      schema[col] = 'numeric';
    } else if (dateCount / validCount > 0.8) {
      schema[col] = 'date';
    } else {
      // Calculate cardinality to distinguish categorical vs free text
      // If unique values are small or represent a low percentage of rows, it's categorical
      const uniqueCount = uniqueValues.size;
      const cardinalityRatio = uniqueCount / validCount;
      
      if (uniqueCount <= 15 || cardinalityRatio < 0.25) {
        schema[col] = 'categorical';
      } else {
        schema[col] = 'text';
      }
    }
  });
  
  return schema;
};

/**
 * Standardize column names.
 * e.g., " Total Sales ($) " -> "Total Sales" or "total_sales"
 * Let's convert to Title Case with spaces trimmed and special chars removed for neat dashboard display.
 */
export const standardizeColumnNames = (data) => {
  if (!data || data.length === 0) return data;
  
  const oldColumns = Object.keys(data[0]);
  const columnMapping = {};
  
  oldColumns.forEach(col => {
    // Trim, remove special characters except spaces, and clean up extra spaces
    let clean = col.trim()
      .replace(/[^\w\s-]/gi, '') // Remove special characters
      .replace(/\s+/g, ' ');      // Single spaces
    
    // Capitalize first letters of words
    clean = clean.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
      
    if (!clean) clean = `Column_${oldColumns.indexOf(col) + 1}`;
    
    // Resolve duplicates in standardized names
    let finalName = clean;
    let counter = 1;
    while (Object.values(columnMapping).includes(finalName)) {
      finalName = `${clean}_${counter}`;
      counter++;
    }
    columnMapping[col] = finalName;
  });
  
  return data.map(row => {
    const newRow = {};
    oldColumns.forEach(col => {
      newRow[columnMapping[col]] = row[col];
    });
    return newRow;
  });
};

/**
 * Detect outliers in numeric columns using the IQR method.
 * Returns an object with outlier ranges for each numeric column.
 */
export const detectOutlierRanges = (data, schema) => {
  const ranges = {};
  
  Object.keys(schema).forEach(col => {
    if (schema[col] !== 'numeric') return;
    
    // Extract sorted numbers
    const values = data
      .map(row => Number(row[col]))
      .filter(val => !isNaN(val))
      .sort((a, b) => a - b);
      
    if (values.length < 4) return;
    
    // Calculate Q1, Q3 and IQR
    const q1Idx = Math.floor(values.length * 0.25);
    const q3Idx = Math.floor(values.length * 0.75);
    const q1 = values[q1Idx];
    const q3 = values[q3Idx];
    const iqr = q3 - q1;
    
    ranges[col] = {
      lower: q1 - 1.5 * iqr,
      upper: q3 + 1.5 * iqr,
      q1,
      q3,
      iqr
    };
  });
  
  return ranges;
};

/**
 * Handle missing values in dataset.
 * options: {
 *   numeric: 'mean' | 'median' | 'mode' | 'remove',
 *   categorical: 'mode' | 'placeholder' | 'remove',
 *   date: 'mode' | 'placeholder' | 'remove'
 * }
 */
export const cleanMissingValues = (data, schema, options = {}) => {
  const numericMethod = options.numeric || 'mean';
  const categoricalMethod = options.categorical || 'placeholder';
  const dateMethod = options.date || 'placeholder';
  
  const columns = Object.keys(schema);
  const replacements = {};
  
  // Calculate replacement values where needed
  columns.forEach(col => {
    const type = schema[col];
    const validValues = data
      .map(row => row[col])
      .filter(val => val !== null && val !== undefined && String(val).trim() !== '');
      
    if (validValues.length === 0) {
      replacements[col] = type === 'numeric' ? 0 : 'N/A';
      return;
    }
    
    if (type === 'numeric') {
      const numbers = validValues.map(Number).sort((a, b) => a - b);
      if (numericMethod === 'mean') {
        const sum = numbers.reduce((a, b) => a + b, 0);
        replacements[col] = sum / numbers.length;
      } else if (numericMethod === 'median') {
        const mid = Math.floor(numbers.length / 2);
        replacements[col] = numbers.length % 2 !== 0 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
      } else if (numericMethod === 'mode') {
        replacements[col] = getMode(numbers);
      }
    } else {
      // Categorical, Text, or Date
      if (type === 'date') {
        if (dateMethod === 'mode') {
          replacements[col] = getMode(validValues);
        } else if (dateMethod === 'placeholder') {
          replacements[col] = '1970-01-01'; // Fallback
        }
      } else { // categorical or text
        if (categoricalMethod === 'mode') {
          replacements[col] = getMode(validValues);
        } else if (categoricalMethod === 'placeholder') {
          replacements[col] = 'Unknown';
        }
      }
    }
  });
  
  const cleanedData = [];
  
  data.forEach(row => {
    let keepRow = true;
    const newRow = { ...row };
    
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const val = row[col];
      const type = schema[col];
      
      const isMissing = val === null || val === undefined || String(val).trim() === '';
      
      if (isMissing) {
        if (type === 'numeric' && numericMethod === 'remove') {
          keepRow = false;
          break;
        }
        if (type === 'categorical' && categoricalMethod === 'remove') {
          keepRow = false;
          break;
        }
        if (type === 'date' && dateMethod === 'remove') {
          keepRow = false;
          break;
        }
        
        newRow[col] = replacements[col];
      } else if (type === 'numeric') {
        newRow[col] = Number(val);
      }
    }
    
    if (keepRow) {
      cleanedData.push(newRow);
    }
  });
  
  return cleanedData;
};

// Helper: Get mode (most frequent value)
const getMode = (arr) => {
  if (arr.length === 0) return null;
  const counts = {};
  let maxVal = arr[0], maxCount = 1;
  for (let i = 0; i < arr.length; i++) {
    const val = arr[i];
    counts[val] = (counts[val] || 0) + 1;
    if (counts[val] > maxCount) {
      maxVal = val;
      maxCount = counts[val];
    }
  }
  return maxVal;
};

/**
 * Standardize dates in date columns.
 */
export const standardizeDates = (data, schema) => {
  const dateCols = Object.keys(schema).filter(col => schema[col] === 'date');
  if (dateCols.length === 0) return data;
  
  return data.map(row => {
    const newRow = { ...row };
    dateCols.forEach(col => {
      const val = row[col];
      if (val && val !== 'Unknown' && val !== '1970-01-01') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          // Format as YYYY-MM-DD
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          newRow[col] = `${year}-${month}-${day}`;
        }
      }
    });
    return newRow;
  });
};

/**
 * Filter duplicates from dataset.
 */
export const removeDuplicates = (data) => {
  const seen = new Set();
  return data.filter(row => {
    const str = JSON.stringify(row);
    if (seen.has(str)) return false;
    seen.add(str);
    return true;
  });
};

/**
 * Calculate dataset statistics & metadata
 */
export const analyzeDataset = (data, schema) => {
  if (!data || data.length === 0) return null;
  
  const totalRows = data.length;
  const cols = Object.keys(schema);
  const totalCols = cols.length;
  
  // 1. Missing Values Report
  const missingValuesReport = {};
  cols.forEach(col => {
    let missingCount = 0;
    data.forEach(row => {
      const val = row[col];
      if (val === null || val === undefined || String(val).trim() === '' || val === 'Unknown') {
        missingCount++;
      }
    });
    missingValuesReport[col] = {
      count: missingCount,
      percentage: ((missingCount / totalRows) * 100).toFixed(1)
    };
  });
  
  // 2. Numeric Column Summary Stats
  const numericStats = {};
  const outlierRanges = detectOutlierRanges(data, schema);
  
  cols.forEach(col => {
    if (schema[col] !== 'numeric') return;
    
    const values = data
      .map(row => Number(row[col]))
      .filter(val => !isNaN(val));
      
    if (values.length === 0) return;
    
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    // Median
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    
    // Standard Deviation
    const sqDiffs = values.map(v => Math.pow(v - mean, 2));
    const avgSqDiff = sqDiffs.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(avgSqDiff);
    
    // Count outliers
    let outlierCount = 0;
    const range = outlierRanges[col];
    if (range) {
      values.forEach(v => {
        if (v < range.lower || v > range.upper) {
          outlierCount++;
        }
      });
    }
    
    numericStats[col] = {
      sum,
      mean,
      median,
      min,
      max,
      stdDev,
      outliersCount: outlierCount,
      outlierLower: range ? range.lower : null,
      outlierUpper: range ? range.upper : null
    };
  });
  
  // 3. Categorical Values Distributions (Top 10 values per category)
  const categoricalStats = {};
  cols.forEach(col => {
    if (schema[col] !== 'categorical') return;
    
    const counts = {};
    data.forEach(row => {
      const val = row[col] === null || row[col] === undefined ? 'Unknown' : String(row[col]);
      counts[val] = (counts[val] || 0) + 1;
    });
    
    const sortedFrequencies = Object.entries(counts)
      .map(([value, count]) => ({
        value,
        count,
        percentage: ((count / totalRows) * 100).toFixed(1)
      }))
      .sort((a, b) => b.count - a.count);
      
    categoricalStats[col] = {
      uniqueCount: Object.keys(counts).length,
      topValues: sortedFrequencies.slice(0, 10)
    };
  });
  
  // 4. Pearson Correlation Matrix
  const numericCols = cols.filter(col => schema[col] === 'numeric');
  const correlationMatrix = {};
  
  numericCols.forEach(colA => {
    correlationMatrix[colA] = {};
    numericCols.forEach(colB => {
      if (colA === colB) {
        correlationMatrix[colA][colB] = 1;
        return;
      }
      
      const valuesA = [];
      const valuesB = [];
      
      data.forEach(row => {
        const valA = Number(row[colA]);
        const valB = Number(row[colB]);
        if (!isNaN(valA) && !isNaN(valB)) {
          valuesA.push(valA);
          valuesB.push(valB);
        }
      });
      
      if (valuesA.length < 2) {
        correlationMatrix[colA][colB] = 0;
        return;
      }
      
      correlationMatrix[colA][colB] = parseFloat(calculatePearsonCorrelation(valuesA, valuesB).toFixed(3));
    });
  });
  
  return {
    totalRows,
    totalCols,
    missingValuesReport,
    numericStats,
    categoricalStats,
    correlationMatrix,
    numericColumns: numericCols,
    categoricalColumns: cols.filter(col => schema[col] === 'categorical'),
    dateColumns: cols.filter(col => schema[col] === 'date'),
    textColumns: cols.filter(col => schema[col] === 'text')
  };
};

// Helper: Calculate Pearson Correlation
const calculatePearsonCorrelation = (x, y) => {
  const n = x.length;
  if (n === 0) return 0;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  
  const sumX2 = x.reduce((a, b) => a + b * b, 0);
  const sumY2 = y.reduce((a, b) => a + b * b, 0);
  
  const sumXY = x.reduce((a, b, idx) => a + b * y[idx], 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  if (denominator === 0) return 0;
  return numerator / denominator;
};
