<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;

class TransferStoreRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (!$this->filled('dest_warehouse_id') && $this->filled('destination_warehouse_id')) {
            $this->merge([
                'dest_warehouse_id' => $this->input('destination_warehouse_id'),
            ]);
        }
    }

    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('transfer.create') ?? false;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'source_warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
            'dest_warehouse_id' => ['required', 'integer', 'exists:warehouses,id', 'different:source_warehouse_id'],
            'transfer_no' => ['nullable', 'string', 'max:255', 'unique:transfers,transfer_no'],
            'notes' => ['nullable', 'string'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'integer', 'exists:products,id', 'distinct'],
            'items.*.quantity' => ['required', 'integer', 'min:1'],
        ];
    }
}
