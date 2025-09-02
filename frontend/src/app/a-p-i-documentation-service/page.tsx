import React, { useState } from 'react';

interface APIEndpoint {
  id: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters: string[];
  response: string;
}

const APIDocumentationServicePage = () => {
  const [endpoints, setEndpoints] = useState<APIEndpoint[]>([
    {
      id: 1,
      method: 'GET',
      path: '/api/users',
      description: 'Retrieve a list of users',
      parameters: ['limit', 'offset'],
      response: 'User[]'
    },
    {
      id: 2,
      method: 'POST',
      path: '/api/users',
      description: 'Create a new user',
      parameters: ['name', 'email'],
      response: 'User'
    },
    {
      id: 3,
      method: 'GET',
      path: '/api/users/{id}',
      description: 'Get user by ID',
      parameters: ['id'],
      response: 'User'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<APIEndpoint | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState({
    method: 'GET' as APIEndpoint['method'],
    path: '',
    description: '',
    parameters: '',
    response: ''
  });

  const filteredEndpoints = endpoints.filter(endpoint =>
    endpoint.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
    endpoint.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewEndpoint(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEndpoint.path && newEndpoint.description) {
      const endpoint: APIEndpoint = {
        id: Date.now(),
        ...newEndpoint,
        parameters: newEndpoint.parameters.split(',').map(p => p.trim()).filter(p => p)
      };
      setEndpoints(prev => [...prev, endpoint]);
      setNewEndpoint({ method: 'GET', path: '', description: '', parameters: '', response: '' });
      setShowAddForm(false);
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">API Documentation Service</h1>

      <div className="mb-6 flex justify-between items-center">
        <div className="flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search endpoints..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ml-4"
        >
          {showAddForm ? 'Cancel' : 'Add Endpoint'}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Add New API Endpoint</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Method</label>
                <select
                  name="method"
                  value={newEndpoint.method}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Path</label>
                <input
                  type="text"
                  name="path"
                  value={newEndpoint.path}
                  onChange={handleInputChange}
                  placeholder="/api/resource"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                name="description"
                value={newEndpoint.description}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Parameters (comma-separated)</label>
              <input
                type="text"
                name="parameters"
                value={newEndpoint.parameters}
                onChange={handleInputChange}
                placeholder="param1, param2"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Response Type</label>
              <input
                type="text"
                name="response"
                value={newEndpoint.response}
                onChange={handleInputChange}
                placeholder="ResponseType"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Endpoint
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {filteredEndpoints.map((endpoint) => (
          <div key={endpoint.id} className="bg-white shadow rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${getMethodColor(endpoint.method)}`}>
                  {endpoint.method}
                </span>
                <code className="text-lg font-mono">{endpoint.path}</code>
              </div>
              <button
                onClick={() => setSelectedEndpoint(selectedEndpoint?.id === endpoint.id ? null : endpoint)}
                className="text-blue-500 hover:text-blue-700"
              >
                {selectedEndpoint?.id === endpoint.id ? 'Hide' : 'Show'} Details
              </button>
            </div>
            <p className="mt-2 text-gray-600">{endpoint.description}</p>

            {selectedEndpoint?.id === endpoint.id && (
              <div className="mt-4 border-t pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Parameters:</h4>
                    <ul className="mt-1 text-sm text-gray-600">
                      {endpoint.parameters.length > 0 ? (
                        endpoint.parameters.map((param, index) => (
                          <li key={index} className="flex items-center">
                            <code className="bg-gray-100 px-1 rounded">{param}</code>
                          </li>
                        ))
                      ) : (
                        <li>No parameters</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700">Response:</h4>
                    <code className="mt-1 block text-sm bg-gray-100 p-2 rounded">
                      {endpoint.response || 'Not specified'}
                    </code>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredEndpoints.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No endpoints found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default APIDocumentationServicePage;
