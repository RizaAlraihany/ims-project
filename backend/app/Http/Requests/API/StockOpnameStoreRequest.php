<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;

class StockOpnameStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('opname.create') ?? false;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'warehouse_id' => ['required', 'integer', 'exists:warehouses,id'],
        ];
    }
}
