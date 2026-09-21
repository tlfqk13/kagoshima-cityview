import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyText } from '@/lib/clipboard'

// execCommand 대체 경로 검증용 최소 document 스텁
function stubDocument(execResult: boolean | 'throw') {
  const body = { appendChild: vi.fn(), removeChild: vi.fn() }
  const execCommand = vi.fn(() => {
    if (execResult === 'throw') throw new Error('unsupported')
    return execResult
  })
  vi.stubGlobal('document', {
    body,
    execCommand,
    createElement: () => ({ value: '', style: {}, setAttribute: vi.fn(), select: vi.fn() }),
  })
  return { body, execCommand }
}

describe('클립보드 복사', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('Clipboard API가 있으면 그대로 사용한다', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    await expect(copyText('abc')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('abc')
  })

  it('비보안 컨텍스트(Clipboard API 없음)에서는 execCommand로 대체한다', async () => {
    vi.stubGlobal('navigator', {})
    const { body, execCommand } = stubDocument(true)
    await expect(copyText('abc')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledWith('copy')
    expect(body.removeChild).toHaveBeenCalledOnce()
  })

  it('Clipboard API가 거부되면 대체 방식으로 재시도한다', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })
    const { execCommand } = stubDocument(true)
    await expect(copyText('abc')).resolves.toBe(true)
    expect(execCommand).toHaveBeenCalledOnce()
  })

  it('모든 방식이 실패하면 예외 없이 false를 반환한다', async () => {
    vi.stubGlobal('navigator', {})
    const { body } = stubDocument('throw')
    await expect(copyText('abc')).resolves.toBe(false)
    expect(body.removeChild).toHaveBeenCalledOnce()
  })
})
