/*
 * The globe's land as evenly spaced flat dots.
 * The land and the office countries are painted once onto an equirectangular canvas (d3-geo, which clips
 * shapes across the date line correctly); points on a Fibonacci lattice then read their pixel, so every
 * dot on land is drawn and none drop out along borders.
 */
import { CircleGeometry, DoubleSide, InstancedMesh, MeshBasicMaterial, Object3D } from 'three'
import { geoEquirectangular, geoPath } from 'd3-geo'
import type { FeatureCollection, Geometry } from 'geojson'

export interface LatLng {
  lat: number
  lng: number
}

export interface DotSample {
  land: LatLng[]
  office: LatLng[]
}

const W = 2048
const H = 1024
const GOLDEN = Math.PI * (3 - Math.sqrt(5))

/** Sorts `count` lattice points into land and office land; sea points are dropped. */
export function sampleLandDots(land: FeatureCollection<Geometry>, offices: FeatureCollection<Geometry>, count: number): DotSample {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return { land: [], office: [] }
  const projection = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2])
  const path = geoPath(projection, ctx)
  ctx.fillStyle = '#ff0000'
  ctx.beginPath()
  path(land)
  ctx.fill()
  ctx.fillStyle = '#00ff00'
  ctx.beginPath()
  path(offices)
  ctx.fill()
  const pixels = ctx.getImageData(0, 0, W, H).data

  const out: DotSample = { land: [], office: [] }
  for (let i = 0; i < count; i++) {
    const y = 1 - ((i + 0.5) / count) * 2
    const lat = (Math.asin(y) * 180) / Math.PI
    const lng = ((((GOLDEN * i * 180) / Math.PI) % 360) + 360) % 360 - 180
    const px = Math.min(W - 1, Math.max(0, Math.floor(((lng + 180) / 360) * W)))
    const py = Math.min(H - 1, Math.max(0, Math.floor(((90 - lat) / 180) * H)))
    const k = (py * W + px) * 4
    if ((pixels[k + 1] ?? 0) > 128) out.office.push({ lat, lng })
    else if ((pixels[k] ?? 0) > 128) out.land.push({ lat, lng })
  }
  return out
}

/** One instanced mesh of flat round dots lying on the sphere. `place` turns lat/lng into a point. */
export function dotMesh(points: readonly LatLng[], place: (p: LatLng) => { x: number; y: number; z: number }, radius: number, opacity: number): InstancedMesh {
  const geometry = new CircleGeometry(radius, 12)
  const material = new MeshBasicMaterial({ color: 0xffffff, transparent: opacity < 1, opacity, side: DoubleSide })
  const mesh = new InstancedMesh(geometry, material, points.length)
  const probe = new Object3D()
  points.forEach((p, i) => {
    const { x, y, z } = place(p)
    probe.position.set(x, y, z)
    probe.lookAt(0, 0, 0)
    probe.updateMatrix()
    mesh.setMatrixAt(i, probe.matrix)
  })
  mesh.instanceMatrix.needsUpdate = true
  return mesh
}
