/**
 * ScatterBackground
 * ─────────────────
 * The VeryGiftly signature scatter — sparkles, asterisks, stars, dots — as a
 * React component backed by the CSS mask technique from the design system.
 *
 * Shapes are crisp SVG geometry clipped from a solid color (or foil gradient
 * for the hero shapes). No images, no heavy SVG shadow trees.
 *
 * Usage:
 *   <ScatterBackground density="medium" surface="cream" className="py-28">
 *     <div className="relative z-10">hero content</div>
 *   </ScatterBackground>
 *
 * Or as a background-only wrapper with transparent surface:
 *   <ScatterBackground surface="transparent" className="absolute inset-0 pointer-events-none" />
 */

import { useEffect, type CSSProperties, type ReactNode, type ElementType } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScatterDensity = 'sparse' | 'medium' | 'dense'
export type ScatterSurface = 'light' | 'cream' | 'dark' | 'transparent'

interface ScatterBackgroundProps {
  density?:   ScatterDensity
  surface?:   ScatterSurface
  animate?:   boolean
  as?:        ElementType
  children?:  ReactNode
  className?: string
  style?:     CSSProperties
}

// ─── Shape mask data URIs ─────────────────────────────────────────────────────

const svgMask = (svg: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}")`

const MASKS: Record<string, string> = {
  sparkle: svgMask(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
    "<path d='M50 0 C 52 38 62 48 100 50 C 62 52 52 62 50 100 C 48 62 38 52 0 50 C 38 48 48 38 50 0 Z' fill='black'/>" +
    "</svg>"
  ),
  asterisk: svgMask(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
    "<g stroke='black' stroke-width='9' stroke-linecap='round'>" +
    "<line x1='50' y1='6' x2='50' y2='94'/>" +
    "<line x1='6' y1='50' x2='94' y2='50'/>" +
    "<line x1='18' y1='18' x2='82' y2='82'/>" +
    "<line x1='82' y1='18' x2='18' y2='82'/>" +
    "</g></svg>"
  ),
  star: svgMask(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
    "<path d='M50 5 L61 38 L96 38 L68 58 L78 92 L50 72 L22 92 L32 58 L4 38 L39 38 Z' fill='black'/>" +
    "</svg>"
  ),
  dot: svgMask(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>" +
    "<circle cx='50' cy='50' r='44' fill='black'/>" +
    "</svg>"
  ),
}

// ─── Colors ───────────────────────────────────────────────────────────────────

// Foil gradient — bounded to bright range so it reads on both cream and slate.
const FOIL = 'linear-gradient(135deg, #C99933 0%, #F1D77A 40%, #D9A93C 70%, #C99933 100%)'

// Flat palette — on dark surfaces deep tokens flip to their base counterparts.
const PALETTE: Record<ScatterSurface, Record<string, string>> = {
  light: {
    gold:     '#D9A93C',
    teal:     '#86C3C5',
    tealDeep: '#2F6E72',
    tan:      '#D9B891',
    tanDeep:  '#7A5E37',
    peach:    '#E5A88A',
    paper:    '#F4EFE3',
  },
  cream: {
    gold:     '#D9A93C',
    teal:     '#86C3C5',
    tealDeep: '#2F6E72',
    tan:      '#D9B891',
    tanDeep:  '#7A5E37',
    peach:    '#E5A88A',
    paper:    '#F4EFE3',
  },
  dark: {
    gold:     '#D9A93C',
    teal:     '#86C3C5',  // flip: teal-deep → teal
    tealDeep: '#86C3C5',
    tan:      '#D9B891',  // flip: tan-deep → tan
    tanDeep:  '#D9B891',
    peach:    '#E5A88A',
    paper:    '#F4EFE3',
  },
  transparent: {
    gold:     '#D9A93C',
    teal:     '#86C3C5',
    tealDeep: '#2F6E72',
    tan:      '#D9B891',
    tanDeep:  '#7A5E37',
    peach:    '#E5A88A',
    paper:    '#F4EFE3',
  },
}

const SURFACE_BG: Record<ScatterSurface, string> = {
  light:       '#ffffff',
  cream:       '#F4EFE3',
  dark:        '#2C2A28',
  transparent: 'transparent',
}

// ─── Compositions ─────────────────────────────────────────────────────────────

type ShapeDef = {
  shape:   'sparkle' | 'asterisk' | 'star' | 'dot'
  foil?:   boolean
  color?:  string
  size:    number
  top?:    number
  bottom?: number
  left?:   string | number
  right?:  string | number
  rotate?: number
}

const SPARSE: ShapeDef[] = [
  { shape: 'sparkle', foil: true,         size: 36, top:  30, left:  '8%' },
  { shape: 'sparkle', color: 'teal',      size: 18, top:  60, left: '22%' },
  { shape: 'star',    color: 'peach',     size: 22, top:  24, right:'18%', rotate:  15 },
  { shape: 'dot',     color: 'gold',      size: 14, top:  50, right: '8%' },
  { shape: 'asterisk',color: 'gold',      size: 32, bottom: 40, left: '14%', rotate: 15 },
  { shape: 'dot',     color: 'tanDeep',   size: 10, bottom: 70, left: '32%' },
  { shape: 'sparkle', color: 'tealDeep',  size: 16, bottom: 60, right:'22%' },
  { shape: 'dot',     color: 'peach',     size:  8, bottom: 30, right: '8%' },
]

const MEDIUM: ShapeDef[] = [
  { shape: 'sparkle', foil: true,         size: 44, top:  28, left:  '6%' },
  { shape: 'dot',     color: 'tealDeep',  size: 14, top:  14, left: '22%' },
  { shape: 'sparkle', color: 'peach',     size: 22, top:  58, left: '18%' },
  { shape: 'asterisk',color: 'gold',      size: 28, top:  30, left: '36%', rotate:  20 },
  { shape: 'dot',     color: 'tanDeep',   size: 10, top:  70, left: '48%' },
  { shape: 'star',    color: 'teal',      size: 32, top:  20, right:'24%', rotate: -10 },
  { shape: 'sparkle', color: 'gold',      size: 22, top:  64, right:'12%' },
  { shape: 'dot',     color: 'peach',     size:  8, top:  38, right: '6%' },
  { shape: 'sparkle', color: 'teal',      size: 26, bottom: 30, left:  '8%' },
  { shape: 'star',    color: 'peach',     size: 36, bottom: 64, left: '22%', rotate: 15 },
  { shape: 'dot',     color: 'gold',      size: 10, bottom: 40, left: '38%' },
  { shape: 'sparkle', color: 'tan',       size: 18, bottom: 70, right:'36%' },
  { shape: 'sparkle', foil: true,         size: 30, bottom: 30, right:'16%' },
  { shape: 'dot',     color: 'tealDeep',  size:  8, bottom: 60, right: '6%' },
]

const DENSE: ShapeDef[] = [
  { shape: 'sparkle', foil: true,         size: 44, top:  18, left:  '4%' },
  { shape: 'dot',     color: 'tealDeep',  size: 12, top:  12, left: '22%' },
  { shape: 'sparkle', color: 'peach',     size: 24, top:  50, left: '18%' },
  { shape: 'asterisk',color: 'gold',      size: 30, top:  28, left: '34%', rotate:  20 },
  { shape: 'dot',     color: 'tanDeep',   size: 14, top:  76, left: '32%' },
  { shape: 'dot',     color: 'peach',     size:  8, top:  84, left: '50%' },
  { shape: 'sparkle', color: 'teal',      size: 22, top:  12, right:'30%' },
  { shape: 'star',    color: 'peach',     size: 36, top:  18, right:'14%', rotate: -10 },
  { shape: 'dot',     color: 'gold',      size: 16, top:  60, right:'24%' },
  { shape: 'sparkle', color: 'tan',       size: 18, top:  70, right: '8%' },
  { shape: 'dot',     color: 'gold',      size:  8, top:  40, right: '4%' },
  { shape: 'dot',     color: 'peach',     size:  8, bottom: 14, left:  '6%' },
  { shape: 'sparkle', color: 'teal',      size: 28, bottom: 36, left: '14%' },
  { shape: 'star',    color: 'peach',     size: 30, bottom: 64, left: '24%', rotate: 15 },
  { shape: 'dot',     color: 'gold',      size: 12, bottom: 32, left: '36%' },
  { shape: 'sparkle', color: 'tanDeep',   size: 14, bottom: 70, left: '44%' },
  { shape: 'asterisk',color: 'gold',      size: 22, bottom: 50, right:'38%', rotate: 40 },
  { shape: 'dot',     color: 'peach',     size: 10, bottom: 16, right:'28%' },
  { shape: 'sparkle', color: 'tealDeep',  size: 18, bottom: 70, right:'18%' },
  { shape: 'sparkle', foil: true,         size: 38, bottom: 30, right: '8%' },
  { shape: 'dot',     color: 'gold',      size:  6, bottom: 14, right:'16%' },
]

const COMPOSITIONS: Record<ScatterDensity, ShapeDef[]> = {
  sparse: SPARSE,
  medium: MEDIUM,
  dense:  DENSE,
}

// ─── Animation keyframes (injected once, lazy) ────────────────────────────────

const KEYFRAMES = `
@keyframes scatter-drift-cw  {0%,100%{transform:rotate(var(--r,0deg))} 50%{transform:rotate(calc(var(--r,0deg) + 8deg))}}
@keyframes scatter-drift-ccw {0%,100%{transform:rotate(var(--r,0deg))} 50%{transform:rotate(calc(var(--r,0deg) - 8deg))}}
`

// ─── Shape element ────────────────────────────────────────────────────────────

function Shape({
  shape, foil, color, size, top, bottom, left, right, rotate = 0, palette, animate,
}: Omit<ShapeDef, 'rotate'> & { rotate?: number; palette: Record<string, string>; animate: boolean }) {
  const mask  = MASKS[shape]
  const color_ = foil ? undefined : (color ? palette[color] : palette.gold)
  const anim  = animate
    ? {
        animationName:            rotate >= 0 ? 'scatter-drift-cw' : 'scatter-drift-ccw',
        animationDuration:        `${6 + (size % 4)}s`,
        animationTimingFunction:  'ease-in-out',
        animationIterationCount:  'infinite',
      }
    : {}

  const style: CSSProperties = {
    position:        'absolute',
    width:            size,
    height:           size,
    WebkitMask:      `${mask} no-repeat center / contain`,
    mask:            `${mask} no-repeat center / contain`,
    backgroundImage:  foil ? FOIL : undefined,
    backgroundColor:  foil ? 'transparent' : color_,
    transform:       `rotate(${rotate}deg)`,
    pointerEvents:   'none',
    flexShrink:       0,
    zIndex:           0,
    ...anim,
    ...(top    !== undefined ? { top    } : {}),
    ...(bottom !== undefined ? { bottom } : {}),
    ...(left   !== undefined ? { left   } : {}),
    ...(right  !== undefined ? { right  } : {}),
  }

  return <span aria-hidden="true" style={style} />
}

// ─── ScatterBackground ────────────────────────────────────────────────────────

export function ScatterBackground({
  density   = 'medium',
  surface   = 'cream',
  animate   = false,
  as: Tag   = 'div',
  children,
  className = '',
  style,
}: ScatterBackgroundProps) {
  useEffect(() => {
    if (!animate) return
    if (document.getElementById('scatter-keyframes')) return
    const el = document.createElement('style')
    el.id = 'scatter-keyframes'
    el.textContent = KEYFRAMES
    document.head.appendChild(el)
  }, [animate])

  const shapes  = COMPOSITIONS[density] ?? MEDIUM
  const palette = PALETTE[surface]      ?? PALETTE.cream
  const bgColor = SURFACE_BG[surface]   ?? SURFACE_BG.cream

  const Tag_ = Tag as ElementType

  return (
    <Tag_
      className={className}
      style={{
        position:        'relative',
        overflow:        'hidden',
        backgroundColor:  bgColor,
        ...style,
      }}
    >
      {shapes.map((s, i) => (
        <Shape key={i} {...s} palette={palette} animate={animate} />
      ))}
      {children && (
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      )}
    </Tag_>
  )
}

export default ScatterBackground
