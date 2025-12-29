import React, { useEffect, useRef } from 'react';

interface VoiceIndicatorProps {
  isActive: boolean;
  isProcessing: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  opacity: number;
}

const VoiceIndicator: React.FC<VoiceIndicatorProps> = ({ isActive, isProcessing }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalParticles = useRef<Particle[]>([]);
  const sphereRadius = 48; // Radius of the glass ball

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize internal particles for the sphere
    if (internalParticles.current.length === 0) {
      // Increased particle count from 60 to 150 for more density
      for (let i = 0; i < 150; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const r = Math.random() * sphereRadius;
        
        internalParticles.current.push({
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta),
          z: r * Math.cos(phi),
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          vz: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.5 + 0.5
        });
      }
    }

    let animationId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = Date.now() / 1000;

      // Draw Sonar Rings if Active
      if (isActive && !isProcessing) {
        for (let i = 0; i < 3; i++) {
          const radius = sphereRadius + ((time * 60 + i * 40) % 100);
          const opacity = 1 - ((radius - sphereRadius) / 100);
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(59, 130, 246, ${opacity * 0.2})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // Draw Glass Sphere Shadow/Glow
      const glowGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, sphereRadius + 20);
      if (isProcessing) {
        glowGradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)'); // Changed from amber to blue
        glowGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else if (isActive) {
        glowGradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
        glowGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
      } else {
        glowGradient.addColorStop(0, 'rgba(148, 163, 184, 0.05)');
        glowGradient.addColorStop(1, 'rgba(148, 163, 184, 0)');
      }
      ctx.fillStyle = glowGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Sphere Physics and Rendering
      const speedFactor = isProcessing ? 3.5 : isActive ? 2 : 0.5;
      
      // Sort particles by Z for basic 3D depth effect
      internalParticles.current.sort((a, b) => a.z - b.z);

      internalParticles.current.forEach((p) => {
        // Update positions
        p.x += p.vx * speedFactor;
        p.y += p.vy * speedFactor;
        p.z += p.vz * speedFactor;

        // Bounce inside sphere boundary
        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);
        if (dist > sphereRadius) {
          const normalX = p.x / dist;
          const normalY = p.y / dist;
          const normalZ = p.z / dist;
          
          const dot = p.vx * normalX + p.vy * normalY + p.vz * normalZ;
          p.vx -= 2 * dot * normalX;
          p.vy -= 2 * dot * normalY;
          p.vz -= 2 * dot * normalZ;
        }

        // Project 3D to 2D
        const scale = (p.z + sphereRadius) / (sphereRadius * 2);
        const drawX = centerX + p.x;
        const drawY = centerY + p.y;
        const currentSize = p.size * (0.6 + scale);
        const currentOpacity = p.opacity * (0.4 + scale * 0.6);

        ctx.beginPath();
        ctx.arc(drawX, drawY, currentSize, 0, Math.PI * 2);
        
        // Particles are now Shiny Blue
        if (isProcessing) {
          ctx.fillStyle = `rgba(96, 165, 250, ${currentOpacity})`; // Bright blue-400
          ctx.shadowBlur = 6;
          ctx.shadowColor = 'rgba(37, 99, 235, 0.8)'; // Deeper blue-600
        } else {
          ctx.fillStyle = `rgba(147, 197, 253, ${currentOpacity})`; // Soft blue-300
          ctx.shadowBlur = 4;
          ctx.shadowColor = 'rgba(59, 130, 246, 0.6)'; // Blue-500
        }
        
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for next draws
      });

      // Draw Glass Ball Overlay (Gradients for reflections)
      // 1. Base sphere volume
      const sphereGrad = ctx.createRadialGradient(centerX - sphereRadius/3, centerY - sphereRadius/3, 0, centerX, centerY, sphereRadius);
      sphereGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
      sphereGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.02)');
      sphereGrad.addColorStop(0.8, 'rgba(0, 0, 0, 0.05)');
      sphereGrad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.fillStyle = sphereGrad;
      ctx.fill();

      // 2. Specular Highlight
      const highlightGrad = ctx.createRadialGradient(centerX - sphereRadius/2.5, centerY - sphereRadius/2.5, 0, centerX - sphereRadius/2.5, centerY - sphereRadius/2.5, sphereRadius/2);
      highlightGrad.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
      highlightGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      ctx.beginPath();
      ctx.arc(centerX - sphereRadius/2.5, centerY - sphereRadius/2.5, sphereRadius/2, 0, Math.PI * 2);
      ctx.fillStyle = highlightGrad;
      ctx.fill();

      // 3. Rim Light
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationId);
  }, [isActive, isProcessing]);

  return (
    <div className="relative flex flex-col items-center justify-center h-64 w-64 mx-auto group">
      <div className="absolute inset-0 bg-blue-500/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
      
      <canvas
        ref={canvasRef}
        width={256}
        height={256}
        className="relative z-10 drop-shadow-2xl"
      />
      
      {isProcessing && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 animate-pulse">
              Kernel Synthesizing
            </span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
            </div>
          </div>
        </div>
      )}

      {isActive && !isProcessing && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-blue-500 animate-pulse">
            Neural Listening
          </span>
        </div>
      )}
    </div>
  );
};

export default VoiceIndicator;