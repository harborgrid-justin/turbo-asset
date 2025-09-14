'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useNotificationHelpers } from '@/components/ui/NotificationSystem';

interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  includeHeaders: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  selectedColumns?: string[];
  filterCriteria?: Record<string, any>;
}

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  data: any[];
  filename: string;
  availableColumns?: { key: string; label: string }[];
  title?: string;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  data,
  filename,
  availableColumns = [],
  title = 'Export Data'
}) => {
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeHeaders: true,
    selectedColumns: availableColumns.map(col => col.key)
  });
  const [isExporting, setIsExporting] = useState(false);
  const { showSuccess, showError, showInfo } = useNotificationHelpers();

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Filter data based on selected columns
      let exportData = data;
      if (exportOptions.selectedColumns && exportOptions.selectedColumns.length > 0) {
        exportData = data.map(item => {
          const filteredItem: any = {};
          exportOptions.selectedColumns!.forEach(col => {
            if (item.hasOwnProperty(col)) {
              filteredItem[col] = item[col];
            }
          });
          return filteredItem;
        });
      }

      // Apply date range filter if specified
      if (exportOptions.dateRange && exportOptions.dateRange.start && exportOptions.dateRange.end) {
        exportData = exportData.filter(item => {
          const itemDate = new Date(item.createdAt || item.date || item.purchaseDate);
          const startDate = new Date(exportOptions.dateRange!.start);
          const endDate = new Date(exportOptions.dateRange!.end);
          return itemDate >= startDate && itemDate <= endDate;
        });
      }

      // Generate file based on format
      const timestamp = new Date().toISOString().split('T')[0];
      const fileExtension = exportOptions.format === 'excel' ? 'xlsx' : exportOptions.format;
      const finalFilename = `${filename}-${timestamp}.${fileExtension}`;

      switch (exportOptions.format) {
        case 'csv':
          await exportToCSV(exportData, finalFilename, exportOptions.includeHeaders);
          break;
        case 'excel':
          await exportToExcel(exportData, finalFilename, exportOptions.includeHeaders);
          break;
        case 'pdf':
          await exportToPDF(exportData, finalFilename, title);
          break;
      }

      showSuccess(
        'Export Successful',
        `Data exported to ${finalFilename}`,
        {
          label: 'Close',
          onClick: onClose
        }
      );
    } catch (error) {
      console.error('Export error:', error);
      showError(
        'Export Failed',
        'An error occurred while exporting the data. Please try again.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = async (data: any[], filename: string, includeHeaders: boolean) => {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    let csv = '';
    const keys = Object.keys(data[0]);

    // Add headers if requested
    if (includeHeaders) {
      const headers = availableColumns.length > 0 
        ? exportOptions.selectedColumns!.map(col => {
            const column = availableColumns.find(c => c.key === col);
            return column ? column.label : col;
          })
        : keys;
      csv += headers.join(',') + '\n';
    }

    // Add data rows
    data.forEach(row => {
      const values = (exportOptions.selectedColumns || keys).map(key => {
        const value = row[key];
        // Handle values that might contain commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csv += values.join(',') + '\n';
    });

    // Download the file
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    downloadFile(blob, filename);
  };

  const exportToExcel = async (data: any[], filename: string, includeHeaders: boolean) => {
    // For now, we'll create a CSV format that can be opened in Excel
    // In a real implementation, you might use a library like SheetJS
    await exportToCSV(data, filename, includeHeaders);
    showInfo(
      'Excel Export',
      'File saved as CSV format that can be opened in Excel. For full Excel features, consider upgrading to our premium export functionality.'
    );
  };

  const exportToPDF = async (data: any[], filename: string, reportTitle: string) => {
    // For now, we'll create a simple HTML version that can be printed to PDF
    // In a real implementation, you might use a library like jsPDF
    let html = `
      <html>
        <head>
          <title>${reportTitle}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${reportTitle}</h1>
          <p>Generated on: ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
    `;

    // Add headers
    const selectedCols = exportOptions.selectedColumns || Object.keys(data[0] || {});
    selectedCols.forEach(col => {
      const column = availableColumns.find(c => c.key === col);
      const label = column ? column.label : col;
      html += `<th>${label}</th>`;
    });

    html += `
              </tr>
            </thead>
            <tbody>
    `;

    // Add data rows
    data.forEach(row => {
      html += '<tr>';
      selectedCols.forEach(col => {
        html += `<td>${row[col] || ''}</td>`;
      });
      html += '</tr>';
    });

    html += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'text/html' });
    downloadFile(blob, filename.replace('.pdf', '.html'));
    
    showInfo(
      'PDF Export',
      'File saved as HTML format. Use your browser\'s "Print to PDF" function to create a PDF. For direct PDF generation, consider upgrading to our premium export functionality.'
    );
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-gray-600">Export {data.length} records</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Export Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'csv', label: 'CSV', description: 'Comma-separated values' },
                { value: 'excel', label: 'Excel', description: 'Microsoft Excel format' },
                { value: 'pdf', label: 'PDF', description: 'Portable Document Format' }
              ].map((format) => (
                <label key={format.value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={format.value}
                    checked={exportOptions.format === format.value}
                    onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value as any })}
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg text-center ${
                    exportOptions.format === format.value 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="font-medium">{format.label}</div>
                    <div className="text-xs text-gray-500">{format.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="includeHeaders"
                type="checkbox"
                checked={exportOptions.includeHeaders}
                onChange={(e) => setExportOptions({ ...exportOptions, includeHeaders: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="includeHeaders" className="ml-2 text-sm font-medium text-gray-700">
                Include column headers
              </label>
            </div>
          </div>

          {/* Column Selection */}
          {availableColumns.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Columns to Export</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto border border-gray-200 rounded-md p-3">
                {availableColumns.map((column) => (
                  <label key={column.key} className="flex items-center text-sm">
                    <input
                      type="checkbox"
                      checked={exportOptions.selectedColumns?.includes(column.key) || false}
                      onChange={(e) => {
                        const selected = exportOptions.selectedColumns || [];
                        if (e.target.checked) {
                          setExportOptions({
                            ...exportOptions,
                            selectedColumns: [...selected, column.key]
                          });
                        } else {
                          setExportOptions({
                            ...exportOptions,
                            selectedColumns: selected.filter(col => col !== column.key)
                          });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-2"
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range (Optional)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={exportOptions.dateRange?.start || ''}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    dateRange: {
                      ...exportOptions.dateRange,
                      start: e.target.value,
                      end: exportOptions.dateRange?.end || ''
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={exportOptions.dateRange?.end || ''}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    dateRange: {
                      ...exportOptions.dateRange,
                      start: exportOptions.dateRange?.start || '',
                      end: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            loading={isExporting}
            disabled={!exportOptions.selectedColumns || exportOptions.selectedColumns.length === 0}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Data
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;