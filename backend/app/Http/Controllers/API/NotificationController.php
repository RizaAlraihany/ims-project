<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request, NotificationService $notificationService): JsonResponse
    {
        $notificationService->syncLowStock($request->filled('warehouse_id') ? $request->integer('warehouse_id') : null);

        return response()->json([
            'success' => true,
            'message' => 'Notifications retrieved.',
            'data' => $notificationService->list($request),
        ]);
    }

    public function markAsRead(Notification $notification, Request $request, NotificationService $notificationService): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
            'data' => $notificationService->markAsRead($notification, $request->user()),
        ]);
    }
}
