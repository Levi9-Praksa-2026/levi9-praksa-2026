/*
 * A 3D globe turned to Europe with the Levi9 offices labelled on it.
 * three.js + three-globe (MIT); land and country shapes from world-atlas land-110m and countries-110m (ISC, Natural Earth, public domain).
 * The scene renders only while on screen; under reduced motion it draws one still frame.
 */
import { useEffect, useRef } from 'react'
import { AmbientLight, Color, DirectionalLight, MeshBasicMaterial, MeshPhongMaterial, PerspectiveCamera, Scene, WebGLRenderer } from 'three'
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import ThreeGlobe from 'three-globe'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import countriesTopo from 'world-atlas/countries-110m.json'
import landTopo from 'world-atlas/land-110m.json'
import { dotMesh, sampleLandDots } from '@/features/offices/landDots'
import '@/features/offices/office-globe.css'

export interface GlobePlace {
  id: string
  label: string
  lat: number
  lng: number
  /** The country's name as Natural Earth writes it ("Serbia"); its land is drawn in the brand colour. */
  country: string
  /** Which side of its pin the label sits on, so close offices do not cover each other. */
  side?: 'up' | 'down' | 'left' | 'right'
}

export interface OfficeGlobeProps {
  places: readonly GlobePlace[]
  /** Where the camera looks (degrees). */
  focus: { lat: number; lng: number }
  /** Accessible description; the globe itself is a picture. */
  label: string
  className?: string
}

const BLUE = '#2b3fa0'

/** Lattice points over the whole sphere; about 1.2 degrees apart. */
const DOT_COUNT = 30000

interface Arc {
  startLat: number
  startLng: number
  endLat: number
  endLng: number
}

/** Every office linked to the next, and the first to the last: a ring of arcs. */
function ringArcs(places: readonly GlobePlace[]): Arc[] {
  return places.map((p, i) => {
    const q = places[(i + 1) % places.length] ?? p
    return { startLat: p.lat, startLng: p.lng, endLat: q.lat, endLng: q.lng }
  })
}

function labelElement(place: GlobePlace): HTMLElement {
  const el = document.createElement('span')
  el.className = `og-label og-label--${place.side ?? 'up'}`
  const dot = document.createElement('i')
  dot.setAttribute('aria-hidden', 'true')
  el.append(dot, document.createTextNode(place.label))
  return el
}

export function OfficeGlobe({ places, focus, label, className }: OfficeGlobeProps) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const probe = document.createElement('canvas')
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) {
      host.dataset.fallback = ''
      return
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const topo = countriesTopo as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>
    const countries = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>
    const officeCountries = new Set(places.map(p => p.country))
    const land = landTopo as unknown as Topology<{ land: GeometryCollection }>
    const landShapes = (feature(land, land.objects.land) as FeatureCollection<Geometry>).features
    // Land as flat white dots on one even grid (no gaps along borders); the office countries' dots solid white.
    const dots = sampleLandDots(
      { type: 'FeatureCollection', features: landShapes },
      { type: 'FeatureCollection', features: countries.features.filter(f => officeCountries.has(f.properties.name)) },
      DOT_COUNT,
    )

    const renderer = new WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.setAttribute('aria-hidden', 'true')
    const labels = new CSS2DRenderer()
    labels.domElement.className = 'og-labels'
    host.append(renderer.domElement, labels.domElement)

    const globe = new ThreeGlobe({ animateIn: false })
      .showAtmosphere(true)
      .atmosphereColor('#5d74e6')
      .atmosphereAltitude(0.16)
      .arcsData(ringArcs(places))
      .arcColor(() => ['#ffffff', '#a9b9ff'])
      .arcStroke(0.45)
      .arcAltitudeAutoScale(0.35)
      .arcDashLength(0.45)
      .arcDashGap(0.25)
      .arcDashAnimateTime(reduced ? 0 : 2600)
      .ringsData(reduced ? [] : [...places])
      .ringColor(() => (t: number) => `rgba(255, 255, 255, ${1 - t})`)
      .ringMaxRadius(2.6)
      .ringPropagationSpeed(1.4)
      .ringRepeatPeriod(1800)
      .htmlElementsData([...places])
      .htmlElement(d => labelElement(d as GlobePlace))
      .htmlAltitude(0.02)
    const place = (p: { lat: number; lng: number }) => globe.getCoords(p.lat, p.lng, 0.003)
    const landDots = dotMesh(dots.land, place, 0.52, 0.45)
    const officeDots = dotMesh(dots.office, place, 0.58, 1)
    globe.add(landDots, officeDots)
    globe.globeMaterial(new MeshPhongMaterial({ color: new Color(BLUE), shininess: 14, emissive: new Color('#1a2a7a'), emissiveIntensity: 0.25 }))

    const scene = new Scene()
    scene.add(globe, new AmbientLight(0xffffff, 1.7))
    const sun = new DirectionalLight(0xffffff, 1.1)
    sun.position.set(-200, 260, 300)
    scene.add(sun)

    const camera = new PerspectiveCamera(32, 1, 1, 2000)
    let distanceAlt = 3.9 // camera altitude in globe radii, fitted to the host on resize

    function aim(lngOffset: number, latOffset: number) {
      const { x, y, z } = globe.getCoords(focus.lat - 10 + latOffset, focus.lng + lngOffset, distanceAlt)
      camera.position.set(x, y, z)
      camera.lookAt(0, 0, 0)
      // lift the globe so Europe sits in the frame's upper half, clear of the post card at the foot
      camera.translateY(0)
    }

    function resize() {
      if (!host) return
      const w = host.clientWidth
      const h = host.clientHeight
      if (w <= 0 || h <= 0) return
      renderer.setSize(w, h, false)
      labels.setSize(w, h)
      camera.aspect = w / h
      // Fit the sphere and atmosphere to the narrower field of view, with some breathing room.
      const verticalHalfFov = camera.fov * Math.PI / 360
      const horizontalHalfFov = Math.atan(Math.tan(verticalHalfFov) * camera.aspect)
      distanceAlt = Math.max(3.9, 1.16 * 1.08 / Math.sin(Math.min(verticalHalfFov, horizontalHalfFov)) - 1)
      camera.updateProjectionMatrix()
    }

    let pointerX = 0
    let pointerY = 0
    const onPointer = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      pointerX = (e.clientX - r.left) / r.width - 0.5
      pointerY = (e.clientY - r.top) / r.height - 0.5
    }

    let frame = 0
    let visible = true
    const start = performance.now()
    function draw(now: number) {
      const t = (now - start) / 1000
      // a slow sway round Europe, eased towards the pointer; never a full turn, so the offices stay in view
      aim(Math.sin(t * 0.18) * 9 + pointerX * 10, Math.sin(t * 0.13) * 2 - pointerY * 6)
      globe.setPointOfView(camera)
      renderer.render(scene, camera)
      labels.render(scene, camera)
      if (visible && !reduced) frame = requestAnimationFrame(draw)
    }

    const ro = new ResizeObserver(() => {
      resize()
      if (reduced) draw(start)
    })
    ro.observe(host)
    resize()

    const io = new IntersectionObserver(([entry]) => {
      if (!entry) return
      const was = visible
      visible = entry.isIntersecting
      if (visible && !was && !reduced) frame = requestAnimationFrame(draw)
    })
    io.observe(host)
    if (!reduced) host.addEventListener('pointermove', onPointer)
    frame = requestAnimationFrame(draw)
    host.dataset.ready = ''

    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      io.disconnect()
      host.removeEventListener('pointermove', onPointer)
      for (const m of [landDots, officeDots]) {
        m.geometry.dispose()
        ;(m.material as MeshBasicMaterial).dispose()
      }
      globe._destructor()
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
      labels.domElement.remove()
      delete host.dataset.ready
    }
  }, [places, focus])

  return (
    <div ref={hostRef} className={['og', className].filter(Boolean).join(' ')} role="img" aria-label={label}>
      <ul className="og-fallback">
        {places.map(p => (
          <li key={p.id}>{p.label}</li>
        ))}
      </ul>
    </div>
  )
}
