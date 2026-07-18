import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '../../../../test/test-utils'
import { AiStudioTierDialog } from '../common/AiStudioTierDialog'

describe('AiStudioTierDialog', () => {
  it('saves one of the paid tiers from the dialog select', async () => {
    const onClose = vi.fn()
    const onSave = vi.fn().mockResolvedValue(true)
    render(
      <AiStudioTierDialog
        isOpen
        currentTier="tier1"
        onClose={onClose}
        onSave={onSave}
      />
    )

    const dialog = screen.getByRole('dialog')
    const select = screen.getByRole('combobox', { name: 'aiStudio.tierSettings.label' })
    fireEvent.keyDown(select, { key: 'ArrowDown' })

    expect(within(dialog).getAllByRole('option')).toHaveLength(3)
    expect(screen.queryByRole('option', { name: 'aiStudio.tiers.free' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: 'aiStudio.tiers.tier3' }))
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('tier3')
      expect(onClose).toHaveBeenCalled()
    })
  })
})
