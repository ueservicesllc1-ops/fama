import React from 'react';
import { Database, Cloud, Info } from 'lucide-react';

interface NoticeBannerProps {
  type?: 'firebase' | 'backblaze' | 'general';
  title: string;
  message: string;
}

export const NoticeBanner: React.FC<NoticeBannerProps> = ({
  type = 'general',
  title,
  message,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'firebase':
        return <Database className="w-4 h-4 text-[#D4AF37]" />;
      case 'backblaze':
        return <Cloud className="w-4 h-4 text-cyan-400" />;
      default:
        return <Info className="w-4 h-4 text-[#F3D079]" />;
    }
  };

  return (
    <div className="bg-[#0E1626]/90 border border-[#1E2D4A] rounded-2xl p-4 my-4 flex items-start gap-3 backdrop-blur-md">
      <div className="p-2 rounded-xl bg-[#141E33] shrink-0 border border-[#1E2D4A]">
        {getIcon()}
      </div>
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
        <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
      </div>
    </div>
  );
};
