'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Heart,
  Globe,
  Users,
  Radio,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export default function QuienesSomosPage() {
  const pilares = [
    {
      letra: 'F',
      titulo: 'Fe Inquebrantable',
      subtitulo: 'Hebreos 11:1',
      descripcion:
        'Creemos en el poder transformador del Evangelio de Jesucristo. Vivimos guiados por la verdad inmutable de las Sagradas Escrituras, cimentando nuestras vidas en la fidelidad y promesas de Dios.',
      icon: BookOpen,
    },
    {
      letra: 'A',
      titulo: 'Amor Sacrificial',
      subtitulo: '1 Juan 4:19',
      descripcion:
        'Amamos a Dios sobre todas las cosas y a nuestro prójimo con sinceridad y servicio activo. Nuestra congregación es un refugio de restauración, gracia, perdón y acogida fraternal sin distinción.',
      icon: Heart,
    },
    {
      letra: 'M',
      titulo: 'Misión Global',
      subtitulo: 'Mateo 28:19',
      descripcion:
        'Obedecemos el mandato de la Gran Comisión extendiendo el mensaje de salvación a través de la predicación presencial, la formación de discípulos y la innovación digital sin fronteras geográficas.',
      icon: Globe,
    },
    {
      letra: 'A',
      titulo: 'Almas Preciosas',
      subtitulo: 'Lucas 15:7',
      descripcion:
        'Cada individuo tiene un valor incalculable para Dios. Trabajamos con pasión pastoral por la salvación de los perdidos, el acompañamiento de las familias y la formación de nuevas generaciones firmes en Cristo.',
      icon: Users,
    },
  ];

  const doctrinas = [
    {
      titulo: 'La Palabra de Dios',
      texto:
        'Creemos que la Biblia es la Palabra inspirada, infalible y autoritativa de Dios, la única regla suficiente de fe, moral y práctica cristiana.',
    },
    {
      titulo: 'El Dios Trino',
      texto:
        'Existe un solo Dios verdadero, creador de los cielos y la tierra, eternamente existente en tres personas: Padre, Hijo y Espíritu Santo.',
    },
    {
      titulo: 'Jesucristo el Redentor',
      texto:
        'Jesucristo es plenamente Dios y plenamente hombre, concebido por obra del Espíritu Santo, nacido de la virgen María, crucificado, resucitado y ascendido.',
    },
    {
      titulo: 'Salvación por Gracia',
      texto:
        'La salvación es un don gratuito de Dios recibido únicamente por medio de la fe en Cristo Jesús, no por obras, mediante Su sacrificio expiatorio en la cruz.',
    },
    {
      titulo: 'La Iglesia Viva',
      texto:
        'La iglesia es el cuerpo de Cristo en la tierra, llamada a congregarse en adoración, perseverar en doctrina, practicar el amor fraternal y servir al mundo.',
    },
    {
      titulo: 'La Gran Comisión',
      texto:
        'Cada creyente está comisionado para testificar de Cristo, hacer discípulos a todas las naciones y ser sal y luz en medio de la sociedad contemporánea.',
    },
  ];

  return (
    <div className="flex flex-col w-full bg-[#17191C] text-[#FAF8F4] overflow-x-hidden">
      
      {/* ========================================================
          1. HERO INSTITUCIONAL
         ======================================================== */}
      <section className="relative pt-20 pb-24 sm:pt-28 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2.5 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
            <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
            <span>IDENTIDAD & PROPÓSITO CONGREGACIONAL</span>
            <span className="w-8 h-[1px] bg-[#C69A4B]"></span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-6xl font-bold tracking-tight text-white leading-tight">
            Una Iglesia Comprometida con la Verdad y el Amor
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto font-light">
            RENACER CHURCH es una familia de fe cristiana, bíblica y contemporánea. A través de la visión <strong className="text-[#C69A4B] font-semibold">FAMA</strong> unimos la adoración presencial con una plataforma digital integral que derriba distancias y conecta vidas con Cristo.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/cultos"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-lg shadow-[#C69A4B]/20 transition-all group"
            >
              <span>Nuestros Cultos & Horarios</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <Link
              href="/iglesia-virtual"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[#1F2228] hover:bg-[#2A2E36] text-slate-200 border border-[#2E323B] font-medium text-xs sm:text-sm transition-all"
            >
              <Radio className="w-4 h-4 text-red-400" />
              <span>Auditorio Virtual en Vivo</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          2. LOS 4 PILARES DE FAMA
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
            <span className="w-6 h-[1px] bg-[#C69A4B]"></span>
            <span>EL CORAZÓN DE NUESTRO MINISTERIO</span>
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Los Cuatro Pilares de FAMA
          </h2>
          <p className="text-sm text-slate-400">
            Cada letra representa un valor bíblico ineludible que sostiene nuestra misión.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {pilares.map((p) => {
            const IconComponent = p.icon;
            return (
              <div
                key={p.titulo}
                className="rounded-2xl border border-[#25282E] bg-[#121417] p-7 flex flex-col justify-between space-y-5 hover:border-[#C69A4B]/60 transition-all duration-300 group shadow-lg"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-editorial text-3xl font-black text-[#C69A4B]">
                      {p.letra}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-[#C69A4B]/10 border border-[#C69A4B]/30 flex items-center justify-center text-[#C69A4B] group-hover:bg-[#C69A4B] group-hover:text-[#17191C] transition-colors">
                      <IconComponent className="w-5 h-5 stroke-[1.8]" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h3 className="font-editorial text-lg font-bold text-white">
                      {p.titulo}
                    </h3>
                    <span className="text-[11px] font-semibold text-[#C69A4B] tracking-wider uppercase block">
                      {p.subtitulo}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    {p.descripcion}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          3. HISTORIA & LIDERAZGO PASTORAL
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
              <span className="w-6 h-[1px] bg-[#C69A4B]"></span>
              <span>NUESTRA TRAYECTORIA</span>
            </div>

            <h2 className="font-editorial text-3xl sm:text-5xl font-bold text-white tracking-tight">
              Una Comunidad Nacida para Transformar
            </h2>

            <div className="space-y-4 text-sm text-slate-300 leading-relaxed font-light">
              <p>
                RENACER CHURCH nació con la convicción profunda de que la iglesia debe ser una familia viva, relevante y accesible. No nos conformamos con una estructura religiosa tradicional; entendemos que la fe debe vivirse en el hogar, el trabajo y en la vida diaria.
              </p>
              <p>
                Frente a la necesidad de congregar a creyentes en diversas ciudades, países y situaciones que impedían su asistencia física, desarrollamos la plataforma digital <strong className="text-white font-medium">FAMA</strong>. No como un simple canal de video pasivo, sino como un auditorio con butacas digitales, presencia activa y comunión fraternal genuina.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#121417] border border-[#25282E] space-y-2">
              <h4 className="font-editorial text-lg font-bold text-white">
                Liderazgo Pastoral
              </h4>
              <p className="text-xs text-[#C69A4B] font-semibold">
                Pastor Luis Uchubanda & Equipo Pastoral
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Guiando a la congregación con dedicación a la sana doctrina bíblica, el cuidado pastoral de las familias y la formación de líderes con corazón de servicio.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="rounded-3xl border border-[#25282E] bg-gradient-to-b from-[#1C1F26] to-[#121417] p-8 sm:p-10 space-y-6 shadow-2xl">
              <div className="flex items-center gap-3 text-[#C69A4B]">
                <Sparkles className="w-6 h-6" />
                <h3 className="font-editorial text-2xl font-bold text-white">
                  Nuestra Visión y Misión
                </h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5 pb-4 border-b border-[#25282E]">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C69A4B]">
                    Misión
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Evangelizar a los no creyentes, edificar a los santos a través de la exposición fiel de las Escrituras y cultivar una comunidad amorosa donde cada persona descubra su propósito en Cristo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C69A4B]">
                    Visión
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    Ser una iglesia referente en la proclamación del Evangelio integral, multiplicando discípulos y conectando una congregación global que adora con excelencia en espíritu y en verdad.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================
          4. DECLARACIÓN DOCTRINAL (LO QUE CREEMOS)
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.25em] text-[#C69A4B] uppercase">
            <span className="w-6 h-[1px] bg-[#C69A4B]"></span>
            <span>FUNDAMENTO BÍBLICO</span>
          </div>
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white tracking-tight">
            Nuestra Declaración de Fe
          </h2>
          <p className="text-sm text-slate-400">
            Principios irrenunciables que fundamentan cada mensaje y ministerio en RENACER CHURCH.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctrinas.map((doc) => (
            <div
              key={doc.titulo}
              className="rounded-2xl border border-[#25282E] bg-[#121417] p-6 space-y-3 hover:border-[#C69A4B]/40 transition-colors"
            >
              <div className="flex items-center gap-2 text-[#C69A4B]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <h3 className="font-editorial text-base font-bold text-white">
                  {doc.titulo}
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {doc.texto}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ========================================================
          5. LLAMADO FINAL
         ======================================================== */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full border-t border-[#25282E]">
        <div className="rounded-3xl border border-[#25282E] bg-[#121417] p-8 sm:p-12 text-center space-y-6">
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-white">
            Queremos Conocerte
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Te invitamos a ser parte activa de RENACER CHURCH. Escríbenos para consejería, únete al muro de oración o acompáñanos este domingo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contacto"
              className="px-8 py-3.5 rounded-full bg-[#C69A4B] hover:bg-[#D4A359] text-white font-semibold text-xs sm:text-sm tracking-wide shadow-md transition-all"
            >
              Escríbenos a Contacto
            </Link>
            <Link
              href="/comunidad"
              className="px-8 py-3.5 rounded-full bg-[#1F2228] hover:bg-[#2A2E36] text-slate-200 border border-[#2E323B] font-medium text-xs sm:text-sm transition-all"
            >
              Conocer Grupos & Ministerios
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
