<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class AuditService
{
    /**
     * @param  array<string, mixed>|null  $oldValues
     * @param  array<string, mixed>|null  $newValues
     */
    public function log(?User $user, string $action, ?string $tableName = null, ?int $recordId = null, ?array $oldValues = null, ?array $newValues = null, ?string $ipAddress = null): AuditLog
    {
        return AuditLog::create([
            'user_id' => $user?->id,
            'action' => $action,
            'table_name' => $tableName,
            'record_id' => $recordId,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => $ipAddress,
            'created_at' => now(),
        ]);
    }

    public function logRequest(Request $request, string $action, ?string $tableName = null, ?int $recordId = null): AuditLog
    {
        return $this->log(
            $request->user(),
            $action,
            $tableName,
            $recordId,
            null,
            $this->safePayload($request),
            $request->ip(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function list(Request $request): array
    {
        $query = AuditLog::query()
            ->with('user')
            ->when($request->filled('user_id'), fn (Builder $query) => $query->where('user_id', $request->integer('user_id')))
            ->when($request->filled('action'), fn (Builder $query) => $query->where('action', $request->string('action')->toString()))
            ->when($request->filled('date_from'), fn (Builder $query) => $query->whereDate('created_at', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn (Builder $query) => $query->whereDate('created_at', '<=', $request->date('date_to')));

        $summaryQuery = clone $query;
        $paginator = $query->latest('created_at')->paginate($request->integer('per_page', 20));

        return [
            'items' => collect($paginator->items())->map(fn (AuditLog $auditLog): array => $this->row($auditLog))->values(),
            'pagination' => $this->pagination($paginator),
            'summary' => [
                'total_rows' => (clone $summaryQuery)->count(),
                'login_count' => (clone $summaryQuery)->where('action', 'LOGIN')->count(),
                'mutation_count' => (clone $summaryQuery)->whereNotIn('action', ['LOGIN', 'LOGOUT'])->count(),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function row(AuditLog $auditLog): array
    {
        return [
            'id' => $auditLog->id,
            'user' => $auditLog->user?->name,
            'user_id' => $auditLog->user_id,
            'action' => $auditLog->action,
            'table_name' => $auditLog->table_name,
            'record_id' => $auditLog->record_id,
            'old_values' => $auditLog->old_values,
            'new_values' => $auditLog->new_values,
            'ip_address' => $auditLog->ip_address,
            'created_at' => $auditLog->created_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function safePayload(Request $request): array
    {
        $payload = $request->except(['password', 'password_confirmation', 'token', 'file']);

        foreach ($request->files->all() as $key => $file) {
            $payload[$key] = is_array($file) ? 'uploaded_files' : $file->getClientOriginalName();
        }

        return $payload;
    }

    /**
     * @return array<string, int>
     */
    private function pagination(LengthAwarePaginator $paginator): array
    {
        return [
            'current_page' => $paginator->currentPage(),
            'per_page' => $paginator->perPage(),
            'last_page' => $paginator->lastPage(),
            'total' => $paginator->total(),
        ];
    }
}
