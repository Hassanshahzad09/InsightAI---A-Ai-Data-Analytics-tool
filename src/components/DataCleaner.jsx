import React, { useState, useEffect } from 'react';
import { 
  inferSchema, 
  cleanMissingValues, 
  removeDuplicates, 
  standardizeColumnNames, 
  standardizeDates,
  detectOutlierRanges
} from '../utils/dataProcessor';
import { 
  Database, 
  Wand2, 
  CheckCircle,
  AlertTriangle,
  Info,
  Layers,
  ChevronRight
} from 'lucide-react';

export const DataCleaner = ({ rawData, fileName, onCleaningComplete }) => {
  const [inferredSchema, setInferredSchema] = useState({});
  const [cleaning, setCleaning] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(1); // 1 to 7 corresponding to pipeline
  const [cleaningStatusText, setCleaningStatusText] = useState('');
  
  // Cleaning configurations
  const [numericMethod, setNumericMethod] = useState('mean');
  const [categoricalMethod, setCategoricalMethod] = useState('placeholder');
  const [dateMethod, setDateMethod] = useState('placeholder');
  const [shouldRemoveDuplicates, setShouldRemoveDuplicates] = useState(true);
  const [shouldStandardizeNames, setShouldStandardizeNames] = useState(true);
  const [shouldStandardizeDates, setShouldStandardizeDates] = useState(true);
  
  const [cleaningReport, setCleaningReport] = useState(null);

  useEffect(() => {
    if (rawData && rawData.length > 0) {
      const schema = inferSchema(rawData);
      setInferredSchema(schema);
      setCleaningReport(null);
      setPipelineStep(1);
    }
  }, [rawData]);

  const pipelineStages = [
    { num: 1, label: "Upload" },
    { num: 2, label: "Detect Types" },
    { num: 3, label: "Handle Missing" },
    { num: 4, label: "Remove Duplicates" },
    { num: 5, label: "Clean Dataset" },
    { num: 6, label: "Analysis" },
    { num: 7, label: "Dashboard" }
  ];

  const handleCleanData = () => {
    setCleaning(true);
    setPipelineStep(2);
    setCleaningStatusText('Scanning column values to infer data types...');

    // Sequence of animations for the visual pipeline
    const runStep = (step) => {
      return new Promise((resolve) => {
        setTimeout(() => {
          setPipelineStep(step);
          if (step === 3) {
            setCleaningStatusText(`Imputing missing values (Numeric: ${numericMethod}, Categorical: ${categoricalMethod})...`);
          } else if (step === 4) {
            setCleaningStatusText(shouldRemoveDuplicates ? 'Scanning dataset to delete duplicate rows...' : 'Skipping duplicate checks...');
          } else if (step === 5) {
            setCleaningStatusText('Running final columns string standardisations...');
          } else if (step === 6) {
            setCleaningStatusText('Generating statistical summaries and Pearson matrices...');
          } else if (step === 7) {
            setCleaningStatusText('Compiling dashboard and local AI insights report...');
          }
          resolve();
        }, 400); // 400ms per stage for a responsive feel
      });
    };

    const processFinalData = async () => {
      await runStep(2);
      await runStep(3);
      await runStep(4);
      await runStep(5);
      await runStep(6);
      await runStep(7);

      setTimeout(() => {
        let data = [...rawData];
        let schema = { ...inferredSchema };
        const rawRowsCount = rawData.length;
        let duplicatesRemovedCount = 0;
        let missingFieldsFilled = 0;

        // 1. Standardize column names
        if (shouldStandardizeNames) {
          data = standardizeColumnNames(data);
          const tempSchema = {};
          const oldKeys = Object.keys(inferredSchema);
          
          oldKeys.forEach(col => {
            let clean = col.trim()
              .replace(/[^\w\s-]/gi, '')
              .replace(/\s+/g, ' ');
            clean = clean.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            if (!clean) clean = `Column_${Math.random().toString(36).substr(2, 4)}`;
            
            let finalName = clean;
            let counter = 1;
            while (Object.keys(tempSchema).includes(finalName)) {
              finalName = `${clean}_${counter}`;
              counter++;
            }
            tempSchema[finalName] = inferredSchema[col];
          });
          schema = tempSchema;
        }

        // Count missing
        const columns = Object.keys(schema);
        columns.forEach(col => {
          data.forEach(row => {
            const val = row[col];
            if (val === null || val === undefined || String(val).trim() === '') {
              missingFieldsFilled++;
            }
          });
        });

        // 2. Remove Duplicates
        if (shouldRemoveDuplicates) {
          const uniqueData = removeDuplicates(data);
          duplicatesRemovedCount = data.length - uniqueData.length;
          data = uniqueData;
        }

        // 3. Impute Missing Values
        data = cleanMissingValues(data, schema, {
          numeric: numericMethod,
          categorical: categoricalMethod,
          date: dateMethod
        });

        // 4. Standardize Dates
        if (shouldStandardizeDates) {
          data = standardizeDates(data, schema);
        }

        // Count outliers
        const outliers = detectOutlierRanges(data, schema);
        let outlierTotalCount = 0;
        Object.keys(outliers).forEach(col => {
          const range = outliers[col];
          data.forEach(row => {
            const val = Number(row[col]);
            if (!isNaN(val) && (val < range.lower || val > range.upper)) {
              outlierTotalCount++;
            }
          });
        });

        const report = {
          originalRows: rawRowsCount,
          cleanedRows: data.length,
          duplicatesRemoved: duplicatesRemovedCount,
          missingFieldsFilled,
          outliersDetected: outlierTotalCount,
          colsCount: columns.length
        };

        setCleaningReport(report);
        setCleaning(false);
        onCleaningComplete(data, schema, report);
      }, 300);
    };

    processFinalData();
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Visual Progress Pipeline */}
      <div className="glass-card" style={{ padding: '1.75rem 2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Data Preparation Pipeline
        </h3>
        
        <div className="pipeline-track">
          <div 
            className="pipeline-progress-fill" 
            style={{ width: `${((pipelineStep - 1) / (pipelineStages.length - 1)) * 100}%` }}
          />
          {pipelineStages.map((stage) => (
            <div 
              key={stage.num} 
              className={`pipeline-step ${pipelineStep === stage.num ? 'active' : ''} ${pipelineStep > stage.num ? 'completed' : ''}`}
            >
              <div className="pipeline-node">
                {pipelineStep > stage.num ? "✓" : stage.num}
              </div>
              <span className="pipeline-label">{stage.label}</span>
            </div>
          ))}
        </div>

        {cleaning && (
          <div className="animate-scale-in" style={{ textAlign: 'center', color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.5rem', background: 'rgba(99, 102, 241, 0.05)', padding: '0.75rem', borderRadius: '8px' }}>
            <span>⚡ {cleaningStatusText}</span>
          </div>
        )}
      </div>

      {/* Main Cleaner Forms Layout */}
      <div className="cleaning-grid">
        
        {/* Left Option configs */}
        <div className="glass-card cleaner-options">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={18} style={{ color: 'var(--primary)' }} />
            Data Preparation Settings
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
            Configure rules to clean details and load data.
          </p>

          <div className="option-group">
            <label>Numerical Imputation Method</label>
            <select 
              className="select-control"
              value={numericMethod}
              onChange={(e) => setNumericMethod(e.target.value)}
            >
              <option value="mean">Replace with Mean (Average)</option>
              <option value="median">Replace with Median (Middle)</option>
              <option value="mode">Replace with Mode (Most Frequent)</option>
              <option value="remove">Delete rows containing missing values</option>
            </select>
          </div>

          <div className="option-group">
            <label>Categorical Imputation Method</label>
            <select 
              className="select-control"
              value={categoricalMethod}
              onChange={(e) => setCategoricalMethod(e.target.value)}
            >
              <option value="placeholder">Replace with "Unknown" placeholder</option>
              <option value="mode">Replace with Mode (Most Frequent)</option>
              <option value="remove">Delete rows containing missing values</option>
            </select>
          </div>

          <div className="option-group">
            <label>Date Imputation Method</label>
            <select 
              className="select-control"
              value={dateMethod}
              onChange={(e) => setDateMethod(e.target.value)}
            >
              <option value="placeholder">Replace with 1970-01-01 placeholder</option>
              <option value="mode">Replace with Mode (Most Frequent)</option>
              <option value="remove">Delete rows containing missing values</option>
            </select>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />

          <div className="option-group" style={{ gap: '0.6rem' }}>
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={shouldRemoveDuplicates}
                onChange={(e) => setShouldRemoveDuplicates(e.target.checked)}
              />
              Remove duplicate records
            </label>

            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={shouldStandardizeNames}
                onChange={(e) => setShouldStandardizeNames(e.target.checked)}
              />
              Standardize column headers (snake case to Capital)
            </label>

            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={shouldStandardizeDates}
                onChange={(e) => setShouldStandardizeDates(e.target.checked)}
              />
              Standardize date string formats (YYYY-MM-DD)
            </label>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleCleanData}
            disabled={cleaning}
            style={{ width: '100%', marginTop: '1.25rem', height: '44px' }}
          >
            <Wand2 size={18} />
            Clean & Prepare Dataset
          </button>
        </div>

        {/* Right detected columns list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-card" style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} style={{ color: 'var(--secondary)' }} />
              Inferred Column Schema ({Object.keys(inferredSchema).length} fields)
            </h3>
            
            <div className="column-schema-list">
              {Object.entries(inferredSchema).map(([colName, type]) => (
                <div key={colName} className="column-schema-item animate-scale-in" style={{ padding: '0.65rem 0.85rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{colName}</span>
                  <span className={`badge badge-${type}`} style={{ fontSize: '0.7rem' }}>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
