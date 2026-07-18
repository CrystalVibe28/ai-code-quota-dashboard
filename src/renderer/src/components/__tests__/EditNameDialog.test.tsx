import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../../../../test/test-utils'
import { EditNameDialog } from '../common/EditNameDialog'

describe('EditNameDialog', () => {
  it('does not save when Enter is used to confirm IME input', async () => {
    const onSave = vi.fn().mockResolvedValue({ success: true })
    render(
      <EditNameDialog
        isOpen
        currentName="Old name"
        onClose={vi.fn()}
        onSave={onSave}
      />
    )
    const input = screen.getByLabelText('editName.name')

    fireEvent.change(input, { target: { value: '新名稱' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    expect(onSave).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('新名稱'))
  })
})
