'use client';

import React, { useState, useEffect } from 'react';
import { Camera, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Gallery } from '@/types/models';
import { fetchGalleriesFromFirestore } from '@/lib/firebase/services/contentService';

export default function GaleriaPage() {
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGalleries = async () => {
      setLoading(true);
      const data = await fetchGalleriesFromFirestore();
      setGalleries(data);
      setLoading(false);
    };
    loadGalleries();
  }, []);

  return (
    <div className="min-h-screen bg-[#070B14] py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
      
      {/* Encabezado */}
      <div className="space-y-4 mb-8">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#D4AF37]">
          <Camera className="w-4 h-4" />
          <span>REGISTRO HISTÓRICO CONGREGACIONAL</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
          Galería Fotográfica FAMA
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
          Testimonio visual de la obra de Dios: bautismos, cultos de adoración, reuniones misioneras y actividades de la iglesia preservadas en Cloud Firestore y Backblaze B2.
        </p>
      </div>

      {/* Listado de Álbumes */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
          <p className="text-xs">Cargando galerías desde Firestore...</p>
        </div>
      ) : galleries.length === 0 ? (
        <div className="bg-[#0E1626] border border-[#1E2D4A] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#141E33] flex items-center justify-center text-slate-400 mx-auto">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">No hay álbumes publicados</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Las fotografías y álbumes de alta resolución de la congregación aparecerán aquí una vez sincronizados desde el gestor multimedia.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {galleries.map((album) => (
            <div
              key={album.id}
              className="group relative rounded-2xl overflow-hidden border border-[#1E2D4A] bg-[#0E1626] shadow-xl"
            >
              <div className="aspect-[4/3] w-full overflow-hidden bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={album.coverImageUrl || '/images/hero_worship.jpg'}
                  alt={album.title || 'Álbum FAMA'}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-4 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                  {album.category}
                </span>
                <h4 className="text-sm font-bold text-white truncate">{album.title}</h4>
                <p className="text-xs text-slate-400 line-clamp-2">{album.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
