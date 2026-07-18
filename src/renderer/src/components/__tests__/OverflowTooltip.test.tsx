import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '../../../../test/test-utils'
import { OverflowTooltip } from '../common/OverflowTooltip'

describe('OverflowTooltip', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should reveal overflowing text from keyboard focus', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(200)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(20)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(20)

    render(<OverflowTooltip className="truncate">A very long quota name</OverflowTooltip>)

    const text = screen.getByText('A very long quota name')
    expect(text).toHaveAttribute('tabindex', '0')

    fireEvent.focus(text)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('A very long quota name')
  })

  it('should reveal text on pointer hover without relying on overflow measurement', async () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(20)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(20)

    render(<OverflowTooltip className="truncate">A very long quota name</OverflowTooltip>)

    const text = screen.getByText('A very long quota name')
    fireEvent.pointerMove(text, { pointerType: 'mouse' })

    expect(await screen.findByRole('tooltip')).toHaveTextContent('A very long quota name')
  })

  it('should leave fitting text out of the tab order', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(20)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(20)

    render(<OverflowTooltip className="truncate">Quota</OverflowTooltip>)

    expect(screen.getByText('Quota')).not.toHaveAttribute('tabindex')
  })
})
