<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CategoryRequest extends FormRequest
{
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
        $categoryId = $this->route('category')?->id;
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:100', Rule::unique('categories', 'name')->ignore($categoryId)],
            'description' => ['nullable', 'string'],
        ];
    }
}
