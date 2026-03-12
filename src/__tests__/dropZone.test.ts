import { describe, it, expect, vi } from 'vitest'
import { handleFile } from '../lib/osmLoader'

describe('handleFile', () => {
  it('handleFile function exists and accepts a File object', () => {
    expect(typeof handleFile).toBe('function')
    const file = new File(['test'], 'test.osm.gz', { type: 'application/gzip' })
    // Just check it doesn't throw on call signature — actual worker behavior tested separately
    expect(() => {
      // Pass a mock worker — should not throw on function shape
      const mockWorker = { postMessage: vi.fn() } as unknown as Worker
      handleFile(file, mockWorker)
    }).not.toThrow()
  })

  it('handleFile calls postMessage on the worker with an ArrayBuffer', async () => {
    const mockPostMessage = vi.fn()
    const mockWorker = { postMessage: mockPostMessage } as unknown as Worker
    const content = new Uint8Array([1, 2, 3, 4])
    const file = new File([content], 'leiden.osm.gz', { type: 'application/gzip' })

    await handleFile(file, mockWorker)

    expect(mockPostMessage).toHaveBeenCalledOnce()
    const [payload] = mockPostMessage.mock.calls[0]
    expect(payload).toBeInstanceOf(ArrayBuffer)
  })
})
