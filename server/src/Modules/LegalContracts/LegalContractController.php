<?php
declare(strict_types=1);
namespace App\Modules\LegalContracts;
use App\Core\ApiResponse;
use App\Core\Request;
use App\Exceptions\ApiException;
class LegalContractController
{
    private LegalContractService $service;
    public function __construct(?LegalContractService $service = null) { $this->service = $service ?? new LegalContractService(); }
    public function legalProfile(Request $request): void
    {
        ApiResponse::ok($this->service->legalProfile((int) $request->user()['user_id']), 'Lấy hồ sơ pháp lý thành công');
    }
    public function updateLegalProfile(Request $request): void
    {
        ApiResponse::ok($this->service->updateLegalProfile((int) $request->user()['user_id'], $request->body()), 'Lưu hồ sơ pháp lý thành công');
    }
    public function adminLegalProfiles(Request $request): void
    {
        ApiResponse::ok($this->service->listLegalProfiles($request->query()), 'Lấy danh sách hồ sơ pháp lý thành công');
    }
    public function decideLegalProfile(Request $request, array $vars): void
    {
        $body = $request->body();
        if (!isset($body['verified']) || !is_bool($body['verified'])) throw new ApiException(400, 'invalid_decision', 'verified phải là true hoặc false');
        ApiResponse::ok($this->service->decideLegalProfile((int) $vars['id'], (int) $request->user()['user_id'], $body['verified'], (string) ($body['reason'] ?? '')), 'Đã xử lý hồ sơ pháp lý');
    }
    public function contracts(Request $request): void
    {
        ApiResponse::ok($this->service->listContracts((int) $request->user()['user_id']), 'Lấy danh sách hợp đồng thành công');
    }
    public function contract(Request $request, array $vars): void
    {
        ApiResponse::ok($this->service->contract((int) $request->user()['user_id'], (int) $vars['id']), 'Lấy chi tiết hợp đồng thành công');
    }
    public function grantDocumentAccess(Request $request, array $vars): void
    {
        ApiResponse::created($this->service->grantDocumentAccess((int) $request->user()['user_id'], (int) $vars['id']), 'Đã cấp quyền xem tài liệu một lần trong 5 phút');
    }
    public function downloadDocument(Request $request, array $vars): never
    {
        $file = $this->service->redeemDocument((int) $request->user()['user_id'], (int) $vars['id'], (string) $vars['token']);
        header('Content-Type: application/pdf');
        header('Content-Length: ' . filesize($file['path']));
        header('Content-Disposition: attachment; filename="contract.pdf"; filename*=UTF-8\'\'' . rawurlencode((string) $file['name']));
        header('Cache-Control: private, no-store, max-age=0');
        header('X-Content-Type-Options: nosniff');
        readfile($file['path']);
        exit;
    }
    public function createContract(Request $request, array $vars): void
    {
        $file = $_FILES['document'] ?? [];
        if (!$file) throw new ApiException(400, 'missing_file', 'Vui lòng gửi file PDF trong trường document');
        ApiResponse::created($this->service->createContract((int) $request->user()['user_id'], (int) $vars['studio_id'], $request->body(), $file), 'Tạo hồ sơ hợp đồng thành công');
    }
}
