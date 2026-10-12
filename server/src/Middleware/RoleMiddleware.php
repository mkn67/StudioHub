<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Core\Request;
use App\Exceptions\ApiException;

class RoleMiddleware
{
    private array $allowedRoles;

    /**
     * @param string|array $allowedRoles E.g. 'host' or ['admin', 'host']
     */
    public function __construct(string|array $allowedRoles)
    {
        $this->allowedRoles = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];
    }

    /**
     * Ensure current authenticated user has one of the allowed roles
     *
     * @param Request $request
     * @param callable $next
     * @return mixed
     * @throws ApiException
     */
    public function handle(Request $request, callable $next): mixed
    {
        $user = $request->user();

        if (!$user) {
            throw new ApiException(
                401,
                'unauthorized',
                'Yêu cầu đăng nhập để truy cập tài nguyên này'
            );
        }

        $userRole = (string) ($user['role'] ?? '');

        if (!in_array($userRole, $this->allowedRoles, true)) {
            $required = implode(', ', $this->allowedRoles);
            throw new ApiException(
                403,
                'forbidden',
                'Bạn không có quyền thực hiện hành động này',
                [
                    [
                        'field'   => 'role',
                        'code'    => 'insufficient_permissions',
                        'message' => "Hành động yêu cầu quyền: {$required}. Quyền hiện tại của bạn: {$userRole}",
                    ]
                ]
            );
        }

        return $next($request);
    }
}

