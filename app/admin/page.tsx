'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Save, Trash2, Database } from 'lucide-react';

const SUPABASE_URL = 'https://knsnjranmkgvxwoicssx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtuc25qcmFubWtndnh3b2ljc3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDQxNzYsImV4cCI6MjA4MjE4MDE3Nn0.4neEuF8ySDI7yJfMSfQUFyWwKb6oj_PkURMX9Lxts1Y';

interface Region {
  id: number;
  name: string;
  slug: string;
}

interface Entity {
  id: number;
  name: string;
  description: string;
  image_emoji: string;
  region_id: number;
  regions?: {
    name: string;
  };
}

async function supabaseFetch(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Supabase error: ${response.statusText} - ${error}`);
  }
  
  return response.json();
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<string>('entities');
  const [regions, setRegions] = useState<Region[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: string; text: string }>({ type: '', text: '' });

  const [entityForm, setEntityForm] = useState({
    name: '',
    description: '',
    image_emoji: '👻',
    region_id: ''
  });

  const [regionForm, setRegionForm] = useState({
    name: '',
    slug: ''
  });

  const [funFactForm, setFunFactForm] = useState({
    entity_id: '',
    fact: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [regionsData, entitiesData] = await Promise.all([
        supabaseFetch('regions?select=*&order=name'),
        supabaseFetch('entities?select=*,regions(name)&order=name')
      ]);
      setRegions(regionsData);
      setEntities(entitiesData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('error', 'Failed to load data');
      setLoading(false);
    }
  }

  function showMessage(type: string, text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async function submitEntity() {
    if (!entityForm.name || !entityForm.description || !entityForm.region_id) {
      showMessage('error', 'Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      const slug = generateSlug(entityForm.name);
      
      await supabaseFetch('entities', {
        method: 'POST',
        body: JSON.stringify({
          name: entityForm.name,
          slug: slug,
          description: entityForm.description,
          image_emoji: entityForm.image_emoji,
          region_id: parseInt(entityForm.region_id)
        })
      });
      
      showMessage('success', `Entity "${entityForm.name}" added successfully!`);
      setEntityForm({ name: '', description: '', image_emoji: '👻', region_id: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding entity:', error);
      showMessage('error', 'Failed to add entity');
    } finally {
      setLoading(false);
    }
  }

  async function deleteEntity(id: number, name: string) {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated fun facts and sightings.`)) {
      return;
    }
    
    try {
      setLoading(true);
      await supabaseFetch(`fun_facts?entity_id=eq.${id}`, { method: 'DELETE' });
      await supabaseFetch(`sightings?entity_id=eq.${id}`, { method: 'DELETE' });
      await supabaseFetch(`entities?id=eq.${id}`, { method: 'DELETE' });
      
      showMessage('success', `Entity "${name}" deleted`);
      await loadData();
    } catch (error) {
      console.error('Error deleting entity:', error);
      showMessage('error', 'Failed to delete entity');
    } finally {
      setLoading(false);
    }
  }

  async function submitRegion() {
    if (!regionForm.name) {
      showMessage('error', 'Please enter a region name');
      return;
    }

    try {
      setLoading(true);
      const slug = regionForm.slug || generateSlug(regionForm.name);
      
      await supabaseFetch('regions', {
        method: 'POST',
        body: JSON.stringify({
          name: regionForm.name,
          slug: slug
        })
      });
      
      showMessage('success', `Region "${regionForm.name}" added successfully!`);
      setRegionForm({ name: '', slug: '' });
      await loadData();
    } catch (error) {
      console.error('Error adding region:', error);
      showMessage('error', 'Failed to add region');
    } finally {
      setLoading(false);
    }
  }

  async function deleteRegion(id: number, name: string) {
    const entityCount = entities.filter(e => e.region_id === id).length;
    
    if (entityCount > 0) {
      alert(`Cannot delete "${name}" - it has ${entityCount} entities associated with it. Please reassign or delete those entities first.`);
      return;
    }
    
    if (!confirm(`Are you sure you want to delete the region "${name}"?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await supabaseFetch(`regions?id=eq.${id}`, { method: 'DELETE' });
      showMessage('success', `Region "${name}" deleted`);
      await loadData();
    } catch (error) {
      console.error('Error deleting region:', error);
      showMessage('error', 'Failed to delete region');
    } finally {
      setLoading(false);
    }
  }

  async function submitFunFact() {
    if (!funFactForm.entity_id || !funFactForm.fact) {
      showMessage('error', 'Please select an entity and enter a fact');
      return;
    }

    try {
      setLoading(true);
      await supabaseFetch('fun_facts', {
        method: 'POST',
        body: JSON.stringify({
          entity_id: parseInt(funFactForm.entity_id),
          fact: funFactForm.fact
        })
      });
      
      const entityName = entities.find(e => e.id === parseInt(funFactForm.entity_id))?.name;
      showMessage('success', `Fun fact added to ${entityName}!`);
      setFunFactForm({ entity_id: '', fact: '' });
    } catch (error) {
      console.error('Error adding fun fact:', error);
      showMessage('error', 'Failed to add fun fact');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="text-emerald-400" size={32} />
            <div>
              <h1 className="text-2xl font-bold text-emerald-400">Veil Atlas Admin</h1>
              <p className="text-sm text-slate-400">Data Entry & Management</p>
            </div>
          </div>
          <div className="text-slate-400 text-sm">
            {entities.length} entities • {regions.length} regions
          </div>
        </div>
      </header>

      {message.text && (
        <div className={`fixed top-20 right-6 px-6 py-3 rounded-lg shadow-lg z-50 ${
          message.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-slate-800 border-b border-slate-700">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex gap-4">
            {['entities', 'regions', 'funfacts', 'manage'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-semibold transition border-b-2 ${
                  activeTab === tab
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                {tab === 'entities' && 'Add Entity'}
                {tab === 'regions' && 'Add Region'}
                {tab === 'funfacts' && 'Add Fun Facts'}
                {tab === 'manage' && 'Manage Data'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'entities' && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Plus className="text-emerald-400" />
                Add New Entity
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Entity Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Bigfoot, Chupacabra"
                    value={entityForm.name}
                    onChange={(e) => setEntityForm({...entityForm, name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Emoji Icon *</label>
                  <input
                    type="text"
                    placeholder="👻"
                    value={entityForm.image_emoji}
                    onChange={(e) => setEntityForm({...entityForm, image_emoji: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500 text-3xl text-center"
                  />
                  <p className="text-xs text-slate-400 mt-1">Use a single emoji character</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Region *</label>
                  <select
                    value={entityForm.region_id}
                    onChange={(e) => setEntityForm({...entityForm, region_id: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Select a region...</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Description *</label>
                  <textarea
                    rows={4}
                    placeholder="Brief description of the entity..."
                    value={entityForm.description}
                    onChange={(e) => setEntityForm({...entityForm, description: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={submitEntity}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'Saving...' : 'Add Entity'}
                </button>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h3 className="text-xl font-bold mb-4">Preview</h3>
              <div className="bg-slate-700 p-6 rounded-lg border border-slate-600">
                <div className="flex items-start gap-4">
                  <div className="text-6xl">{entityForm.image_emoji || '👻'}</div>
                  <div className="flex-1">
                    <h4 className="text-2xl font-bold text-emerald-400 mb-2">
                      {entityForm.name || 'Entity Name'}
                    </h4>
                    <p className="text-sm text-slate-400 mb-3">
                      {regions.find(r => r.id === parseInt(entityForm.region_id))?.name || 'Region'}
                    </p>
                    <p className="text-slate-300">
                      {entityForm.description || 'Description will appear here...'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'regions' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Plus className="text-emerald-400" />
                Add New Region
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Region Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Pacific Northwest, Appalachia"
                    value={regionForm.name}
                    onChange={(e) => {
                      setRegionForm({
                        ...regionForm, 
                        name: e.target.value,
                        slug: generateSlug(e.target.value)
                      });
                    }}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Slug (URL-friendly)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated from name"
                    value={regionForm.slug}
                    onChange={(e) => setRegionForm({...regionForm, slug: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">Leave blank to auto-generate</p>
                </div>

                <button
                  onClick={submitRegion}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'Saving...' : 'Add Region'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'funfacts' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Plus className="text-emerald-400" />
                Add Fun Fact
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">Select Entity *</label>
                  <select
                    value={funFactForm.entity_id}
                    onChange={(e) => setFunFactForm({...funFactForm, entity_id: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">Choose an entity...</option>
                    {entities.map(e => (
                      <option key={e.id} value={e.id}>
                        {e.image_emoji} {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Fun Fact *</label>
                  <textarea
                    rows={4}
                    placeholder="Enter an interesting fact about this entity..."
                    value={funFactForm.fact}
                    onChange={(e) => setFunFactForm({...funFactForm, fact: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={submitFunFact}
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'Saving...' : 'Add Fun Fact'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Manage Entities ({entities.length})</h2>
              <div className="space-y-3">
                {entities.map(entity => (
                  <div key={entity.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{entity.image_emoji}</div>
                      <div>
                        <div className="font-bold text-emerald-400">{entity.name}</div>
                        <div className="text-sm text-slate-400">
                          {entity.regions?.name || 'Unknown Region'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEntity(entity.id, entity.name)}
                      className="text-red-400 hover:text-red-300 p-2 hover:bg-slate-700 rounded transition"
                      title="Delete entity"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Manage Regions ({regions.length})</h2>
              <div className="grid md:grid-cols-2 gap-3">
                {regions.map(region => {
                  const entityCount = entities.filter(e => e.region_id === region.id).length;
                  return (
                    <div key={region.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-emerald-400">{region.name}</div>
                        <div className="text-sm text-slate-400">{entityCount} entities</div>
                      </div>
                      <button
                        onClick={() => deleteRegion(region.id, region.name)}
                        className="text-red-400 hover:text-red-300 p-2 hover:bg-slate-700 rounded transition"
                        title="Delete region"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}