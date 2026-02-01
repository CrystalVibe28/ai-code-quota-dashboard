import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '../../../../test/test-utils'
import { CollapsibleSection } from '../common/CollapsibleSection'

describe('CollapsibleSection', () => {
  describe('basic rendering', () => {
    it('should render title', () => {
      render(
        <CollapsibleSection 
          title="Test Section" 
          isCollapsed={false} 
          onToggle={() => {}}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      expect(screen.getByText('Test Section')).toBeInTheDocument()
    })

    it('should render children when expanded', () => {
      render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={false} 
          onToggle={() => {}}
        >
          <div>Child Content</div>
        </CollapsibleSection>
      )

      expect(screen.getByText('Child Content')).toBeInTheDocument()
    })

    it('should render children when collapsed (hidden via CSS)', () => {
      render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={true} 
          onToggle={() => {}}
        >
          <div>Child Content</div>
        </CollapsibleSection>
      )

      // Children are rendered but hidden via CSS (max-height: 0, opacity: 0)
      expect(screen.getByText('Child Content')).toBeInTheDocument()
    })
  })

  describe('collapse state', () => {
    it('should show ChevronDown when expanded', () => {
      const { container } = render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={false} 
          onToggle={() => {}}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      // Look for the SVG icon - ChevronDown has a specific path
      const button = container.querySelector('button')
      const svgIcon = button?.querySelector('svg')
      expect(svgIcon).toBeInTheDocument()
    })

    it('should show ChevronRight when collapsed', () => {
      const { container } = render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={true} 
          onToggle={() => {}}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      const button = container.querySelector('button')
      const svgIcon = button?.querySelector('svg')
      expect(svgIcon).toBeInTheDocument()
    })

    it('should have max-h-0 class when collapsed', () => {
      const { container } = render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={true} 
          onToggle={() => {}}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      const contentDiv = container.querySelector('section > div:last-child')
      expect(contentDiv).toHaveClass('max-h-0')
      expect(contentDiv).toHaveClass('opacity-0')
    })

    it('should have max-h-[2000px] class when expanded', () => {
      const { container } = render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={false} 
          onToggle={() => {}}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      const contentDiv = container.querySelector('section > div:last-child')
      expect(contentDiv).toHaveClass('max-h-[2000px]')
      expect(contentDiv).toHaveClass('opacity-100')
    })
  })

  describe('toggle interaction', () => {
    it('should call onToggle when header is clicked', () => {
      const handleToggle = vi.fn()
      
      render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={false} 
          onToggle={handleToggle}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      fireEvent.click(screen.getByText('Test'))

      expect(handleToggle).toHaveBeenCalledTimes(1)
    })

    it('should call onToggle when clicking the button area', () => {
      const handleToggle = vi.fn()
      const { container } = render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={false} 
          onToggle={handleToggle}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      const button = container.querySelector('button')
      fireEvent.click(button!)

      expect(handleToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('styling', () => {
    it('should apply custom className to section', () => {
      const { container } = render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={false} 
          onToggle={() => {}}
          className="custom-class"
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      const section = container.querySelector('section')
      expect(section).toHaveClass('custom-class')
    })

    it('should have hover styles on button', () => {
      const { container } = render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={false} 
          onToggle={() => {}}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      const button = container.querySelector('button')
      expect(button).toHaveClass('hover:text-primary')
    })

    it('should have transition class on content wrapper', () => {
      const { container } = render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={false} 
          onToggle={() => {}}
        >
          <div>Content</div>
        </CollapsibleSection>
      )

      const contentDiv = container.querySelector('section > div:last-child')
      expect(contentDiv).toHaveClass('transition-all')
      expect(contentDiv).toHaveClass('duration-200')
    })
  })

  describe('complex children', () => {
    it('should render multiple children', () => {
      render(
        <CollapsibleSection 
          title="Test" 
          isCollapsed={false} 
          onToggle={() => {}}
        >
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </CollapsibleSection>
      )

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
      expect(screen.getByText('Child 3')).toBeInTheDocument()
    })

    it('should render nested components', () => {
      render(
        <CollapsibleSection 
          title="Parent" 
          isCollapsed={false} 
          onToggle={() => {}}
        >
          <div>
            <span>Nested content</span>
            <button>Nested button</button>
          </div>
        </CollapsibleSection>
      )

      expect(screen.getByText('Nested content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Nested button' })).toBeInTheDocument()
    })
  })
})
