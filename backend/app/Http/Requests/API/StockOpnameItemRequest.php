<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;

class StockOpnameItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, list<string>>
     */
    public function rules(): array
    {
        return [
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'physical_qty' => ['required', 'integer', 'min:0'],
        ];
    }
}
