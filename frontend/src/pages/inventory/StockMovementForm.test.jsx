import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LanguageProvider from '@/hooks/LanguageProvider'
import StockMovementForm from '@/pages/inventory/StockMovementForm'
import { movementsApi } from '@/api/movements'
import { productsApi } from '@/api/products'
import { warehousesApi } from '@/api/warehouses'

vi.mock('@/api/inventory', () => ({
  inventoryApi: {
    list: vi.fn(),
  },
}))

vi.mock('@/api/movements', () => ({
  movementsApi: {
    stockIn: vi.fn(),
    stockOut: vi.fn(),
  },
}))

vi.mock('@/api/products', () => ({
  productsApi: {
    list: vi.fn(),
  },
}))

vi.mock('@/api/warehouses', () => ({
  warehousesApi: {
    list: vi.fn(),
  },
}))

function renderForm() {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <StockMovementForm mode="in" />
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('StockMovementForm validation', () => {
  beforeEach(() => {
    window.localStorage.setItem('ims_language', 'en')
    productsApi.list.mockResolvedValue({
      data: {
        data: [{ id: 7, sku: 'SKU-001', name: 'Kabel Scanner' }],
      },
    })
    warehousesApi.list.mockResolvedValue({
      data: {
        data: [{ id: 3, code: 'WH-A', name: 'Gudang A' }],
      },
    })
    movementsApi.stockIn.mockResolvedValue({ data: { success: true } })
  })

  it('shows client validation and requires confirmation before stock in submit', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: /save stock in/i }))

    expect(screen.getByText('Produk, gudang, dan kuantitas wajib diisi.')).toBeInTheDocument()
    expect(movementsApi.stockIn).not.toHaveBeenCalled()

    await user.selectOptions(await screen.findByLabelText('Produk'), '7')
    await user.selectOptions(screen.getByLabelText('Gudang'), '3')
    await user.type(screen.getByLabelText('Quantity'), '12')
    await user.type(screen.getByLabelText('Unit Cost'), '45000')
    await user.click(screen.getByRole('button', { name: /save stock in/i }))

    expect(screen.getByText('Confirm Stock In')).toBeInTheDocument()
    expect(movementsApi.stockIn).not.toHaveBeenCalled()

    const confirmButtons = screen.getAllByRole('button', { name: 'Save Stock In' })
    await user.click(confirmButtons[confirmButtons.length - 1])

    await waitFor(() => {
      expect(movementsApi.stockIn).toHaveBeenCalledWith({
        location_bin: undefined,
        product_id: 7,
        quantity: 12,
        received_date: undefined,
        reference_no: undefined,
        unit_cost: 45000,
        warehouse_id: 3,
      })
    })
  })
})
