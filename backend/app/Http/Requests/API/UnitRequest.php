<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnitRequest extends FormRequest
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
        $unitId = $this->route('unit')?->id;
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:50', Rule::unique('units', 'name')->ignore($unitId)],
            'symbol' => [$required, 'string', 'max:20', Rule::unique('units', 'symbol')->ignore($unitId)],
        ];
    }
}
