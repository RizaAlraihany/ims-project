<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request, AuditService $auditService): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Audit logs retrieved.',
            'data' => $auditService->list($request),
        ]);
    }
}
