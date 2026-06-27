<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UnitRequest extends FormRequest
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
        $unitId = $this->route('unit')?->id;
        $required = $this->isMethod('post') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:50', Rule::unique('units', 'name')->ignore($unitId)],
            'symbol' => [$required, 'string', 'max:20', Rule::unique('units', 'symbol')->ignore($unitId)],
        ];
    }
}
