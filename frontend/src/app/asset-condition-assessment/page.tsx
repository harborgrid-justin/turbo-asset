'use client';

import React, { useState } from 'react';

interface AssetCondition {
  id: string;
  assetTag: string;
  assetName: string;
  category: string;
  location: string;
  overallScore: number;
  mechanicalScore?: number;
  electricalScore?: number;
  structuralScore?: number;
  aestheticScore?: number;
  lastAssessment: string;
  nextAssessment: string;
  assessedBy: string;
  condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  urgentIssues: string[];
  recommendations: string[];
  estimatedRepairCost?: number;
}

const AssetConditionAssessmentPage = () => {
  const [assets] = useState<AssetCondition[]>([
    {
      id: '1',
      assetTag: 'HVAC-001',
      assetName: 'Central Air Conditioning Unit A',
      category: 'HVAC',
      location: 'Building A - Mechanical Room',
      overallScore: 82,
      mechanicalScore: 85,
      electricalScore: 80,
      structuralScore: 85,
      aestheticScore: 75,
      lastAssessment: '2024-10-15',
      nextAssessment: '2025-04-15',
      assessedBy: 'Mike Johnson',
      condition: 'Good',
      riskLevel: 'Low',
      urgentIssues: [],
      recommendations: ['Filter replacement', 'Coil cleaning'],
      estimatedRepairCost: 450
    },
    {
      id: '2',
      assetTag: 'ELEC-002',
      assetName: 'Main Electrical Panel B',
      category: 'Electrical',
      location: 'Building B - Electrical Room',
      overallScore: 65,
      mechanicalScore: 70,
      electricalScore: 60,
      structuralScore: 75,
      aestheticScore: 55,
      lastAssessment: '2024-09-20',
      nextAssessment: '2025-03-20',
      assessedBy: 'Sarah Davis',
      condition: 'Fair',
      riskLevel: 'Medium',
      urgentIssues: ['Outdated breakers', 'Poor labeling'],
      recommendations: ['Panel upgrade', 'Improved labeling', 'Safety inspection'],
      estimatedRepairCost: 2800
    }
  ]);

  const [selectedAsset, setSelectedAsset] = useState<AssetCondition | null>(null);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);

  const getConditionColor = (condition: string) => {
    const colors: Record<string, string> = {
      'Excellent': 'bg-green-500',
      'Good': 'bg-blue-500',
      'Fair': 'bg-yellow-500',
      'Poor': 'bg-orange-500',
      'Critical': 'bg-red-500'
    };
    return colors[condition] || 'bg-gray-500';
  };

  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      'Low': 'text-green-600 bg-green-100',
      'Medium': 'text-yellow-600 bg-yellow-100',
      'High': 'text-orange-600 bg-orange-100',
      'Critical': 'text-red-600 bg-red-100'
    };
    return colors[risk] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Asset Condition Assessment</h1>
          <p className="text-gray-600 mt-2">Monitor and assess the condition of your assets</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Asset Conditions</h3>
              </div>
              <div className="p-6 space-y-6">
                {assets.map((asset) => (
                  <div key={asset.id} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-lg font-medium text-gray-900">{asset.assetName}</h4>
                        <p className="text-sm text-gray-500">{asset.assetTag} • {asset.location}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(asset.riskLevel)}`}>
                        {asset.riskLevel} Risk
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">Overall Score</span>
                          <span className="text-lg font-bold text-gray-900">{asset.overallScore}/100</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-3">
                          <div 
                            className={`h-3 rounded-full ${getConditionColor(asset.condition)}`}
                            style={{ width: `${asset.overallScore}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-1">Condition: {asset.condition}</p>
                      </div>

                      <div className="space-y-2">
                        {asset.mechanicalScore && (
                          <div className="flex justify-between text-sm">
                            <span>Mechanical:</span>
                            <span className="font-medium">{asset.mechanicalScore}/100</span>
                          </div>
                        )}
                        {asset.electricalScore && (
                          <div className="flex justify-between text-sm">
                            <span>Electrical:</span>
                            <span className="font-medium">{asset.electricalScore}/100</span>
                          </div>
                        )}
                        {asset.structuralScore && (
                          <div className="flex justify-between text-sm">
                            <span>Structural:</span>
                            <span className="font-medium">{asset.structuralScore}/100</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {asset.urgentIssues.length > 0 && (
                      <div className="mt-4 p-3 bg-red-50 rounded-lg">
                        <h5 className="text-sm font-medium text-red-900 mb-2">Urgent Issues</h5>
                        <ul className="text-sm text-red-800 space-y-1">
                          {asset.urgentIssues.map((issue, index) => (
                            <li key={index}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4 flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Last assessed: {new Date(asset.lastAssessment).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => setSelectedAsset(asset)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Assets:</span>
                  <span className="font-medium">{assets.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Score:</span>
                  <span className="font-medium">{Math.round(assets.reduce((sum, a) => sum + a.overallScore, 0) / assets.length)}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">High Risk:</span>
                  <span className="text-red-600 font-medium">{assets.filter(a => a.riskLevel === 'High' || a.riskLevel === 'Critical').length}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => setShowAssessmentForm(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  New Assessment
                </button>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
                  Generate Report
                </button>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
                  Schedule Inspections
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetConditionAssessmentPage;