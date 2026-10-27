'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Search, Loader2, Film } from 'lucide-react';
import { Recording } from '@/types/models';
import { RecordingCard } from '@/components/ui/RecordingCard';
import { VideoPlayerModal } from '@/components/ui/VideoPlayerModal';
import { fetchRecordingsFromFirestore } from '@/lib/firebase/services/contentService';

export default function PredicacionesPage() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeries, setSelectedSeries] = useState<string>('Todas');
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);

  useEffect(() => {
    const loadTeachings = async () => {
      setLoading(true);
      const data = await fetchRecordingsFromFirestore();
      setRecordings(data);
      setLoading(false);
    };
    loadTeachings();
  }, []);

  const seriesList = useMemo(() => {
    const list = new Set<string>(['Todas']);
    recordings.forEach((r) => {
      if (r.seriesTitle) list.add(r.seriesTitle);
    });
    return Array.from(list);
  }, [recordings]);

  const filteredTeachings = useMemo(() => {
    return recordings.filter((rec) => {
      const matchesSeries =
        selectedSeries === 'Todas' || rec.seriesTitle === selectedSeries;
      const matchesSearch =
        rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.preacher.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (rec.scriptureReference && rec.scriptureReference.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesSeries && matchesSearch;
    });
  }, [recordings, searchQuery, selectedSeries]);

  return (
    <div className="min-h-screen bg-[#070B14] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      
      {/* Encabezado */}
      <div className="space-y-4 mb-10 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#D4AF37]">
          <BookOpen className="w-4 h-4" />
          <span>INSTITUTO & ENSEÑANZA BÍBLICA</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Catálogo de Predicaciones & Series
        </h1>
        <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
          Enseñanzas expositivas, estudios temáticos y sermones congregacionales fundamentados en la verdad de las Sagradas Escrituras.
        </p>
      </div>

      {/* Buscador y Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por pasaje, pastor o tema bíblico..."
            className="w-full bg-[#0E1626] border border-[#1E2D4A] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#D4AF37]"
          />
        </div>

        {seriesList.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
            {seriesList.map((serie) => (
              <button
                key={serie}
                onClick={() => setSelectedSeries(serie)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedSeries === serie
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-[#0E1626] border border-[#1E2D4A] text-slate-300 hover:text-white'
                }`}
              >
                {serie}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Listado de Predicaciones */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
          <p className="text-xs">Consultando catálogo de predicaciones en Firestore...</p>
        </div>
      ) : filteredTeachings.length === 0 ? (
        <div className="bg-[#0E1626] border border-[#1E2D4A] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#141E33] flex items-center justify-center text-slate-400 mx-auto">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No hay predicaciones registradas</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {recordings.length === 0
              ? 'Aún no se han añadido predicaciones a la base de datos de Cloud Firestore.'
              : 'No se encontraron resultados para la búsqueda ingresada.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachings.map((rec) => (
            <RecordingCard
              key={rec.id}
              recording={rec}
              onSelect={() => setSelectedRecording(rec)}
            />
          ))}
        </div>
      )}

      {/* Modal de Video */}
      <VideoPlayerModal
        onClose={() => setSelectedRecording(null)}
        recording={selectedRecording}
      />

    </div>
  );
}
