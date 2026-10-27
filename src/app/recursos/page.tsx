'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  Download,
  FileText,
  CheckCircle2,
} from 'lucide-react';

interface ResourceItem {
  id: string;
  title: string;
  category: 'Estudio Bíblico' | 'Discipulado' | 'Devocional' | 'Familia' | 'Liderazgo';
  description: string;
  format: 'PDF' | 'Guía' | 'Plan';
  pages?: number;
  author: string;
  downloadUrl: string;
  date: string;
  highlight?: boolean;
}

const CATEGORIES = ['Todos', 'Estudio Bíblico', 'Discipulado', 'Devocional', 'Familia', 'Liderazgo'];

const STATIC_RESOURCES: ResourceItem[] = [
  {
    id: 'plan-lectura-2026',
    title: 'Plan Anual de Lectura Bíblica FAMA 2026',
    category: 'Devocional',
    description:
      'Cronograma estructurado para leer toda la Biblia en 365 días, con lecturas paralelas del Antiguo y Nuevo Testamento y salmos devocionales.',
    format: 'Plan',
    pages: 12,
    author: 'Comité Pastoral RENACER CHURCH',
    downloadUrl: '#plan-lectura',
    date: '2026',
    highlight: true,
  },
  {
    id: 'guia-discipulado-fama',
    title: 'Manual de Discipulado Fundamental: Vida Nueva en Cristo',
    category: 'Discipulado',
    description:
      'Ocho lecciones esenciales para nuevos creyentes: seguridad de salvación, oración diaria, lectura bíblica, el bautismo y la vida comunitaria.',
    format: 'Guía',
    pages: 36,
    author: 'Pastor Luis Uchubanda',
    downloadUrl: '#discipulado-manual',
    date: '2026',
    highlight: true,
  },
  {
    id: 'estudio-romanos-gracia',
    title: 'Guía de Estudio: Romanos — El Poder del Evangelio y la Gracia',
    category: 'Estudio Bíblico',
    description:
      'Material expositivo capítulo por capítulo con preguntas de reflexión para grupos pequeños y autoestudio personal.',
    format: 'PDF',
    pages: 24,
    author: 'Instituto Bíblico RENACER',
    downloadUrl: '#romanos-guia',
    date: '2026',
  },
  {
    id: 'devocional-familia',
    title: 'Altar Familiar: Guía Semanal de Devocionales en el Hogar',
    category: 'Familia',
    description:
      'Lecturas bíblicas, dinámicas sencillas para niños y motivos de oración diseñados para reunir a la familia en torno a la Palabra una vez por semana.',
    format: 'Guía',
    pages: 20,
    author: 'Ministerio de Familias FAMA',
    downloadUrl: '#altar-familiar',
    date: '2026',
  },
  {
    id: 'liderazgo-siervo',
    title: 'Principios Bíblicos de Liderazgo Servidor',
    category: 'Liderazgo',
    description:
      'Manual formativo para servidores, líderes de grupos de conexión y colaboradores ministeriales fundamentado en el ejemplo de Jesús.',
    format: 'PDF',
    pages: 28,
    author: 'Equipo de Liderazgo RENACER',
    downloadUrl: '#liderazgo-servidor',
    date: '2026',
  },
  {
    id: 'guia-oracion-intercesion',
    title: 'Manual de Intercesión: Orando con Eficacia según la Escritura',
    category: 'Devocional',
    description:
      'Modelos bíblicos de intercesión, cómo orar las promesas divinas y principios de combate espiritual en el marco de la gracia.',
    format: 'Guía',
    pages: 18,
    author: 'Red de Oración FAMA',
    downloadUrl: '#manual-intercesion',
    date: '2026',
  },
];

export default function RecursosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const filteredResources = useMemo(() => {
    return STATIC_RESOURCES.filter((item) => {
      const matchCat = selectedCategory === 'Todos' || item.category === selectedCategory;
      const matchQuery =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.author.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchQuery;
    });
  }, [searchQuery, selectedCategory]);

  const handleDownload = (item: ResourceItem) => {
    // Generar archivo de lectura en texto/documento para descarga inmediata
    const content = `================================================
${item.title.toUpperCase()}
RENACER CHURCH — PLATAFORMA DIGITAL FAMA
Autor: ${item.author} | Año: ${item.date}
Categoría: ${item.category} | Formato: ${item.format}
================================================

DESCRIPCIÓN:
${item.description}

CONTENIDO ESPIRITUAL & PASTORAL:
Este recurso forma parte de los materiales de edificación bíblica de RENACER CHURCH bajo la visión FAMA (Fe · Amor · Misión · Almas).

Para acceder al curso presencial o virtual completo, coordinar con un líder de discipulado o solicitar el material impreso, contáctanos a través de:
- Correo: contacto@renacerfama.org
- Plataforma: https://fama.renacerchurch.org
- Auditorio Virtual: https://fama.renacerchurch.org/iglesia-virtual

© 2026 RENACER CHURCH — Todos los derechos reservados.
`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(`Material "${item.title}" descargado exitosamente.`);
    setTimeout(() => setDownloadSuccess(null), 4000);
  };

  return (
    <div className="flex flex-col w-full bg-[#17191C] text-[#FAF8F4] overflow-x-hidden">
      
      {/* ========================================================
          1. HERO DE RECURSOS
         ======================================================== */}
      <section className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
            <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
            <span>CRECIMIENTO & DISCIPULADO BÍBLICO</span>
            <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-6xl font-bold tracking-tight text-white">
            Recursos para Tu Vida Espiritual
          </h1>

          <p className="text-base text-slate-300 leading-relaxed max-w-2xl mx-auto font-light">
            Guías de estudio, planes devocionales, manuales de discipulado y bosquejos bíblicos preparados por el equipo pastoral de RENACER CHURCH para edificar tu fe día a día.
          </p>

          {/* Notificación de descarga */}
          {downloadSuccess && (
            <div className="max-w-md mx-auto p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{downloadSuccess}</span>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          2. BUSCADOR & FILTROS DE CATEGORÍA
         ======================================================== */}
      <section className="pb-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-[#121417] border border-[#25282E] p-4 sm:p-5 rounded-2xl shadow-xl">
          
          {/* Buscador */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por tema bíblico, título o autor..."
              className="w-full bg-[#17191C] border border-[#2E323B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C69A4B] transition-colors"
            />
          </div>

          {/* Selector de Categorías */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#C69A4B] text-[#17191C] font-bold shadow-md'
                    : 'bg-[#1A1D23] border border-[#2E323B] text-slate-300 hover:text-white hover:bg-[#25282E]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

        </div>
      </section>

      {/* ========================================================
          3. CATÁLOGO DE RECURSOS
         ======================================================== */}
      <section className="pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {filteredResources.length === 0 ? (
          <div className="rounded-2xl border border-[#25282E] bg-[#121417] p-12 text-center max-w-md mx-auto space-y-3">
            <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
            <h3 className="font-editorial text-lg font-bold text-white">
              No se encontraron materiales
            </h3>
            <p className="text-xs text-slate-400">
              Prueba con otra palabra clave o selecciona la categoría &quot;Todos&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[#25282E] bg-[#121417] p-6 flex flex-col justify-between space-y-4 hover:border-[#C69A4B]/50 transition-all duration-300 group shadow-lg"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#C69A4B]/15 text-[#C69A4B] border border-[#C69A4B]/30">
                      {item.category}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      {item.format} {item.pages ? `• ${item.pages} págs` : ''}
                    </span>
                  </div>

                  <h3 className="font-editorial text-xl font-bold text-white group-hover:text-[#C69A4B] transition-colors leading-snug">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400 leading-relaxed font-light">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#1F2228] flex items-center justify-between text-xs">
                  <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                    {item.author}
                  </span>

                  <button
                    onClick={() => handleDownload(item)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#C69A4B] hover:bg-[#D4A359] text-[#17191C] font-bold text-xs tracking-wide shadow-sm transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ========================================================
          4. LLAMADO A DISCIPULADO & COMUNIDAD
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="rounded-3xl border border-[#25282E] bg-gradient-to-b from-[#1C1F26] to-[#121417] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
          <div className="space-y-3 max-w-xl">
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-white">
              ¿Deseas profundizar con un mentor o grupo pequeño?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
              Los materiales cobran vida cuando se estudian en comunidad. Intégrate a un Grupo de Conexión de RENACER CHURCH y camina acompañado en tu fe.
            </p>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row gap-3">
            <Link
              href="/comunidad"
              className="px-7 py-3.5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-md transition-all text-center"
            >
              Ver Grupos de Conexión
            </Link>

            <Link
              href="/contacto"
              className="px-7 py-3.5 rounded-full bg-[#1A1D23] hover:bg-[#25282E] text-slate-200 border border-[#2E323B] font-medium text-xs sm:text-sm transition-all text-center"
            >
              Solicitar Material Impreso
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
