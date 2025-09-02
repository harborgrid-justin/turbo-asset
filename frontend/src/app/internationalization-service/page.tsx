import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

interface Translation {
  id: string;
  key: string;
  language: string;
  value: string;
  context?: string;
  namespace: string;
  status: 'Active' | 'Draft' | 'Deprecated' | 'Review';
  tags: string[];
  lastModified: string;
  modifiedBy: string;
  createdAt: string;
  updatedAt: string;
}

interface Language {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
  direction: 'ltr' | 'rtl';
  locale: string;
  fallbackLanguage?: string;
  pluralRules: {
    zero?: string;
    one: string;
    two?: string;
    few?: string;
    many?: string;
    other: string;
  };
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimalSeparator: string;
    thousandSeparator: string;
    currencySymbol: string;
    currencyPosition: 'before' | 'after';
  };
  createdAt: string;
  updatedAt: string;
}

interface TranslationProject {
  id: string;
  name: string;
  description: string;
  sourceLanguage: string;
  targetLanguages: string[];
  status: 'Planning' | 'InProgress' | 'Review' | 'Completed' | 'Cancelled';
  progress: {
    totalKeys: number;
    translatedKeys: number;
    reviewedKeys: number;
    completionPercentage: number;
  };
  deadline?: string;
  assignedTranslators: {
    language: string;
    translatorId: string;
    translatorName: string;
  }[];
  qualityScore?: number;
  createdAt: string;
  updatedAt: string;
}

interface TranslationMemory {
  id: string;
  sourceText: string;
  sourceLanguage: string;
  targetText: string;
  targetLanguage: string;
  context?: string;
  quality: number;
  usageCount: number;
  lastUsed: string;
  createdAt: string;
  updatedAt: string;
}

const InternationalizationServicePage = () => {
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [projects, setProjects] = useState<TranslationProject[]>([]);
  const [memory, setMemory] = useState<TranslationMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'translations' | 'languages' | 'projects' | 'memory'>('translations');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTranslation, setSelectedTranslation] = useState<Translation | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [selectedProject, setSelectedProject] = useState<TranslationProject | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<TranslationMemory | null>(null);
  const [filterLanguage, setFilterLanguage] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterNamespace, setFilterNamespace] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Form state for translations
  const [newTranslation, setNewTranslation] = useState({
    key: '',
    language: '',
    value: '',
    context: '',
    namespace: 'common',
    tags: '',
    status: 'Draft' as Translation['status']
  });

  // Form state for languages
  const [newLanguage, setNewLanguage] = useState({
    code: '',
    name: '',
    nativeName: '',
    direction: 'ltr' as Language['direction'],
    locale: '',
    fallbackLanguage: '',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'HH:mm:ss',
    decimalSeparator: '.',
    thousandSeparator: ',',
    currencySymbol: '$',
    currencyPosition: 'before' as Language['numberFormat']['currencyPosition']
  });

  // Form state for projects
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    sourceLanguage: '',
    targetLanguages: '',
    deadline: ''
  });

  // Form state for memory
  const [newMemory, setNewMemory] = useState({
    sourceText: '',
    sourceLanguage: '',
    targetText: '',
    targetLanguage: '',
    context: '',
    quality: 100
  });

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [translationsData, languagesData, projectsData, memoryData] = await Promise.all([
        apiService.generic.getAll<Translation>('translations'),
        apiService.generic.getAll<Language>('languages'),
        apiService.generic.getAll<TranslationProject>('translation-projects'),
        apiService.generic.getAll<TranslationMemory>('translation-memory')
      ]);
      setTranslations(translationsData);
      setLanguages(languagesData);
      setProjects(projectsData);
      setMemory(memoryData);
    } catch (err) {
      setError('Failed to load internationalization data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTranslation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTranslation.key || !newTranslation.language || !newTranslation.value) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const translationData = {
        ...newTranslation,
        tags: newTranslation.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        lastModified: new Date().toISOString(),
        modifiedBy: 'current-user' // This would come from auth context
      };

      const createdTranslation = await apiService.generic.create<Translation>('translations', translationData);

      setTranslations(prev => [createdTranslation, ...prev]);
      setNewTranslation({
        key: '',
        language: '',
        value: '',
        context: '',
        namespace: 'common',
        tags: '',
        status: 'Draft'
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create translation. Please try again.');
      console.error('Error creating translation:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateLanguage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLanguage.code || !newLanguage.name || !newLanguage.locale) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const languageData = {
        ...newLanguage,
        isDefault: false,
        isActive: true,
        pluralRules: {
          one: 'i = 1 and v = 0',
          other: ' '
        },
        numberFormat: {
          decimalSeparator: newLanguage.decimalSeparator,
          thousandSeparator: newLanguage.thousandSeparator,
          currencySymbol: newLanguage.currencySymbol,
          currencyPosition: newLanguage.currencyPosition
        }
      };

      const createdLanguage = await apiService.generic.create<Language>('languages', languageData);

      setLanguages(prev => [createdLanguage, ...prev]);
      setNewLanguage({
        code: '',
        name: '',
        nativeName: '',
        direction: 'ltr',
        locale: '',
        fallbackLanguage: '',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: 'HH:mm:ss',
        decimalSeparator: '.',
        thousandSeparator: ',',
        currencySymbol: '$',
        currencyPosition: 'before'
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create language. Please try again.');
      console.error('Error creating language:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.sourceLanguage || !newProject.targetLanguages) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const projectData = {
        ...newProject,
        targetLanguages: newProject.targetLanguages.split(',').map(lang => lang.trim()),
        status: 'Planning' as TranslationProject['status'],
        progress: {
          totalKeys: 0,
          translatedKeys: 0,
          reviewedKeys: 0,
          completionPercentage: 0
        },
        assignedTranslators: []
      };

      const createdProject = await apiService.generic.create<TranslationProject>('translation-projects', projectData);

      setProjects(prev => [createdProject, ...prev]);
      setNewProject({
        name: '',
        description: '',
        sourceLanguage: '',
        targetLanguages: '',
        deadline: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create translation project. Please try again.');
      console.error('Error creating project:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.sourceText || !newMemory.targetText || !newMemory.sourceLanguage || !newMemory.targetLanguage) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const memoryData = {
        ...newMemory,
        usageCount: 0,
        lastUsed: new Date().toISOString()
      };

      const createdMemory = await apiService.generic.create<TranslationMemory>('translation-memory', memoryData);

      setMemory(prev => [createdMemory, ...prev]);
      setNewMemory({
        sourceText: '',
        sourceLanguage: '',
        targetText: '',
        targetLanguage: '',
        context: '',
        quality: 100
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create translation memory entry. Please try again.');
      console.error('Error creating memory:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateTranslationStatus = async (translationId: string, status: Translation['status']) => {
    try {
      setError(null);
      await apiService.generic.update<Translation>('translations', parseInt(translationId), {
        status,
        lastModified: new Date().toISOString(),
        modifiedBy: 'current-user'
      });
      setTranslations(prev => prev.map(translation =>
        translation.id === translationId ? {
          ...translation,
          status,
          lastModified: new Date().toISOString(),
          modifiedBy: 'current-user'
        } : translation
      ));
    } catch (err) {
      setError('Failed to update translation status. Please try again.');
      console.error('Error updating translation:', err);
    }
  };

  const updateLanguageStatus = async (languageId: string, isActive: boolean) => {
    try {
      setError(null);
      await apiService.generic.update<Language>('languages', parseInt(languageId), { isActive });
      setLanguages(prev => prev.map(language =>
        language.id === languageId ? { ...language, isActive } : language
      ));
    } catch (err) {
      setError('Failed to update language status. Please try again.');
      console.error('Error updating language:', err);
    }
  };

  const updateProjectStatus = async (projectId: string, status: TranslationProject['status']) => {
    try {
      setError(null);
      await apiService.generic.update<TranslationProject>('translation-projects', parseInt(projectId), { status });
      setProjects(prev => prev.map(project =>
        project.id === projectId ? { ...project, status } : project
      ));
    } catch (err) {
      setError('Failed to update project status. Please try again.');
      console.error('Error updating project:', err);
    }
  };

  const deleteTranslation = async (translationId: string) => {
    if (!confirm('Are you sure you want to delete this translation? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('translations', parseInt(translationId));
      setTranslations(prev => prev.filter(translation => translation.id !== translationId));
    } catch (err) {
      setError('Failed to delete translation. Please try again.');
      console.error('Error deleting translation:', err);
    }
  };

  const deleteLanguage = async (languageId: string) => {
    if (!confirm('Are you sure you want to delete this language? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('languages', parseInt(languageId));
      setLanguages(prev => prev.filter(language => language.id !== languageId));
    } catch (err) {
      setError('Failed to delete language. Please try again.');
      console.error('Error deleting language:', err);
    }
  };

  const deleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this translation project? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('translation-projects', parseInt(projectId));
      setProjects(prev => prev.filter(project => project.id !== projectId));
    } catch (err) {
      setError('Failed to delete translation project. Please try again.');
      console.error('Error deleting project:', err);
    }
  };

  const deleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this translation memory entry? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('translation-memory', parseInt(memoryId));
      setMemory(prev => prev.filter(memory => memory.id !== memoryId));
    } catch (err) {
      setError('Failed to delete translation memory entry. Please try again.');
      console.error('Error deleting memory:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-yellow-100 text-yellow-800';
      case 'Deprecated': return 'bg-gray-100 text-gray-800';
      case 'Review': return 'bg-blue-100 text-blue-800';
      case 'Planning': return 'bg-purple-100 text-purple-800';
      case 'InProgress': return 'bg-orange-100 text-orange-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'ltr': return 'bg-blue-100 text-blue-800';
      case 'rtl': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualityColor = (quality: number) => {
    if (quality >= 90) return 'bg-green-100 text-green-800';
    if (quality >= 70) return 'bg-yellow-100 text-yellow-800';
    if (quality >= 50) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  const filteredTranslations = translations.filter(translation => {
    const languageMatch = filterLanguage === 'All' || translation.language === filterLanguage;
    const statusMatch = filterStatus === 'All' || translation.status === filterStatus;
    const namespaceMatch = filterNamespace === 'All' || translation.namespace === filterNamespace;
    const searchMatch = !searchQuery ||
      translation.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      translation.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (translation.context && translation.context.toLowerCase().includes(searchQuery.toLowerCase()));
    return languageMatch && statusMatch && namespaceMatch && searchMatch;
  });

  const filteredLanguages = languages.filter(language => {
    const searchMatch = !searchQuery ||
      language.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      language.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      language.code.toLowerCase().includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  const filteredProjects = projects.filter(project => {
    const statusMatch = filterStatus === 'All' || project.status === filterStatus;
    const searchMatch = !searchQuery ||
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  const filteredMemory = memory.filter(memory => {
    const searchMatch = !searchQuery ||
      memory.sourceText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.targetText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (memory.context && memory.context.toLowerCase().includes(searchQuery.toLowerCase()));
    return searchMatch;
  });

  const getStats = () => {
    const totalTranslations = translations.length;
    const activeTranslations = translations.filter(t => t.status === 'Active').length;
    const totalLanguages = languages.length;
    const activeLanguages = languages.filter(l => l.isActive).length;
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 'Completed').length;
    const totalMemory = memory.length;
    const avgQuality = memory.length > 0 ? memory.reduce((sum, m) => sum + m.quality, 0) / memory.length : 0;
    const completionRate = projects.length > 0 ? (completedProjects / projects.length * 100).toFixed(1) : '0';

    return {
      totalTranslations,
      activeTranslations,
      totalLanguages,
      activeLanguages,
      totalProjects,
      completedProjects,
      totalMemory,
      avgQuality,
      completionRate
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Internationalization Service</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Internationalization Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Translations</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalTranslations}</p>
          <p className="text-sm text-gray-600">{stats.activeTranslations} active</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Active Languages</h3>
          <p className="text-2xl font-bold text-green-600">{stats.activeLanguages}</p>
          <p className="text-sm text-gray-600">of {stats.totalLanguages} total</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Project Completion</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.completionRate}%</p>
          <p className="text-sm text-gray-600">{stats.completedProjects} of {stats.totalProjects} completed</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Memory Quality</h3>
          <p className="text-2xl font-bold text-orange-600">{stats.avgQuality.toFixed(1)}%</p>
          <p className="text-sm text-gray-600">{stats.totalMemory} entries</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('translations')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'translations'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Translations ({translations.length})
        </button>
        <button
          onClick={() => setActiveTab('languages')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'languages'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Languages ({languages.length})
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'projects'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Projects ({projects.length})
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'memory'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Memory ({memory.length})
        </button>
      </div>

      {/* Translations Tab */}
      {activeTab === 'translations' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Translations</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search translations..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Languages</option>
                  {languages.map(language => (
                    <option key={language.id} value={language.code}>{language.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Review">Review</option>
                  <option value="Deprecated">Deprecated</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Namespace</label>
                <select
                  value={filterNamespace}
                  onChange={(e) => setFilterNamespace(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Namespaces</option>
                  {Array.from(new Set(translations.map(t => t.namespace))).map(namespace => (
                    <option key={namespace} value={namespace}>{namespace}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Translation'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Translation</h3>
              <form onSubmit={handleCreateTranslation} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Translation Key *</label>
                    <input
                      type="text"
                      value={newTranslation.key}
                      onChange={(e) => setNewTranslation(prev => ({ ...prev, key: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Language *</label>
                    <select
                      value={newTranslation.language}
                      onChange={(e) => setNewTranslation(prev => ({ ...prev, language: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select language...</option>
                      {languages.map(language => (
                        <option key={language.id} value={language.code}>{language.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Namespace</label>
                    <select
                      value={newTranslation.namespace}
                      onChange={(e) => setNewTranslation(prev => ({ ...prev, namespace: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="common">Common</option>
                      <option value="admin">Admin</option>
                      <option value="user">User</option>
                      <option value="system">System</option>
                      <option value="validation">Validation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={newTranslation.status}
                      onChange={(e) => setNewTranslation(prev => ({ ...prev, status: e.target.value as Translation['status'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Draft">Draft</option>
                      <option value="Review">Review</option>
                      <option value="Active">Active</option>
                      <option value="Deprecated">Deprecated</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Translation Value *</label>
                  <textarea
                    value={newTranslation.value}
                    onChange={(e) => setNewTranslation(prev => ({ ...prev, value: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Context</label>
                  <textarea
                    value={newTranslation.context}
                    onChange={(e) => setNewTranslation(prev => ({ ...prev, context: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Additional context for translators..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newTranslation.tags}
                    onChange={(e) => setNewTranslation(prev => ({ ...prev, tags: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="ui, button, navigation"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add Translation'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredTranslations.map((translation) => (
              <div key={translation.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{translation.key}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(translation.status)}`}>
                        {translation.status}
                      </span>
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                        {translation.namespace}
                      </span>
                    </div>
                    <p className="text-gray-700 mb-2">{translation.value}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Language: {languages.find(l => l.code === translation.language)?.name || translation.language}</span>
                      {translation.context && <span>Context: {translation.context}</span>}
                      <span>Modified: {new Date(translation.lastModified).toLocaleDateString()}</span>
                    </div>
                    {translation.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {translation.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        By: {translation.modifiedBy}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {translation.status === 'Draft' && (
                        <button
                          onClick={() => updateTranslationStatus(translation.id, 'Review')}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Review
                        </button>
                      )}
                      {translation.status === 'Review' && (
                        <button
                          onClick={() => updateTranslationStatus(translation.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Approve
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedTranslation(selectedTranslation?.id === translation.id ? null : translation)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedTranslation?.id === translation.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteTranslation(translation.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedTranslation?.id === translation.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Translation Key</p>
                        <p className="font-semibold">{translation.key}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Language</p>
                        <p className="font-semibold">{languages.find(l => l.code === translation.language)?.name || translation.language}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Namespace</p>
                        <p className="font-semibold">{translation.namespace}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold">{translation.status}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-md font-medium mb-2">Translation Value</h4>
                      <div className="bg-white p-4 rounded border">
                        <p className="text-gray-700">{translation.value}</p>
                      </div>
                    </div>

                    {translation.context && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-2">Context</h4>
                        <div className="bg-white p-4 rounded border">
                          <p className="text-gray-700">{translation.context}</p>
                        </div>
                      </div>
                    )}

                    {translation.tags.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Tags ({translation.tags.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {translation.tags.map((tag, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(translation.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(translation.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredTranslations.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterLanguage === 'All' && filterStatus === 'All' && filterNamespace === 'All' && !searchQuery
                  ? 'No translations found. Add your first translation to get started.'
                  : 'No translations match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Languages Tab */}
      {activeTab === 'languages' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Languages</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search languages..."
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Language'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Language</h3>
              <form onSubmit={handleCreateLanguage} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Language Code *</label>
                    <input
                      type="text"
                      value={newLanguage.code}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, code: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="en, es, fr, de"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Language Name *</label>
                    <input
                      type="text"
                      value={newLanguage.name}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="English, Spanish, French"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Native Name</label>
                    <input
                      type="text"
                      value={newLanguage.nativeName}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, nativeName: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="English, Español, Français"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Locale *</label>
                    <input
                      type="text"
                      value={newLanguage.locale}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, locale: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="en-US, es-ES, fr-FR"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Text Direction</label>
                    <select
                      value={newLanguage.direction}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, direction: e.target.value as Language['direction'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="ltr">Left to Right</option>
                      <option value="rtl">Right to Left</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Fallback Language</label>
                    <select
                      value={newLanguage.fallbackLanguage}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, fallbackLanguage: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">No fallback</option>
                      {languages.map(language => (
                        <option key={language.id} value={language.code}>{language.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Format</label>
                    <input
                      type="text"
                      value={newLanguage.dateFormat}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, dateFormat: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="MM/DD/YYYY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Time Format</label>
                    <input
                      type="text"
                      value={newLanguage.timeFormat}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, timeFormat: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="HH:mm:ss"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency Symbol</label>
                    <input
                      type="text"
                      value={newLanguage.currencySymbol}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, currencySymbol: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="$"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Decimal Separator</label>
                    <input
                      type="text"
                      value={newLanguage.decimalSeparator}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, decimalSeparator: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Thousand Separator</label>
                    <input
                      type="text"
                      value={newLanguage.thousandSeparator}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, thousandSeparator: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder=","
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Currency Position</label>
                    <select
                      value={newLanguage.currencyPosition}
                      onChange={(e) => setNewLanguage(prev => ({ ...prev, currencyPosition: e.target.value as Language['numberFormat']['currencyPosition'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="before">Before ($100)</option>
                      <option value="after">After (100$)</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add Language'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredLanguages.map((language) => (
              <div key={language.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{language.name}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                        {language.code}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getDirectionColor(language.direction)}`}>
                        {language.direction.toUpperCase()}
                      </span>
                      {language.isDefault && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
                          Default
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${language.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {language.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-gray-600">{language.nativeName}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Locale: {language.locale}</span>
                      <span>Format: {language.dateFormat} {language.timeFormat}</span>
                      <span>Currency: {language.currencySymbol} ({language.currencyPosition})</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Translations: {translations.filter(t => t.language === language.code).length}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {!language.isActive && (
                        <button
                          onClick={() => updateLanguageStatus(language.id, true)}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      {language.isActive && (
                        <button
                          onClick={() => updateLanguageStatus(language.id, false)}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedLanguage(selectedLanguage?.id === language.id ? null : language)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedLanguage?.id === language.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteLanguage(language.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedLanguage?.id === language.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Language Code</p>
                        <p className="font-semibold">{language.code}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Locale</p>
                        <p className="font-semibold">{language.locale}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Text Direction</p>
                        <p className="font-semibold">{language.direction}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Fallback Language</p>
                        <p className="font-semibold">{language.fallbackLanguage || 'None'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Date Format</p>
                        <p className="font-semibold">{language.dateFormat}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Time Format</p>
                        <p className="font-semibold">{language.timeFormat}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Decimal Separator</p>
                        <p className="font-semibold">{language.numberFormat.decimalSeparator}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Thousand Separator</p>
                        <p className="font-semibold">{language.numberFormat.thousandSeparator}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Currency Symbol</p>
                        <p className="font-semibold">{language.numberFormat.currencySymbol}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Currency Position</p>
                        <p className="font-semibold">{language.numberFormat.currencyPosition}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Plural Rules</p>
                        <p className="font-semibold">Configured</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold">{language.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(language.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(language.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredLanguages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {!searchQuery
                  ? 'No languages found. Add your first language to get started.'
                  : 'No languages match the search query.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Translation Projects</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search projects..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Status</option>
                  <option value="Planning">Planning</option>
                  <option value="InProgress">In Progress</option>
                  <option value="Review">Review</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Create New Translation Project</h3>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Project Name *</label>
                    <input
                      type="text"
                      value={newProject.name}
                      onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source Language *</label>
                    <select
                      value={newProject.sourceLanguage}
                      onChange={(e) => setNewProject(prev => ({ ...prev, sourceLanguage: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select source language...</option>
                      {languages.map(language => (
                        <option key={language.id} value={language.code}>{language.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newProject.description}
                    onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Languages * (comma-separated)</label>
                  <input
                    type="text"
                    value={newProject.targetLanguages}
                    onChange={(e) => setNewProject(prev => ({ ...prev, targetLanguages: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="es, fr, de, it"
                    required
                  />
                  <p className="text-sm text-gray-600 mt-1">
                    Available languages: {languages.map(l => l.code).join(', ')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Deadline</label>
                  <input
                    type="date"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject(prev => ({ ...prev, deadline: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Translation Project'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredProjects.map((project) => (
              <div key={project.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{project.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </div>
                    <p className="text-gray-600">{project.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Source: {languages.find(l => l.code === project.sourceLanguage)?.name || project.sourceLanguage}</span>
                      <span>Targets: {project.targetLanguages.join(', ')}</span>
                      <span>Progress: {project.progress.completionPercentage}%</span>
                      {project.deadline && <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Keys: {project.progress.translatedKeys}/{project.progress.totalKeys}
                      </p>
                      <p className="text-sm text-gray-600">
                        Reviewed: {project.progress.reviewedKeys}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {project.status === 'Planning' && (
                        <button
                          onClick={() => updateProjectStatus(project.id, 'InProgress')}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Start
                        </button>
                      )}
                      {project.status === 'InProgress' && (
                        <button
                          onClick={() => updateProjectStatus(project.id, 'Review')}
                          className="bg-purple-500 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Review
                        </button>
                      )}
                      {project.status === 'Review' && (
                        <button
                          onClick={() => updateProjectStatus(project.id, 'Completed')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedProject(selectedProject?.id === project.id ? null : project)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedProject?.id === project.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteProject(project.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedProject?.id === project.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Source Language</p>
                        <p className="font-semibold">{languages.find(l => l.code === project.sourceLanguage)?.name || project.sourceLanguage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Target Languages</p>
                        <p className="font-semibold">{project.targetLanguages.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Keys</p>
                        <p className="font-semibold">{project.progress.totalKeys}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Completion</p>
                        <p className="font-semibold">{project.progress.completionPercentage}%</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Translated Keys</p>
                        <p className="font-semibold">{project.progress.translatedKeys}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Reviewed Keys</p>
                        <p className="font-semibold">{project.progress.reviewedKeys}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Assigned Translators</p>
                        <p className="font-semibold">{project.assignedTranslators.length}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Quality Score</p>
                        <p className="font-semibold">{project.qualityScore || 'N/A'}</p>
                      </div>
                    </div>

                    {project.targetLanguages.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Target Languages ({project.targetLanguages.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {project.targetLanguages.map((langCode, index) => {
                            const language = languages.find(l => l.code === langCode);
                            return (
                              <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {language?.name || langCode}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {project.assignedTranslators.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Assigned Translators ({project.assignedTranslators.length})</h4>
                        <div className="space-y-2">
                          {project.assignedTranslators.map((translator, index) => (
                            <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                              <div className="flex-1">
                                <p className="font-medium">{translator.translatorName}</p>
                                <p className="text-sm text-gray-600">{languages.find(l => l.code === translator.language)?.name || translator.language}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(project.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(project.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredProjects.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterStatus === 'All' && !searchQuery
                  ? 'No translation projects found. Create your first project to get started.'
                  : 'No projects match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Memory Tab */}
      {activeTab === 'memory' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Translation Memory</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search memory..."
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Memory'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add Translation Memory Entry</h3>
              <form onSubmit={handleCreateMemory} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Source Language *</label>
                    <select
                      value={newMemory.sourceLanguage}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, sourceLanguage: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select source language...</option>
                      {languages.map(language => (
                        <option key={language.id} value={language.code}>{language.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Language *</label>
                    <select
                      value={newMemory.targetLanguage}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, targetLanguage: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select target language...</option>
                      {languages.map(language => (
                        <option key={language.id} value={language.code}>{language.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source Text *</label>
                  <textarea
                    value={newMemory.sourceText}
                    onChange={(e) => setNewMemory(prev => ({ ...prev, sourceText: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Target Text *</label>
                  <textarea
                    value={newMemory.targetText}
                    onChange={(e) => setNewMemory(prev => ({ ...prev, targetText: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Context</label>
                    <input
                      type="text"
                      value={newMemory.context}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, context: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="UI context, button text, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Quality Score</label>
                    <input
                      type="number"
                      value={newMemory.quality}
                      onChange={(e) => setNewMemory(prev => ({ ...prev, quality: parseInt(e.target.value) || 100 }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add Translation Memory'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredMemory.map((memory) => (
              <div key={memory.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getQualityColor(memory.quality)}`}>
                        {memory.quality}%
                      </span>
                      <span className="text-sm text-gray-600">
                        {languages.find(l => l.code === memory.sourceLanguage)?.name || memory.sourceLanguage} → {languages.find(l => l.code === memory.targetLanguage)?.name || memory.targetLanguage}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Source Text</p>
                        <p className="text-gray-700 bg-white p-2 rounded border text-sm">{memory.sourceText}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Target Text</p>
                        <p className="text-gray-700 bg-white p-2 rounded border text-sm">{memory.targetText}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      {memory.context && <span>Context: {memory.context}</span>}
                      <span>Usage: {memory.usageCount}</span>
                      <span>Last Used: {new Date(memory.lastUsed).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setSelectedMemory(selectedMemory?.id === memory.id ? null : memory)}
                      className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedMemory?.id === memory.id ? 'Hide' : 'Details'}
                    </button>
                    <button
                      onClick={() => deleteMemory(memory.id)}
                      className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {selectedMemory?.id === memory.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Source Language</p>
                        <p className="font-semibold">{languages.find(l => l.code === memory.sourceLanguage)?.name || memory.sourceLanguage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Target Language</p>
                        <p className="font-semibold">{languages.find(l => l.code === memory.targetLanguage)?.name || memory.targetLanguage}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Quality Score</p>
                        <p className="font-semibold">{memory.quality}%</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Usage Count</p>
                        <p className="font-semibold">{memory.usageCount}</p>
                      </div>
                    </div>

                    {memory.context && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-2">Context</h4>
                        <div className="bg-white p-4 rounded border">
                          <p className="text-gray-700">{memory.context}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(memory.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(memory.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredMemory.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {!searchQuery
                  ? 'No translation memory entries found. Add your first memory entry to get started.'
                  : 'No memory entries match the search query.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InternationalizationServicePage;
