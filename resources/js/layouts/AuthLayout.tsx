import type { ReactNode } from 'react'
import { Link } from '@inertiajs/react'

interface AuthLayoutProps {
  children: ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#020617] px-4 overflow-hidden">
      {/* 3D Radiant Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-neon/30 rounded-full mix-blend-screen filter blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-electric/20 rounded-full mix-blend-screen filter blur-[120px] animate-pulse delay-1000" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-primary-vibrant/20 rounded-full mix-blend-screen filter blur-[100px] animate-pulse delay-500" />
      
      {/* Animated Mesh Grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg_viewBox=%220_0_200_200%22_xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter_id=%22n%22%3E%3CfeTurbulence_type=%22fractalNoise%22_baseFrequency=%220.65%22_numOctaves=%223%22_stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect_width=%22100%25%22_height=%22100%25%22_filter=%22url(%23n)%22/%3E%3C/svg%3E')] opacity-[0.015] mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-grid-white/[0.03] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-12 text-center flex flex-col items-center">
          <Link href="/" className="group flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary-neon blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
              <div className="relative h-20 w-20 rounded-[24px] bg-gradient-to-br from-primary-neon via-primary-vibrant to-accent-electric flex items-center justify-center shadow-[0_0_40px_rgba(79,70,229,0.3)] group-hover:scale-105 group-hover:rotate-3 transition-all duration-500 border border-white/20">
                <span className="text-white font-heading font-extrabold text-4xl italic drop-shadow-md">D</span>
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-heading font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-500">
                Draupnir
              </h1>
              <div className="flex items-center gap-2 justify-center">
                <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary-neon/50" />
                <p className="text-primary-neon text-[10px] font-black tracking-[0.3em] uppercase">
                  AI Service Gateway
                </p>
                <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary-neon/50" />
              </div>
            </div>
          </Link>
        </div>
        
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
          {children}
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 text-xs font-bold tracking-widest uppercase opacity-50">
            &copy; {new Date().getFullYear()} Secure Neural Interface
          </p>
        </div>
      </div>
    </div>
  )
}
