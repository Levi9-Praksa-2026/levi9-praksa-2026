import { describe, expect, it } from 'vitest'
import { pickImages } from './pickImages'

const file = (name: string, type = 'image/png', size = 1000) => {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

describe('pickImages', () => {
  it('keeps JPEG and PNG files under 5 MB, after the ones already picked', () => {
    const a = file('a.png')
    const result = pickImages([a], [file('b.jpg', 'image/jpeg')])
    expect(result.images.map(f => f.name)).toEqual(['a.png', 'b.jpg'])
    expect(result.problem).toBeNull()
  })

  it('leaves out other formats and files over 5 MB, and says which and why', () => {
    const result = pickImages([], [file('anim.gif', 'image/gif'), file('huge.png', 'image/png', 6 * 1024 * 1024), file('ok.png')])
    expect(result.images.map(f => f.name)).toEqual(['ok.png'])
    expect(result.problem).toBe('anim.gif is not a JPEG or PNG. huge.png is over 5 MB.')
  })

  it('stops at three images', () => {
    const result = pickImages([file('1.png'), file('2.png')], [file('3.png'), file('4.png')])
    expect(result.images).toHaveLength(3)
    expect(result.problem).toBe('Only 3 images fit in a post; 4.png was left out.')
  })
})
