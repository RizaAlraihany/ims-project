<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;

class StockInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('stock_in.create') ?? false;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'quantity' => ['required', 'integer', 'min:1'],
            'unit_cost' => ['required', 'numeric', 'min:0'],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'location_bin' => ['nullable', 'string', 'max:255'],
            'received_date' => ['nullable', 'date'],
        ];
    }
}
