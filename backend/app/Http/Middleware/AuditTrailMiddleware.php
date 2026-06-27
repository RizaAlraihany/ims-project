<?php

namespace App\Http\Middleware;

use App\Services\AuditService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AuditTrailMiddleware
{
    public function __construct(private readonly AuditService $auditService)
    {
    }

    /**
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($this->shouldAudit($request, $response)) {
            [$action, $tableName, $recordId] = $this->auditContext($request);

            $this->auditService->logRequest($request, $action, $tableName, $recordId);
        }

        return $response;
    }

    private function shouldAudit(Request $request, Response $response): bool
    {
        if (! in_array($request->method(), ['POST', 'PUT', 'PATCH', 'DELETE'], true)) {
            return false;
        }

        if ($response->getStatusCode() < 200 || $response->getStatusCode() >= 300) {
            return false;
        }

        $resource = $this->resource($request);

        return ! in_array($resource, ['auth', 'login', 'logout', 'audit-logs', 'stock-opnames'], true);
    }

    /**
     * @return array{0: string, 1: string|null, 2: int|null}
     */
    private function auditContext(Request $request): array
    {
        $segments = $this->businessSegments($request);
        $resource = $segments[0] ?? null;
        $operation = $segments[2] ?? $segments[1] ?? null;
        $method = $request->method();

        $action = match (true) {
            $resource === 'stock-in' || ($resource === 'movements' && $operation === 'in') => 'STOCK_IN',
            $resource === 'stock-out' || ($resource === 'movements' && $operation === 'out') => 'STOCK_OUT',
            $resource === 'transfers' && $operation === 'approve' => 'TRANSFER_APPROVAL',
            $resource === 'transfers' && $operation === 'receive' => 'TRANSFER_RECEIVE',
            $resource === 'transfers' && $operation === 'reject' => 'TRANSFER_REJECT',
            $resource === 'transfers' && $method === 'POST' => 'TRANSFER_CREATE',
            $resource === 'products' && $operation === 'import' => 'PRODUCT_IMPORT',
            $method === 'POST' => 'CREATE',
            in_array($method, ['PUT', 'PATCH'], true) => 'UPDATE',
            $method === 'DELETE' => 'DELETE',
            default => 'MUTATION',
        };

        return [
            $action,
            $this->tableName($resource),
            $this->recordId($request),
        ];
    }

    private function resource(Request $request): ?string
    {
        return $this->businessSegments($request)[0] ?? null;
    }

    /**
     * @return list<string>
     */
    private function businessSegments(Request $request): array
    {
        return collect($request->segments())
            ->reject(fn (string $segment): bool => in_array($segment, ['api', 'v1'], true))
            ->values()
            ->all();
    }

    private function tableName(?string $resource): ?string
    {
        return match ($resource) {
            'stock-in', 'stock-out', 'movements' => 'stock_movements',
            'transfers' => 'transfers',
            'products' => 'products',
            'categories' => 'categories',
            'units' => 'units',
            'warehouses' => 'warehouses',
            default => $resource ? str_replace('-', '_', $resource) : null,
        };
    }

    private function recordId(Request $request): ?int
    {
        foreach ($request->route()?->parameters() ?? [] as $parameter) {
            if (is_object($parameter) && isset($parameter->id)) {
                return (int) $parameter->id;
            }

            if (is_numeric($parameter)) {
                return (int) $parameter;
            }
        }

        return null;
    }
}
