import type { StemRole } from "../audio/types";

export type VisualLevels = Record<StemRole, number>;

const W = 1080;
const H = 1920;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** 9:16 Instagram canvas — each stem role owns a visual layer. */
export class StemRenderer {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private t = 0;
  private smooth: VisualLevels = {
    drums: 0,
    bass: 0,
    melody: 0,
    vocal: 0,
    fx: 0,
    other: 0,
  };
  private particles: { x: number; y: number; vx: number; vy: number; life: number }[] =
    [];
  private rings: { r: number; a: number }[] = [];
  private title: string;

  constructor(title = "STEM VISUAL") {
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    const ctx = this.canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("2D canvas unavailable");
    this.ctx = ctx;
    this.title = title;
  }

  setTitle(title: string): void {
    this.title = title.trim() || "STEM VISUAL";
  }

  draw(levels: VisualLevels, timeSec: number, dt: number): void {
    this.t = timeSec;
    for (const key of Object.keys(this.smooth) as StemRole[]) {
      const target = levels[key] ?? 0;
      this.smooth[key] = lerp(this.smooth[key], target, 1 - Math.exp(-dt * 14));
    }

    const c = this.ctx;
    const s = this.smooth;

    // Atmosphere — bass lifts warmth, fx adds grain wash
    const warmth = s.bass;
    c.fillStyle = `rgb(${12 + warmth * 28}, ${10 + s.fx * 10}, ${14 + s.other * 18})`;
    c.fillRect(0, 0, W, H);

    // Subtle vignette plane
    const vg = c.createRadialGradient(W / 2, H * 0.42, 80, W / 2, H * 0.5, H * 0.72);
    vg.addColorStop(0, `rgba(255, 214, 170, ${0.04 + warmth * 0.08})`);
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    c.fillStyle = vg;
    c.fillRect(0, 0, W, H);

    this.drawBassField(s.bass);
    this.drawMelodyOrbits(s.melody, dt);
    this.drawVocalForm(s.vocal);
    this.drawDrumHits(s.drums, dt);
    this.drawFxNoise(s.fx);
    this.drawOtherShards(s.other);
    this.drawTitle(s);
  }

  private drawBassField(level: number): void {
    const c = this.ctx;
    const pulse = 1 + level * 0.12;
    const y = H * 0.72;
    c.save();
    c.translate(W / 2, y);
    c.scale(pulse, pulse);
    const g = c.createRadialGradient(0, 0, 20, 0, 0, 420 + level * 180);
    g.addColorStop(0, `rgba(232, 145, 58, ${0.18 + level * 0.45})`);
    g.addColorStop(0.55, `rgba(180, 70, 40, ${0.08 + level * 0.2})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g;
    c.beginPath();
    c.ellipse(0, 0, 460, 160 + level * 90, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Floor band
    c.fillStyle = `rgba(232, 145, 58, ${0.08 + level * 0.25})`;
    c.fillRect(0, H * 0.78 - level * 30, W, 8 + level * 24);
  }

  private drawMelodyOrbits(level: number, dt: number): void {
    const c = this.ctx;
    const count = 18;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + this.t * (0.35 + level * 0.8);
      const r = 180 + Math.sin(this.t * 1.4 + i) * 40 + level * 120;
      const x = W / 2 + Math.cos(a) * r;
      const y = H * 0.38 + Math.sin(a) * r * 0.62;
      const size = 3 + level * 10 + (i % 3);
      c.fillStyle = `rgba(90, 210, 200, ${0.2 + level * 0.7})`;
      c.beginPath();
      c.arc(x, y, size, 0, Math.PI * 2);
      c.fill();

      if (level > 0.35 && Math.random() < level * dt * 8) {
        this.particles.push({
          x,
          y,
          vx: (Math.random() - 0.5) * 80,
          vy: (Math.random() - 0.5) * 80,
          life: 0.6 + Math.random() * 0.5,
        });
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      c.fillStyle = `rgba(90, 210, 200, ${clamp01(p.life)})`;
      c.fillRect(p.x, p.y, 3, 3);
    }
  }

  private drawVocalForm(level: number): void {
    const c = this.ctx;
    const cx = W / 2;
    const cy = H * 0.4;
    const open = 40 + level * 160;

    c.strokeStyle = `rgba(248, 240, 230, ${0.25 + level * 0.65})`;
    c.lineWidth = 2 + level * 4;
    c.beginPath();
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const x = cx - open + t * open * 2;
      const wave =
        Math.sin(t * Math.PI * 4 + this.t * 6) * (12 + level * 36) +
        Math.sin(t * Math.PI * 9 + this.t * 3) * (6 + level * 14);
      const y = cy + wave * (0.35 + level);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();

    c.fillStyle = `rgba(248, 240, 230, ${0.05 + level * 0.2})`;
    c.beginPath();
    c.arc(cx, cy, 28 + level * 70, 0, Math.PI * 2);
    c.fill();
  }

  private drawDrumHits(level: number, dt: number): void {
    const c = this.ctx;
    if (level > 0.55) {
      this.rings.push({ r: 40, a: 0.55 + level * 0.4 });
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.r += (280 + level * 200) * dt;
      ring.a -= dt * 1.4;
      if (ring.a <= 0) {
        this.rings.splice(i, 1);
        continue;
      }
      c.strokeStyle = `rgba(255, 92, 64, ${ring.a})`;
      c.lineWidth = 6 * ring.a + 1;
      c.beginPath();
      c.arc(W / 2, H * 0.42, ring.r, 0, Math.PI * 2);
      c.stroke();
    }

    // Hard flash on strong hits
    if (level > 0.72) {
      c.fillStyle = `rgba(255, 240, 220, ${(level - 0.72) * 0.35})`;
      c.fillRect(0, 0, W, H);
    }
  }

  private drawFxNoise(level: number): void {
    if (level < 0.05) return;
    const c = this.ctx;
    const dots = Math.floor(40 + level * 180);
    c.fillStyle = `rgba(210, 200, 255, ${0.08 + level * 0.22})`;
    for (let i = 0; i < dots; i++) {
      const x = (Math.sin(this.t * 12 + i * 17.1) * 0.5 + 0.5) * W;
      const y = (Math.cos(this.t * 9 + i * 13.7) * 0.5 + 0.5) * H;
      c.fillRect(x, y, 2, 2);
    }
  }

  private drawOtherShards(level: number): void {
    if (level < 0.04) return;
    const c = this.ctx;
    c.save();
    c.translate(W / 2, H * 0.55);
    c.rotate(this.t * 0.2);
    c.strokeStyle = `rgba(255, 255, 255, ${0.08 + level * 0.35})`;
    c.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.beginPath();
      c.moveTo(Math.cos(a) * 40, Math.sin(a) * 40);
      c.lineTo(Math.cos(a) * (90 + level * 140), Math.sin(a) * (90 + level * 140));
      c.stroke();
    }
    c.restore();
  }

  private drawTitle(s: VisualLevels): void {
    const c = this.ctx;
    const punch = Math.max(s.drums, s.vocal);
    c.fillStyle = `rgba(248, 242, 232, ${0.55 + punch * 0.4})`;
    c.font = "700 54px 'Archivo Black', system-ui, sans-serif";
    c.textAlign = "center";
    c.fillText(this.title.toUpperCase(), W / 2, H * 0.14);

    c.font = "500 28px 'IBM Plex Sans', system-ui, sans-serif";
    c.fillStyle = "rgba(248, 242, 232, 0.45)";
    c.fillText("STEM → VISUAL", W / 2, H * 0.14 + 48);

    // Legend meters
    const roles: StemRole[] = ["drums", "bass", "melody", "vocal", "fx"];
    const colors = ["#ff5c40", "#e8913a", "#5ad2c8", "#f8f0e6", "#c8c0ff"];
    const baseY = H * 0.9;
    roles.forEach((role, i) => {
      const x = 120 + i * 180;
      const h = 18 + s[role] * 90;
      c.fillStyle = colors[i];
      c.globalAlpha = 0.35 + s[role] * 0.65;
      c.fillRect(x, baseY - h, 36, h);
      c.globalAlpha = 1;
      c.fillStyle = "rgba(248,242,232,0.55)";
      c.font = "600 18px 'IBM Plex Sans', system-ui, sans-serif";
      c.textAlign = "center";
      c.fillText(role.toUpperCase(), x + 18, baseY + 28);
    });
  }
}
