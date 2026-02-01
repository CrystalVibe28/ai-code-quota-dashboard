import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '../../../../test/test-utils'
import { UsageCard } from '../common/UsageCard'

describe('UsageCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('basic rendering', () => {
    it('should render title', () => {
      render(<UsageCard title="Test Model" percentage={50} />)

      expect(screen.getByText('Test Model')).toBeInTheDocument()
    })

    it('should render subtitle when provided', () => {
      render(<UsageCard title="Test" subtitle="Subtitle text" percentage={50} />)

      expect(screen.getByText('Subtitle text')).toBeInTheDocument()
    })

    it('should render percentage', () => {
      render(<UsageCard title="Test" percentage={75} />)

      expect(screen.getByText('75%')).toBeInTheDocument()
    })

    it('should round percentage to integer', () => {
      render(<UsageCard title="Test" percentage={75.7} />)

      expect(screen.getByText('76%')).toBeInTheDocument()
    })
  })

  describe('percentage colors', () => {
    it('should show destructive color for low percentage (<=10%)', () => {
      render(<UsageCard title="Test" percentage={5} />)

      const percentElement = screen.getByText('5%')
      expect(percentElement).toHaveClass('text-destructive')
    })

    it('should show warning color for medium percentage (<=25%)', () => {
      render(<UsageCard title="Test" percentage={20} />)

      const percentElement = screen.getByText('20%')
      expect(percentElement).toHaveClass('text-warning')
    })

    it('should show success color for high percentage (>25%)', () => {
      render(<UsageCard title="Test" percentage={50} />)

      const percentElement = screen.getByText('50%')
      expect(percentElement).toHaveClass('text-success')
    })
  })

  describe('value format', () => {
    it('should show only percentage when valueFormat is percent', () => {
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          remaining={500} 
          total={1000} 
          valueFormat="percent"
        />
      )

      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.queryByText('500 / 1,000')).not.toBeInTheDocument()
    })

    it('should show only absolute values when valueFormat is absolute', () => {
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          remaining={500} 
          total={1000} 
          valueFormat="absolute"
        />
      )

      expect(screen.getByText('500 / 1,000')).toBeInTheDocument()
      expect(screen.queryByText('50%')).not.toBeInTheDocument()
    })

    it('should show both when valueFormat is both', () => {
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          remaining={500} 
          total={1000} 
          valueFormat="both"
        />
      )

      expect(screen.getByText('50%')).toBeInTheDocument()
      expect(screen.getByText('500 / 1,000')).toBeInTheDocument()
    })
  })

  describe('reset time', () => {
    it('should show reset time when showResetTime is true and resetTime is provided', () => {
      const futureTime = new Date('2024-01-15T14:30:00Z').toISOString()
      
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          resetTime={futureTime}
          showResetTime={true}
        />
      )

      // Should show formatted time (2h 30m)
      expect(screen.getByText('2h 30m')).toBeInTheDocument()
    })

    it('should hide reset time when showResetTime is false', () => {
      const futureTime = new Date('2024-01-15T14:30:00Z').toISOString()
      
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          resetTime={futureTime}
          showResetTime={false}
        />
      )

      expect(screen.queryByText('2h 30m')).not.toBeInTheDocument()
    })
  })

  describe('card sizes', () => {
    it('should apply compact size class', () => {
      render(<UsageCard title="Test" percentage={50} cardSize="compact" />)

      // Compact cards have smaller text
      const title = screen.getByText('Test')
      expect(title).toHaveClass('text-xs')
    })

    it('should apply default size class', () => {
      render(<UsageCard title="Test" percentage={50} cardSize="default" />)

      const title = screen.getByText('Test')
      expect(title).toHaveClass('text-sm')
    })
  })

  describe('card radius', () => {
    it('should apply none radius', () => {
      const { container } = render(
        <UsageCard title="Test" percentage={50} cardRadius="none" />
      )
      
      // The Card component should have the radius class
      expect(container.firstChild).toHaveClass('rounded-none')
    })

    it('should apply lg radius', () => {
      const { container } = render(
        <UsageCard title="Test" percentage={50} cardRadius="lg" />
      )
      
      expect(container.firstChild).toHaveClass('rounded-lg')
    })
  })

  describe('click handler', () => {
    it('should call onClick when clicked', () => {
      const handleClick = vi.fn()
      const { container } = render(
        <UsageCard title="Test" percentage={50} onClick={handleClick} />
      )

      fireEvent.click(container.firstChild as Element)

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should have hover styles when onClick is provided', () => {
      const { container } = render(
        <UsageCard title="Test" percentage={50} onClick={() => {}} />
      )

      expect(container.firstChild).toHaveClass('cursor-pointer')
    })

    it('should not have hover styles when onClick is not provided', () => {
      const { container } = render(
        <UsageCard title="Test" percentage={50} />
      )

      expect(container.firstChild).not.toHaveClass('cursor-pointer')
    })
  })

  describe('visibility toggle', () => {
    it('should show visibility toggle when enabled', () => {
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          showVisibilityToggle={true}
          isVisibleInOverview={true}
        />
      )

      expect(screen.getByTitle('Hide from overview')).toBeInTheDocument()
    })

    it('should not show visibility toggle when disabled', () => {
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          showVisibilityToggle={false}
        />
      )

      expect(screen.queryByTitle('Hide from overview')).not.toBeInTheDocument()
      expect(screen.queryByTitle('Show in overview')).not.toBeInTheDocument()
    })

    it('should call onVisibilityToggle when clicked', () => {
      const handleToggle = vi.fn()
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          showVisibilityToggle={true}
          isVisibleInOverview={true}
          onVisibilityToggle={handleToggle}
        />
      )

      fireEvent.click(screen.getByTitle('Hide from overview'))

      expect(handleToggle).toHaveBeenCalledWith(false)
    })

    it('should show correct icon based on visibility state', () => {
      const { rerender } = render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          showVisibilityToggle={true}
          isVisibleInOverview={true}
        />
      )

      expect(screen.getByTitle('Hide from overview')).toBeInTheDocument()

      rerender(
        <UsageCard 
          title="Test" 
          percentage={50} 
          showVisibilityToggle={true}
          isVisibleInOverview={false}
        />
      )

      expect(screen.getByTitle('Show in overview')).toBeInTheDocument()
    })

    it('should not trigger card onClick when visibility toggle is clicked', () => {
      const handleClick = vi.fn()
      const handleToggle = vi.fn()
      
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          onClick={handleClick}
          showVisibilityToggle={true}
          isVisibleInOverview={true}
          onVisibilityToggle={handleToggle}
        />
      )

      fireEvent.click(screen.getByTitle('Hide from overview'))

      expect(handleToggle).toHaveBeenCalled()
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('edge cases', () => {
    it('should handle 0% percentage', () => {
      render(<UsageCard title="Test" percentage={0} />)

      expect(screen.getByText('0%')).toBeInTheDocument()
      expect(screen.getByText('0%')).toHaveClass('text-destructive')
    })

    it('should handle 100% percentage', () => {
      render(<UsageCard title="Test" percentage={100} />)

      expect(screen.getByText('100%')).toBeInTheDocument()
      expect(screen.getByText('100%')).toHaveClass('text-success')
    })

    it('should handle large numbers in remaining/total', () => {
      render(
        <UsageCard 
          title="Test" 
          percentage={50} 
          remaining={1000000} 
          total={2000000} 
          valueFormat="absolute"
        />
      )

      expect(screen.getByText('1,000,000 / 2,000,000')).toBeInTheDocument()
    })
  })
})
