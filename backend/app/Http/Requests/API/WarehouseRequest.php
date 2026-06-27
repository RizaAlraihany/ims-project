<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class WarehouseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $warehouseId = $this->route('warehouse')?->id;
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'code' => [$required, 'string', 'max:255', Rule::unique('warehouses', 'code')->ignore($warehouseId)],
            'name' => [$required, 'string', 'max:255', Rule::unique('warehouses', 'name')->ignore($warehouseId)],
            'address' => ['nullable', 'string'],
            'manager_name' => ['nullable', 'string', 'max:150'],
            'status' => ['sometimes', 'boolean'],
            'location' => ['nullable', 'string', 'max:255'],
        ];
    }
}
