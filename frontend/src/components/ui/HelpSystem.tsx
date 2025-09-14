'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface HelpContent {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'assets' | 'portfolio' | 'maintenance' | 'reports';
  keywords: string[];
}

interface HelpSystemProps {
  isOpen: boolean;
  onClose: () => void;
  contextualHelp?: string;
}

const helpDatabase: HelpContent[] = [
  {
    id: 'asset-registration',
    title: 'Asset Registration',
    content: `
      <h3>How to Register a New Asset</h3>
      <ol>
        <li><strong>Asset Tag:</strong> Enter a unique identifier for the asset. This will be auto-generated if you leave it blank.</li>
        <li><strong>Asset Name:</strong> Provide a descriptive name for the asset.</li>
        <li><strong>Category & Subcategory:</strong> Select the appropriate classification for easier searching and reporting.</li>
        <li><strong>Location:</strong> Specify where the asset is located within your facility.</li>
        <li><strong>Financial Details:</strong> Enter purchase price, dates, and depreciation information for accounting purposes.</li>
      </ol>
      <p><strong>Tips:</strong></p>
      <ul>
        <li>Use consistent naming conventions for easier searching</li>
        <li>Always fill in required fields marked with an asterisk (*)</li>
        <li>Save draft information using the browser's local storage feature</li>
      </ul>
    `,
    category: 'assets',
    keywords: ['register', 'asset', 'new', 'create', 'form', 'tag', 'location']
  },
  {
    id: 'portfolio-overview',
    title: 'Portfolio Dashboard Overview',
    content: `
      <h3>Understanding Your Portfolio Dashboard</h3>
      <p>The Portfolio Dashboard provides a comprehensive view of all your real estate properties and their performance metrics.</p>
      
      <h4>Key Metrics:</h4>
      <ul>
        <li><strong>Total Properties:</strong> Number of properties in your portfolio</li>
        <li><strong>Occupancy Rate:</strong> Percentage of occupied space across all properties</li>
        <li><strong>Revenue:</strong> Total rental income and net operating income</li>
      </ul>
      
      <h4>Available Views:</h4>
      <ul>
        <li><strong>Dashboard:</strong> High-level overview with key performance indicators</li>
        <li><strong>Properties:</strong> Detailed table view of all properties</li>
        <li><strong>Analytics:</strong> Financial performance and energy efficiency metrics</li>
      </ul>
    `,
    category: 'portfolio',
    keywords: ['portfolio', 'dashboard', 'properties', 'occupancy', 'revenue', 'metrics']
  },
  {
    id: 'search-functionality',
    title: 'Using Search and Filters',
    content: `
      <h3>Advanced Search Capabilities</h3>
      <p>Turbo Asset provides powerful search functionality across all modules.</p>
      
      <h4>Basic Search:</h4>
      <ul>
        <li>Use the search bar at the top of data tables</li>
        <li>Search across multiple fields simultaneously</li>
        <li>Results are highlighted for easy identification</li>
      </ul>
      
      <h4>Advanced Filters:</h4>
      <ul>
        <li>Click the filter icon to access advanced options</li>
        <li>Combine multiple criteria for precise results</li>
        <li>Save frequently used filter combinations</li>
      </ul>
      
      <h4>Quick Tips:</h4>
      <ul>
        <li>Use quotation marks for exact phrase matching</li>
        <li>Combine search terms with AND, OR operators</li>
        <li>Use date ranges for time-based filtering</li>
      </ul>
    `,
    category: 'general',
    keywords: ['search', 'filter', 'find', 'query', 'advanced', 'table', 'data']
  },
  {
    id: 'export-data',
    title: 'Exporting Data',
    content: `
      <h3>Data Export Options</h3>
      <p>Export your data in multiple formats for reporting and analysis.</p>
      
      <h4>Available Formats:</h4>
      <ul>
        <li><strong>Excel (.xlsx):</strong> Full formatting with multiple sheets</li>
        <li><strong>CSV:</strong> Simple comma-separated values for data analysis</li>
        <li><strong>PDF:</strong> Formatted reports with charts and summaries</li>
      </ul>
      
      <h4>Export Process:</h4>
      <ol>
        <li>Navigate to the data you want to export</li>
        <li>Apply any necessary filters</li>
        <li>Click the "Export" button</li>
        <li>Select your preferred format</li>
        <li>Choose export options (all data or filtered results)</li>
        <li>Download will begin automatically</li>
      </ol>
    `,
    category: 'general',
    keywords: ['export', 'download', 'excel', 'csv', 'pdf', 'report', 'data']
  },
  {
    id: 'maintenance-scheduling',
    title: 'Maintenance Scheduling',
    content: `
      <h3>Preventive Maintenance Scheduling</h3>
      <p>Set up automated maintenance schedules to keep your assets running optimally.</p>
      
      <h4>Creating Maintenance Schedules:</h4>
      <ol>
        <li>Navigate to the asset you want to schedule maintenance for</li>
        <li>Click "Schedule Maintenance" in the asset details</li>
        <li>Choose maintenance type (preventive, corrective, or inspection)</li>
        <li>Set frequency (daily, weekly, monthly, quarterly, or custom)</li>
        <li>Assign responsible technicians or vendors</li>
        <li>Set up notifications and reminders</li>
      </ol>
      
      <h4>Maintenance Types:</h4>
      <ul>
        <li><strong>Preventive:</strong> Regular scheduled maintenance to prevent issues</li>
        <li><strong>Corrective:</strong> Repairs needed to fix existing problems</li>
        <li><strong>Inspection:</strong> Regular checks to assess asset condition</li>
      </ul>
    `,
    category: 'maintenance',
    keywords: ['maintenance', 'schedule', 'preventive', 'repair', 'inspection', 'technician']
  }
];

export const HelpSystem: React.FC<HelpSystemProps> = ({ isOpen, onClose, contextualHelp }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filteredHelp, setFilteredHelp] = useState(helpDatabase);
  const [selectedArticle, setSelectedArticle] = useState<HelpContent | null>(null);

  useEffect(() => {
    if (contextualHelp) {
      const article = helpDatabase.find(h => h.id === contextualHelp);
      if (article) {
        setSelectedArticle(article);
      }
    }
  }, [contextualHelp]);

  useEffect(() => {
    let filtered = helpDatabase;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(help => help.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(help =>
        help.title.toLowerCase().includes(term) ||
        help.content.toLowerCase().includes(term) ||
        help.keywords.some(keyword => keyword.toLowerCase().includes(term))
      );
    }

    setFilteredHelp(filtered);
  }, [searchTerm, selectedCategory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Help Center</h2>
            <p className="text-gray-600">Find answers and learn how to use Turbo Asset</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-1/3 border-r border-gray-200 p-6 overflow-y-auto">
            {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Help</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search for help topics..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="general">General</option>
                <option value="assets">Assets</option>
                <option value="portfolio">Portfolio</option>
                <option value="maintenance">Maintenance</option>
                <option value="reports">Reports</option>
              </select>
            </div>

            {/* Help Articles List */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Help Articles</h3>
              {filteredHelp.map((help) => (
                <button
                  key={help.id}
                  onClick={() => setSelectedArticle(help)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedArticle?.id === help.id
                      ? 'bg-blue-50 border border-blue-200 text-blue-900'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="font-medium">{help.title}</div>
                  <div className="text-sm text-gray-500 capitalize">{help.category}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selectedArticle ? (
              <div>
                <div className="mb-4">
                  <span className="inline-block px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md capitalize mb-2">
                    {selectedArticle.category}
                  </span>
                  <h1 className="text-3xl font-bold text-gray-900">{selectedArticle.title}</h1>
                </div>
                <div 
                  className="prose max-w-none help-content"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a help topic</h3>
                <p className="text-gray-600">Choose an article from the list to view detailed information.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              Need more help? Contact support at{' '}
              <a href="mailto:support@turboasset.com" className="text-blue-600 hover:underline">
                support@turboasset.com
              </a>
            </div>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close Help
            </Button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .help-content h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
          color: #1f2937;
        }
        .help-content h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          color: #374151;
        }
        .help-content p {
          margin-bottom: 1rem;
          line-height: 1.6;
          color: #4b5563;
        }
        .help-content ul, .help-content ol {
          margin-bottom: 1rem;
          padding-left: 1.5rem;
        }
        .help-content li {
          margin-bottom: 0.5rem;
          line-height: 1.5;
          color: #4b5563;
        }
        .help-content strong {
          color: #1f2937;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
};

export default HelpSystem;