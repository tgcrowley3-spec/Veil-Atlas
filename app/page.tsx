'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, FileText, Eye, ChevronRight, Search, Globe, Loader } from 'lucide-react';

// Supabase configuration
const SUPABASE_URL = 'https://knsnjranmkgvxwoicssx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtuc25qcmFubWtndnh3b2ljc3N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDQxNzYsImV4cCI6MjA4MjE4MDE3Nn0.4neEuF8ySDI7yJfMSfQUFyWwKb6oj_PkURMX9Lxts1Y';


// Supabase client functions
async function supabaseFetch(endpoint: string, options: any = {}) {
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
    throw new Error(`Supabase error: ${response.statusText}`);
  }
  
  return response.json();
}

export default function Home() {
  const [currentPage, setCurrentPage] = useState('home');
  const [entities, setEntities] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalSightings, setTotalSightings] = useState(0);
  const [newSighting, setNewSighting] = useState({
    entity_id: '',
    location: '',
    date: '',
    reporter_name: '',
    description: ''
  });

  // Load all data on mount
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load regions
      const regionsData = await supabaseFetch('regions?select=*');
      setRegions(regionsData);
      
      // Load entities with their region info
      const entitiesData = await supabaseFetch('entities?select=*,regions(name,slug)');
      setEntities(entitiesData);
      
      // Count total sightings
      const sightingsData = await supabaseFetch('sightings?select=id');
      setTotalSightings(sightingsData.length);
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  async function loadEntityDetails(entityId: number) {
    try {
      // Load entity with region
      const [entityData] = await supabaseFetch(`entities?id=eq.${entityId}&select=*,regions(name,slug)`);
      
      // Load fun facts
      const funFacts = await supabaseFetch(`fun_facts?entity_id=eq.${entityId}&select=*`);
      
      // Load sightings
      const sightings = await supabaseFetch(`sightings?entity_id=eq.${entityId}&select=*&order=date.desc`);
      
      return {
        ...entityData,
        fun_facts: funFacts,
        sightings: sightings
      };
    } catch (error) {
      console.error('Error loading entity details:', error);
      return null;
    }
  }

  // Filter entities by search
  const filteredEntities = entities.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.regions && e.regions.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Navigation functions
  const goHome = () => {
    setCurrentPage('home');
    setSelectedEntity(null);
    setSelectedRegion(null);
  };

  const viewEntity = async (entity: any) => {
    const fullEntity = await loadEntityDetails(entity.id);
    setSelectedEntity(fullEntity);
    setCurrentPage('entity');
  };

  const viewRegion = (region: any) => {
    setSelectedRegion(region);
    setCurrentPage('region');
  };

  const goToSubmit = () => {
    setCurrentPage('submit');
  };

  const submitSighting = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await supabaseFetch('sightings', {
        method: 'POST',
        body: JSON.stringify({
          entity_id: parseInt(newSighting.entity_id),
          location: newSighting.location,
          date: newSighting.date,
          reporter_name: newSighting.reporter_name,
          description: newSighting.description
        })
      });
      
      alert('Sighting submitted successfully! 🎉');
      setNewSighting({ entity_id: '', location: '', date: '', reporter_name: '', description: '' });
      goHome();
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error submitting sighting:', error);
      alert('Error submitting sighting. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin text-emerald-400 mx-auto mb-4" size={48} />
          <p className="text-slate-400">Loading Veil Atlas...</p>
        </div>
      </div>
    );
  }

  // HOME PAGE
  if (currentPage === 'home') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🗺️</div>
              <h1 className="text-2xl font-bold text-emerald-400">Veil Atlas</h1>
            </div>
            <button 
              onClick={goToSubmit}
              className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <FileText size={18} />
              Report Sighting
            </button>
          </div>
        </header>

        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Hero */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Encyclopedia of the Unknown</h2>
            <p className="text-slate-400 text-lg mb-6">
              Explore cryptids and paranormal entities from around the world
            </p>
            
            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-3 top-3 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Search entities or regions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="bg-slate-800 p-6 rounded-lg text-center border border-slate-700">
              <div className="text-3xl font-bold text-emerald-400">{entities.length}</div>
              <div className="text-slate-400">Entities</div>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg text-center border border-slate-700">
              <div className="text-3xl font-bold text-emerald-400">{regions.length}</div>
              <div className="text-slate-400">Regions</div>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg text-center border border-slate-700">
              <div className="text-3xl font-bold text-emerald-400">{totalSightings}</div>
              <div className="text-slate-400">Sightings</div>
            </div>
          </div>

          {/* Browse by Region */}
          <div className="mb-12">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Globe className="text-emerald-400" />
              Browse by Region
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {regions.map((region) => {
                const regionEntityCount = entities.filter(e => e.regions && e.regions.slug === region.slug).length;
                return (
                  <button
                    key={region.id}
                    onClick={() => viewRegion(region)}
                    className="bg-slate-800 hover:bg-slate-700 p-4 rounded-lg border border-slate-700 text-left transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-emerald-400">{region.name}</div>
                        <div className="text-sm text-slate-400">
                          {regionEntityCount} entities
                        </div>
                      </div>
                      <ChevronRight className="text-slate-600 group-hover:text-emerald-400 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* All Entities */}
          <div>
            <h3 className="text-2xl font-bold mb-4">All Entities</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {filteredEntities.map((entity) => (
                <button
                  key={entity.id}
                  onClick={() => viewEntity(entity)}
                  className="bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 text-left transition group"
                >
                  <div className="flex items-start gap-4">
                    <div className="text-5xl">{entity.image_emoji}</div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-emerald-400 mb-1">{entity.name}</h4>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                        <MapPin size={14} />
                        {entity.regions ? entity.regions.name : 'Unknown'}
                      </div>
                      <p className="text-slate-300 text-sm mb-3">{entity.description}</p>
                    </div>
                    <ChevronRight className="text-slate-600 group-hover:text-emerald-400 transition" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ENTITY PAGE
  if (currentPage === 'entity' && selectedEntity) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <button onClick={goHome} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2">
              ← Back to Atlas
            </button>
            <button onClick={goToSubmit} className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg">
              Report Sighting
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Entity Header */}
          <div className="bg-slate-800 rounded-lg p-8 mb-8 border border-slate-700">
            <div className="flex items-start gap-6">
              <div className="text-8xl">{selectedEntity.image_emoji}</div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-2">{selectedEntity.name}</h1>
                <div className="flex items-center gap-2 text-slate-400 mb-4">
                  <MapPin size={18} />
                  <span>{selectedEntity.regions ? selectedEntity.regions.name : 'Unknown'}</span>
                </div>
                <p className="text-lg text-slate-300">{selectedEntity.description}</p>
              </div>
            </div>
          </div>

          {/* Fun Facts */}
          {selectedEntity.fun_facts && selectedEntity.fun_facts.length > 0 && (
            <div className="bg-slate-800 rounded-lg p-6 mb-8 border border-slate-700">
              <h2 className="text-2xl font-bold mb-4 text-emerald-400">Fun Facts</h2>
              <ul className="space-y-2">
                {selectedEntity.fun_facts.map((factObj: any) => (
                  <li key={factObj.id} className="flex items-start gap-3">
                    <span className="text-emerald-400 mt-1">•</span>
                    <span className="text-slate-300">{factObj.fact}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sightings */}
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <h2 className="text-2xl font-bold mb-4 text-emerald-400 flex items-center gap-2">
              <Eye size={24} />
              Recent Sightings ({selectedEntity.sightings ? selectedEntity.sightings.length : 0})
            </h2>
            {selectedEntity.sightings && selectedEntity.sightings.length > 0 ? (
              <div className="space-y-4">
                {selectedEntity.sightings.map((sighting: any) => (
                  <div key={sighting.id} className="bg-slate-700 p-4 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-semibold text-emerald-400">{sighting.location}</div>
                      <div className="text-sm text-slate-400">{sighting.date}</div>
                    </div>
                    <p className="text-slate-300 mb-2">{sighting.description}</p>
                    <div className="text-sm text-slate-500">Reported by {sighting.reporter_name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">No sightings reported yet. Be the first!</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // REGION PAGE
  if (currentPage === 'region' && selectedRegion) {
    const regionEntities = entities.filter(e => e.regions && e.regions.slug === selectedRegion.slug);
    
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <button onClick={goHome} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2">
              ← Back to Atlas
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">{selectedRegion.name}</h1>
            <p className="text-slate-400">{regionEntities.length} cryptids documented in this region</p>
          </div>

          <div className="space-y-4">
            {regionEntities.map((entity) => (
              <button
                key={entity.id}
                onClick={() => viewEntity(entity)}
                className="w-full bg-slate-800 hover:bg-slate-700 p-6 rounded-lg border border-slate-700 text-left transition group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-5xl">{entity.image_emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-emerald-400 mb-2">{entity.name}</h3>
                    <p className="text-slate-300 mb-3">{entity.description}</p>
                  </div>
                  <ChevronRight className="text-slate-600 group-hover:text-emerald-400 transition" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // SUBMIT PAGE
  if (currentPage === 'submit') {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100">
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="max-w-2xl mx-auto">
            <button onClick={goHome} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-2">
              ← Back to Atlas
            </button>
          </div>
        </header>

        <div className="max-w-2xl mx-auto px-6 py-8">
          <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
            <h1 className="text-3xl font-bold mb-2">Report a Sighting</h1>
            <p className="text-slate-400 mb-6">Share your encounter with the unknown</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Entity</label>
                <select
                  required
                  value={newSighting.entity_id}
                  onChange={(e) => setNewSighting({...newSighting, entity_id: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select an entity...</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Location</label>
                <input
                  type="text"
                  required
                  placeholder="Where did you see it?"
                  value={newSighting.location}
                  onChange={(e) => setNewSighting({...newSighting, location: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Date</label>
                <input
                  type="date"
                  required
                  value={newSighting.date}
                  onChange={(e) => setNewSighting({...newSighting, date: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="How should we credit you?"
                  value={newSighting.reporter_name}
                  onChange={(e) => setNewSighting({...newSighting, reporter_name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Description</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Tell us what you saw..."
                  value={newSighting.description}
                  onChange={(e) => setNewSighting({...newSighting, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={submitSighting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 py-3 rounded-lg font-semibold transition"
              >
                Submit Sighting
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}