<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $costMethod = $this->input('cost_method');
        $valuationMethod = $this->input('valuation_method');

        if ($costMethod && ! $valuationMethod) {
            $this->merge([
                'valuation_method' => strtolower((string) $costMethod),
            ]);
        }

        if ($valuationMethod && ! $costMethod) {
            $this->merge([
                'cost_method' => strtoupper((string) $valuationMethod),
            ]);
        }
    }

    public function authorize(): bool
    {
        $permission = match (true) {
            $this->isMethod('post') => 'product.create',
            $this->isMethod('put'), $this->isMethod('patch') => 'product.update',
            default => null,
        };

        return $permission !== null && ($this->user()?->hasPermissionTo($permission) ?? false);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        $productId = $this->route('product')?->id;
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'category_id' => [$required, 'integer', 'exists:categories,id'],
            'unit_id' => [$required, 'integer', 'exists:units,id'],
            'sku' => [$required, 'string', 'max:255', Rule::unique('products', 'sku')->ignore($productId)],
            'barcode' => ['nullable', 'string', 'max:255', Rule::unique('products', 'barcode')->ignore($productId)],
            'name' => [$required, 'string', 'max:255'],
            'minimum_stock' => [$required, 'numeric', 'min:0'],
            'average_cost' => ['sometimes', 'numeric', 'min:0'],
            'cost_method' => [$required, Rule::in(['FIFO', 'AVERAGE'])],
            'status' => ['sometimes', 'boolean'],
            'valuation_method' => [$required, Rule::in(['average', 'fifo'])],
            'unit' => ['sometimes', 'string', 'max:30'],
        ];
    }
}
