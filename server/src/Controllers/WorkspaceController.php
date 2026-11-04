<?php
declare(strict_types=1);
namespace App\Controllers;
use App\Core\ApiResponse;
use App\Core\Request;
use App\Core\Db;
use App\Services\WorkspaceService;

final class WorkspaceController
{
    public function catalog(Request $r): void { ApiResponse::success(Db::transaction(fn()=>(new WorkspaceService())->state())); }
    public function state(Request $r): void { ApiResponse::success(Db::transaction(fn()=>(new WorkspaceService())->state($r->user()))); }
    public function command(Request $r): void { ApiResponse::success((new WorkspaceService())->command($r->user(),$r->json(),$r->header('idempotency-key',''))); }
    public function quote(Request $r): void { ApiResponse::success(Db::transaction(fn()=>(new WorkspaceService())->quote($r->user(),$r->json()))); }
    public function report(Request $r): void { ApiResponse::success(Db::transaction(fn()=>(new WorkspaceService())->report($r->user()))); }
}
