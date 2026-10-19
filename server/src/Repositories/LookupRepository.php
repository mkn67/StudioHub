<?php

declare(strict_types=1);

namespace App\Repositories;

use App\Core\Db;
use PDO;

class LookupRepository
{
    private PDO $pdo;

    public function __construct(?PDO $pdo = null)
    {
        $this->pdo = $pdo ?? Db::getConnection();
    }

    /**
     * Get all space types.
     *
     * @return array<int, array{space_type_id: int, name: string, description: ?string}>
     */
    public function getSpaceTypes(): array
    {
        $stmt = $this->pdo->query('
            SELECT space_type_id, name, description
            FROM space_types
            ORDER BY space_type_id ASC
        ');

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get all amenities.
     *
     * @return array<int, array{amenity_id: int, name: string, icon: ?string}>
     */
    public function getAmenities(): array
    {
        $stmt = $this->pdo->query('
            SELECT amenity_id, name, icon
            FROM amenities
            ORDER BY amenity_id ASC
        ');

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}

