<?php

namespace App\Http\Requests\API;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SettingsUpdateRequest extends FormRequest
{
    private const GENERAL_KEYS = [
        'app.name',
        'app.timezone',
        'app.default_language',
        'company.name',
        'company.email',
        'company.phone',
        'inventory.cost_method',
        'inventory.low_stock_alert',
        'inventory.allow_negative_stock',
        'notification.email',
        'notification.low_stock',
        'notification.transfer',
    ];

    private const SENSITIVE_KEYS = [
        'security.session_timeout_minutes',
        'security.password_min_length',
        'security.force_2fa',
        'backup.enabled',
        'backup.schedule',
        'backup.retention_days',
        'api.rate_limit_per_minute',
        'api.webhook_url',
        'api.token_rotation_days',
    ];

    public function authorize(): bool
    {
        return $this->user()?->hasPermissionTo('setting.update') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'settings' => ['required', 'array'],
            'settings.*.key' => ['required', 'string', 'max:100', Rule::in($this->allowedKeys())],
            'settings.*.value' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return list<string>
     */
    private function allowedKeys(): array
    {
        $keys = self::GENERAL_KEYS;

        if ($this->user()?->roleRecord?->name === 'Super Admin') {
            $keys = array_merge($keys, self::SENSITIVE_KEYS);
        }

        return $keys;
    }
}
