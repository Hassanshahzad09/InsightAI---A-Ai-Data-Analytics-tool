import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, AlertCircle, Sparkles, FileText, ChevronRight } from 'lucide-react';

export const UploadSection = ({ onDataParsed }) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processMultipleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      processMultipleFiles(Array.from(e.target.files));
    }
  };

  const onButtonClick = () => {
    fileInputRef.current.click();
  };

  const mergeDatasets = (datasets) => {
    if (datasets.length === 0) return [];
    if (datasets.length === 1) return datasets[0];

    // Collect all unique keys (columns) across all uploaded datasets
    const allCols = new Set();
    datasets.forEach(ds => {
      if (ds && ds.length > 0) {
        Object.keys(ds[0]).forEach(col => {
          if (col) allCols.add(col);
        });
      }
    });

    // Merge rows, padding missing columns with empty string
    const merged = [];
    datasets.forEach(ds => {
      ds.forEach(row => {
        const newRow = {};
        allCols.forEach(col => {
          newRow[col] = row[col] !== undefined && row[col] !== null ? String(row[col]) : "";
        });
        merged.push(newRow);
      });
    });
    return merged;
  };

  const processMultipleFiles = async (files) => {
    setError(null);
    const parsedDatasets = [];
    const fileNames = [];

    // Helper: Parse a single file and return its JSON dataset
    const parseSingleFile = (file) => {
      return new Promise((resolve, reject) => {
        const fileName = file.name;
        const extension = fileName.split('.').pop().toLowerCase();

        if (extension === 'csv') {
          Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                resolve({ data: results.data, name: fileName });
              } else {
                reject(new Error(`CSV file "${fileName}" seems to be empty.`));
              }
            },
            error: (err) => {
              reject(new Error(`Error parsing CSV "${fileName}": ${err.message}`));
            }
          });
        } else if (extension === 'xlsx' || extension === 'xls') {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const data = new Uint8Array(e.target.result);
              const workbook = XLSX.read(data, { type: 'array' });
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
              
              if (json && json.length > 0) {
                const formattedJson = json.map(row => {
                  const newRow = {};
                  Object.keys(row).forEach(key => {
                    newRow[key] = row[key] !== null && row[key] !== undefined ? String(row[key]) : "";
                  });
                  return newRow;
                });
                resolve({ data: formattedJson, name: fileName });
              } else {
                reject(new Error(`Excel file "${fileName}" seems to be empty.`));
              }
            } catch (err) {
              reject(new Error(`Error parsing Excel "${fileName}": ${err.message}`));
            }
          };
          reader.onerror = () => reject(new Error(`Failed to read file "${fileName}"`));
          reader.readAsArrayBuffer(file);
        } else {
          reject(new Error(`Unsupported format for "${fileName}". Use .csv, .xlsx, or .xls.`));
        }
      });
    };

    try {
      // Parse all files concurrently
      const results = await Promise.all(files.map(file => parseSingleFile(file)));
      
      results.forEach(res => {
        parsedDatasets.push(res.data);
        fileNames.push(res.name);
      });

      // Merge datasets
      const mergedData = mergeDatasets(parsedDatasets);
      const mergedName = fileNames.length > 1 
        ? `Merged Dataset (${fileNames.length} files: ${fileNames.map(f => f.split('.')[0]).join(', ')})`
        : fileNames[0];

      onDataParsed(mergedData, mergedName);

    } catch (err) {
      setError(err.message || "Failed to process files.");
    }
  };

  // Preloaded sample datasets generators (linked to samples)
  const loadSampleDataset = (type) => {
    let data = [];
    let name = "";

    if (type === 'ecommerce') {
      name = "q1_sales_performance_report.csv";
      const categories = ["Electronics", "Furniture", "Office Supplies"];
      const subs = {
        "Electronics": ["Phones", "Laptops", "Accessories", "Printers"],
        "Furniture": ["Chairs", "Tables", "Bookcases", "Furnishings"],
        "Office Supplies": ["Paper", "Binders", "Pens", "Storage"]
      };
      const regions = ["North", "South", "East", "West"];
      const segments = ["Consumer", "Corporate", "Home Office"];
      const startDate = new Date("2026-01-01").getTime();
      const endDate = new Date("2026-06-30").getTime();

      for (let i = 1; i <= 120; i++) {
        const cat = categories[Math.floor(Math.random() * categories.length)];
        const sub = subs[cat][Math.floor(Math.random() * subs[cat].length)];
        const sales = parseFloat((Math.random() * 800 + 15).toFixed(2));
        const qty = Math.floor(Math.random() * 8) + 1;
        const discount = Math.random() > 0.7 ? parseFloat((Math.random() * 0.3).toFixed(2)) : 0;
        const profit = parseFloat((sales * qty * (0.15 + Math.random() * 0.25 - discount)).toFixed(2));
        const randomTime = startDate + Math.random() * (endDate - startDate);
        const d = new Date(randomTime);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Intentional duplicates/missing values
        const isMissingSub = i === 12 || i === 45;
        const isMissingSales = i === 23 || i === 87;

        data.push({
          "Order ID": `CA-2026-${10000 + i}`,
          "Order Date": dateStr,
          "Customer Segment": segments[Math.floor(Math.random() * segments.length)],
          "Category": cat,
          "Sub-Category": isMissingSub ? "" : sub,
          "Sales": isMissingSales ? "" : String(sales),
          "Quantity": String(qty),
          "Discount": String(discount),
          "Profit": String(profit),
          "Region": regions[Math.floor(Math.random() * regions.length)]
        });

        if (i === 15 || i === 65) {
          data.push({ ...data[data.length - 1] });
        }
      }
    } else if (type === 'hr') {
      name = "annual_employee_evaluation_2026.xlsx";
      const departments = ["Engineering", "Sales", "Marketing", "HR", "Finance", "Product"];
      const performanceRatings = ["Needs Improvement", "Meets Expectations", "Exceeds Expectations", "Outstanding"];
      
      for (let i = 1; i <= 80; i++) {
        const salary = Math.floor(Math.random() * 70000) + 50000;
        const rating = performanceRatings[Math.floor(Math.random() * performanceRatings.length)];
        const projects = Math.floor(Math.random() * 8) + 2;
        const hoursWorked = Math.floor(Math.random() * 400) + 1600;
        const sickLeaves = Math.floor(Math.random() * 12);
        const joinYear = 2018 + Math.floor(Math.random() * 8);
        const joinMonth = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
        const joinDay = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
        const hireDate = `${joinYear}-${joinMonth}-${joinDay}`;
        
        const isSalaryOutlier = i === 42;
        const isLeavesMissing = i === 18 || i === 54;

        data.push({
          "Employee ID": `EMP-${1000 + i}`,
          "Full Name": `Employee Name ${i}`,
          "Department": departments[Math.floor(Math.random() * departments.length)],
          "Hire Date": hireDate,
          "Salary": isSalaryOutlier ? "350000" : String(salary),
          "Performance Rating": rating,
          "Projects Completed": String(projects),
          "Annual Hours Worked": String(hoursWorked),
          "Sick Leaves": isLeavesMissing ? "" : String(sickLeaves)
        });

        if (i === 10) {
          data.push({ ...data[data.length - 1] });
        }
      }
    } else if (type === 'web') {
      name = "website_traffic_analytics_june.csv";
      const channels = ["Organic Search", "Direct", "Paid Search", "Social Media", "Referral", "Email"];
      const devices = ["Mobile", "Desktop", "Tablet"];
      const startDate = new Date("2026-06-01").getTime();
      const oneDay = 24 * 60 * 60 * 1000;

      for (let i = 0; i < 90; i++) {
        const d = new Date(startDate + i * oneDay);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        channels.forEach(channel => {
          const sessions = Math.floor(Math.random() * 1200) + 100;
          const bounceRate = parseFloat((Math.random() * 45 + 20).toFixed(2));
          const pageViews = sessions * (Math.floor(Math.random() * 3) + 2);
          const conversions = Math.floor(sessions * (Math.random() * 0.06 + 0.01));
          const revenue = parseFloat((conversions * (Math.random() * 40 + 20)).toFixed(2));
          
          data.push({
            "Session Date": dateStr,
            "Traffic Channel": channel,
            "Device Class": devices[Math.floor(Math.random() * devices.length)],
            "Sessions": String(sessions),
            "Bounce Rate (%)": String(bounceRate),
            "Page Views": String(pageViews),
            "Conversions": String(conversions),
            "Revenue ($)": String(revenue)
          });
        });
      }
    }

    onDataParsed(data, name);
  };

  const recentUploads = [
    { name: "q1_sales_performance_report.csv", size: "14.2 KB", type: "ecommerce", label: "E-Commerce Mock" },
    { name: "annual_employee_evaluation_2026.xlsx", size: "18.5 KB", type: "hr", label: "HR Payroll Mock" },
    { name: "website_traffic_analytics_june.csv", size: "32.1 KB", type: "web", label: "Web traffic Mock" }
  ];

  return (
    <div className="glass-card animate-fade-in" style={{ padding: '3.5rem', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Upload Your Dataset</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
        Import multiple Comma-Separated Values (.csv) or Microsoft Excel (.xlsx, .xls) files to merge and analyze.
      </p>

      {/* Drag & Drop Area */}
      <form 
        id="form-file-upload" 
        onDragEnter={handleDrag} 
        onSubmit={(e) => e.preventDefault()}
        style={{ marginBottom: '2.5rem' }}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          id="input-file-upload" 
          multiple={true} 
          onChange={handleChange} 
          accept=".csv, .xlsx, .xls"
          style={{ display: 'none' }}
        />
        
        <div 
          className={`upload-container ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          style={{ padding: '4.5rem 2rem' }}
        >
          <Upload className="upload-icon" style={{ color: 'var(--primary)', width: '54px', height: '54px', marginBottom: '1.25rem' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Drag and drop files here</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.75rem' }}>or click to browse multiple local files</p>
          
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={(e) => { e.stopPropagation(); onButtonClick(); }}
            style={{ borderRadius: '8px', height: '38px', fontSize: '0.85rem' }}
          >
            Browse File
          </button>
        </div>
      </form>

      {error && (
        <div className="glass-card animate-scale-in" style={{ borderColor: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', marginBottom: '2rem', textAlign: 'left' }}>
          <AlertCircle className="finding-icon" style={{ color: 'var(--danger)' }} />
          <div>
            <h4 style={{ color: 'var(--danger)', fontSize: '0.95rem' }}>Upload Error</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{error}</p>
          </div>
        </div>
      )}

      {/* Grid: Templates & Recents */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem', textAlign: 'left', marginTop: '1.5rem' }}>
        
        {/* Play with sample templates */}
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={18} style={{ color: 'var(--accent)' }} /> 
            Load Interactive Sandboxes
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div 
              className="glass-card hoverable" 
              onClick={() => loadSampleDataset('ecommerce')}
              style={{ padding: '1.15rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <h4 style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>E-Commerce Operations Sandbox</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>120+ order records. Contains duplicates and empty numeric fields.</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div 
              className="glass-card hoverable" 
              onClick={() => loadSampleDataset('hr')}
              style={{ padding: '1.15rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <h4 style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>Employee Payroll & HR Sandbox</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>80+ employee rows. Outlier salary indicators and missing logs.</p>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
          </div>
        </div>

        {/* Mock Recent Uploads */}
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--primary)' }} /> 
            Recent Files
          </h3>
          <div className="recent-uploads-list">
            {recentUploads.map((file, idx) => (
              <div 
                key={idx} 
                className="recent-upload-row" 
                onClick={() => loadSampleDataset(file.type)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem' }}
                title={`Quick load ${file.label}`}
              >
                <FileSpreadsheet size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '0.82rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{file.name}</p>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{file.size}</span>
                </div>
                <span className="badge badge-numeric" style={{ fontSize: '0.65rem', padding: '0.1rem 0.3rem' }}>LOAD</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
