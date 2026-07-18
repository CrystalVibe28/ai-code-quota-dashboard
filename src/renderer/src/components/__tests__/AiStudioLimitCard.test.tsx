import { describe, expect, it } from 'vitest'
import { render, screen } from '../../../../test/test-utils'
import { AiStudioLimitCard } from '../common/AiStudioLimitCard'

describe('AiStudioLimitCard', () => {
  it('shows the model name without its ID and readable metric rows', () => {
    const { container } = render(
      <AiStudioLimitCard
        model="gemini-2.5-flash"
        displayName="Gemini 2.5 Flash"
        rpm={5}
        tpm={250000}
        rpd={-1}
        rpmUsed={3}
        tpmUsed={100}
        rpdUsed={7}
      />
    )

    expect(screen.getByText('Gemini 2.5 Flash')).toBeInTheDocument()
    expect(screen.queryByText('gemini-2.5-flash')).not.toBeInTheDocument()
    expect(screen.getByText('3 / 5')).toHaveClass('whitespace-nowrap')
    expect(screen.getByText('100 / 250,000')).toHaveClass('whitespace-nowrap')
    expect(screen.getByText('7 / Unlimited')).toHaveClass('whitespace-nowrap')
    expect(screen.queryByText('Free Tier')).not.toBeInTheDocument()
    expect(container.querySelectorAll('dt')).toHaveLength(3)
    expect(container.querySelectorAll('dd')).toHaveLength(3)
  })
})
