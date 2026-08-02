/**
 * Smart Resource Finder
 * Search, filter, and AI-powered resource recommendations
 */

import React, { useState, useEffect } from 'react';
import Security from '@lib/security';

interface Resource {
  id?: string;
  category: string;
  name: string;
  description: string;
  url: string;
  tags: string[];
}

interface SearchFilters {
  query: string;
  category: string;
  tags: string[];
}

export const ResourceFinder: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    tags: [],
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResources();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, resources]);

  const fetchResources = async () => {
    try {
      const res = await fetch('/api/resources');
      const data: Resource[] = await res.json();
      setResources(data);

      // Extract unique categories and tags
      const cats = [...new Set(data.map((r) => r.category))];
      const tags = [...new Set(data.flatMap((r) => r.tags))];

      setCategories(cats);
      setAllTags(tags);
    } catch (error) {
      console.error('Error fetching resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = resources;

    // Filter by query
    if (filters.query) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (filters.category) {
      filtered = filtered.filter((r) => r.category === filters.category);
    }

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter((r) =>
        filters.tags.some((tag) => r.tags.includes(tag))
      );
    }

    setFilteredResources(filtered);

    // Generate AI recommendations if query exists
    if (filters.query) {
      generateAIRecommendations(filters.query);
    }
  };

  const generateAIRecommendations = async (query: string) => {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `I'm looking for help with: ${query}. What resources would you recommend?`,
          context: 'resources',
        }),
      });

      const data = await res.json();
      setAiRecommendations(data.reply);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  };

  const toggleTag = (tag: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🔍</div>
          <p className="text-gray-600">Loading resources...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Resource Finder</h1>

      {/* Search Bar */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="Search for housing, jobs, legal aid, education, health..."
          value={filters.query}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, query: e.target.value }))
          }
          className="w-full px-6 py-3 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-600 text-lg"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1">
          {/* Category Filter */}
          <div className="mb-8">
            <h3 className="font-bold text-lg mb-4">Categories</h3>
            <div className="space-y-2">
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, category: '' }))
                }
                className={`w-full text-left px-4 py-2 rounded ${
                  filters.category === ''
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, category: cat }))
                  }
                  className={`w-full text-left px-4 py-2 rounded ${
                    filters.category === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Filter */}
          <div>
            <h3 className="font-bold text-lg mb-4">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    filters.tags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-3">
          {/* AI Recommendations */}
          {aiRecommendations && (
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded">
              <h3 className="font-bold text-blue-900 mb-2">🤖 AI Recommendation</h3>
              <p className="text-blue-800 text-sm">{aiRecommendations}</p>
            </div>
          )}

          {/* Results Count */}
          <p className="text-gray-600 mb-4">
            Found {filteredResources.length} resource
            {filteredResources.length !== 1 ? 's' : ''}
          </p>

          {/* Resource Cards */}
          <div className="space-y-4">
            {filteredResources.length > 0 ? (
              filteredResources.map((resource, idx) => (
                <ResourceCard key={idx} resource={resource} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600 text-lg mb-2">No resources found</p>
                <p className="text-gray-500">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ResourceCardProps {
  resource: Resource;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource }) => {
  const safeUrl = Security.isSafeUrl(resource.url) ? resource.url : '#';
  return (
  <a
    href={safeUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="block bg-white border rounded-lg p-6 hover:shadow-lg transition-shadow"
  >
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-lg font-bold text-blue-600 hover:text-blue-800">
        {resource.name}
      </h3>
      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
        {resource.category}
      </span>
    </div>

    <p className="text-gray-700 mb-4">{resource.description}</p>

    {/* Tags */}
    <div className="flex flex-wrap gap-2">
      {resource.tags.map((tag) => (
        <span
          key={tag}
          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
        >
          {tag}
        </span>
      ))}
    </div>
  </a>
  );
};

export default ResourceFinder;
