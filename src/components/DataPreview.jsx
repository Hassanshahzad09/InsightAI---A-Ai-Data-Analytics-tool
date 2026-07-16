import React, { useState, useMemo } from 'react';
import { detectOutlierRanges } from '../utils/dataProcessor';
import { Search, ChevronLeft, ChevronRight, Download, RefreshCw, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

export const DataPreview = ({ data, schema, fileName }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Calculate outliers for highlighting
  const outlierRanges = useMemo(() => {
    return detectOutlierRanges(data, schema);
  }, [data, schema]);

  // Handle sorting request
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // 1. Apply global search
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(row => {
        return Object.values(row).some(val => 
          String(val).toLowerCase().includes(lowerSearch)
        );
      });
    }

    // 2. Apply sorting
    if (sortConfig.key !== null) {
      const { key, direction } = sortConfig;
      result.sort((a, b) => {
        let valA = a[key];
        let valB = b[key];

        // Handle numeric sorting
        if (schema[key] === 'numeric') {
          valA = Number(valA);
          valB = Number(valB);
          if (isNaN(valA)) valA = -Infinity;
          if (isNaN(valB)) valB = -Infinity;
          return direction === 'asc' ? valA - valB : valB - valA;
        }

        // Handle text/date sorting
        valA = String(valA).toLowerCase();
        valB = String(valB).toLowerCase();
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig, schema]);

  // Pagination logic
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return processedData.slice(startIndex, startIndex + rowsPerPage);
  }, [processedData, currentPage, rowsPerPage]);

  const totalPages = Math.ceil(processedData.length / rowsPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (data.length === 0) return;
    
    const headers = Object.keys(schema);
    const csvRows = [];
    
    // Add header row
    csvRows.push(headers.join(','));
    
    // Add data rows
    data.forEach(row => {
      const values = headers.map(header => {
        const val = row[header];
        // Escape quotes and wrap in quotes if contains commas
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const exportName = fileName ? `Cleaned_${fileName.split('.')[0]}.csv` : "cleaned_dataset.csv";
    link.setAttribute("download", exportName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Excel using xlsx package
  const exportToExcel = () => {
    if (data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Cleaned Data");
    
    const exportName = fileName ? `Cleaned_${fileName.split('.')[0]}.xlsx` : "cleaned_dataset.xlsx";
    XLSX.writeFile(workbook, exportName);
  };

  return (
    <div className="glass-card animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="header-container" style={{ border: 'none', padding: '0' }}>
        <div className="header-meta">
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Cleaned Dataset</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Showing {processedData.length.toLocaleString()} matching records of {data.length.toLocaleString()} total.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={exportToCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={exportToExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} /> Export Excel (XLSX)
          </button>
        </div>
      </div>

      {/* Filter and pagination options */}
      <div className="filter-bar">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search rows..." 
            className="search-input" 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Rows per page:</span>
          <select 
            className="select-control"
            value={rowsPerPage}
            onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
            style={{ width: '80px', height: '36px', padding: '0.35rem 0.5rem', paddingRight: '1.5rem', backgroundPosition: 'right 6px center' }}
          >
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {/* Paginated Table View */}
      <div className="preview-table-container">
        <table className="preview-table">
          <thead>
            <tr>
              {Object.keys(schema).map(col => {
                const isSorted = sortConfig.key === col;
                return (
                  <th 
                    key={col} 
                    onClick={() => requestSort(col)}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {col}
                      {isSorted && (
                        <span style={{ color: 'var(--primary)' }}>
                          {sortConfig.direction === 'asc' ? ' ▲' : ' ▼'}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, idx) => {
              // Check if row contains any outliers for row style tinting
              let rowHasOutlier = false;
              
              const cols = Object.keys(schema);
              const cells = cols.map(col => {
                const val = row[col];
                const type = schema[col];
                let isOutlierVal = false;

                if (type === 'numeric' && outlierRanges[col]) {
                  const numVal = Number(val);
                  const range = outlierRanges[col];
                  if (!isNaN(numVal) && (numVal < range.lower || numVal > range.upper)) {
                    isOutlierVal = true;
                    rowHasOutlier = true;
                  }
                }

                return (
                  <td 
                    key={col} 
                    className={isOutlierVal ? 'outlier-val' : ''}
                    title={isOutlierVal ? "Outlier value detected" : ""}
                  >
                    {val === null || val === undefined ? '' : String(val)}
                  </td>
                );
              });

              return (
                <tr key={idx} className={rowHasOutlier ? 'outlier-row' : ''}>
                  {cells}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="pagination">
          <span className="page-info">
            Showing Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({processedData.length} records)
          </span>
          <div className="page-controls">
            <button 
              className="icon-btn" 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              className="icon-btn" 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
