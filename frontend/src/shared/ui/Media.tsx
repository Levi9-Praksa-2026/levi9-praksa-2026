import type { ImgHTMLAttributes } from 'react'
import { cssVars } from '@/shared/lib/style'

/** A photograph as data: the page passes these, the parts render them. */
export interface Photo {
  src: string
  /** What it shows, plainly; never "image of". */
  alt: string
  width?: number
  height?: number
  /** The responsive widths (`img/photo-c391-500.webp 500w, …`), as it printed them. */
  srcSet?: string
  /** How wide it shows, for this frame (`(max-width: 1023px) 100vw, 50vw`). */
  sizes?: string
  /** Its focal point in the frame (`object-position`, the design system's `--ly-pos`): "50% 40%". */
  position?: string
  /** The focal point on a phone (`--ly-pos-phone`), where the frame is taller. */
  phonePosition?: string
  /** Where it came from, for the credits: client, library or shoot. */
  source?: 'client' | 'library' | 'shoot'
}

export interface PhotoImgProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt' | 'width' | 'height'> {
  photo: Photo
  /** The hero's picture: fetched first, never lazy. */
  priority?: boolean
}

/** A shared photograph: its focal point as the design system's variables, lazy unless it is the hero's. */
export function PhotoImg({ photo, priority = false, style, ...rest }: PhotoImgProps) {
  return (
    <img
      src={photo.src}
      alt={photo.alt}
      width={photo.width}
      height={photo.height}
      srcSet={photo.srcSet}
      sizes={photo.sizes}
      loading={priority ? undefined : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      data-source={photo.source}
      style={cssVars({ '--ly-pos': photo.position, '--ly-pos-phone': photo.phonePosition }, style)}
      {...rest}
    />
  )
}
