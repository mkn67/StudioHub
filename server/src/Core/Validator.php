<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\ApiException;
use DateTime;

class Validator
{
    /**
     * Validate an associative array against validation rules
     *
     * @param array $data Input data
     * @param array<string, string|array> $rules Rules (e.g. ['email' => 'required|email', 'age' => 'int|min:18'])
     * @return array<int, array{field: string, code: string, message: string}>
     */
    public static function validate(array $data, array $rules): array
    {
        $errors = [];

        foreach ($rules as $field => $fieldRules) {
            $ruleList = is_array($fieldRules) ? $fieldRules : explode('|', (string) $fieldRules);
            $value = $data[$field] ?? null;
            $hasField = array_key_exists($field, $data);

            foreach ($ruleList as $rule) {
                $rule = trim($rule);
                if ($rule === '') {
                    continue;
                }

                $params = [];
                if (str_contains($rule, ':')) {
                    [$ruleName, $paramStr] = explode(':', $rule, 2);
                    $params = explode(',', $paramStr);
                } else {
                    $ruleName = $rule;
                }

                // Required check
                if ($ruleName === 'required') {
                    if (!$hasField || $value === null || $value === '') {
                        $errors[] = [
                            'field'   => $field,
                            'code'    => 'required',
                            'message' => "Trường {$field} là bắt buộc",
                        ];
                        break; // Stop further checks on this field if missing
                    }
                    continue;
                }

                // If field is missing or null and not required, skip other validations
                if (!$hasField || $value === null || $value === '') {
                    continue;
                }

                switch ($ruleName) {
                    case 'email':
                        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
                            $errors[] = [
                                'field'   => $field,
                                'code'    => 'invalid_email',
                                'message' => "Trường {$field} không phải email hợp lệ",
                            ];
                        }
                        break;

                    case 'int':
                    case 'integer':
                        if (!is_int($value) && !ctype_digit((string) $value)) {
                            $errors[] = [
                                'field'   => $field,
                                'code'    => 'invalid_integer',
                                'message' => "Trường {$field} phải là số nguyên",
                            ];
                        }
                        break;

                    case 'numeric':
                        if (!is_numeric($value)) {
                            $errors[] = [
                                'field'   => $field,
                                'code'    => 'invalid_numeric',
                                'message' => "Trường {$field} phải là dạng số",
                            ];
                        }
                        break;

                    case 'min':
                        $min = (float) ($params[0] ?? 0);
                        if (is_numeric($value)) {
                            if ((float) $value < $min) {
                                $errors[] = [
                                    'field'   => $field,
                                    'code'    => 'min_value',
                                    'message' => "Trường {$field} phải có giá trị tối thiểu là {$min}",
                                ];
                            }
                        } elseif (is_string($value)) {
                            if (mb_strlen($value) < (int) $min) {
                                $errors[] = [
                                    'field'   => $field,
                                    'code'    => 'min_length',
                                    'message' => "Trường {$field} phải có độ dài tối thiểu là {$min} ký tự",
                                ];
                            }
                        }
                        break;

                    case 'max':
                        $max = (float) ($params[0] ?? 0);
                        if (is_numeric($value)) {
                            if ((float) $value > $max) {
                                $errors[] = [
                                    'field'   => $field,
                                    'code'    => 'max_value',
                                    'message' => "Trường {$field} phải có giá trị tối đa là {$max}",
                                ];
                            }
                        } elseif (is_string($value)) {
                            if (mb_strlen($value) > (int) $max) {
                                $errors[] = [
                                    'field'   => $field,
                                    'code'    => 'max_length',
                                    'message' => "Trường {$field} không được vượt quá {$max} ký tự",
                                ];
                            }
                        }
                        break;

                    case 'in':
                        if (!in_array((string) $value, $params, true)) {
                            $allowed = implode(', ', $params);
                            $errors[] = [
                                'field'   => $field,
                                'code'    => 'invalid_choice',
                                'message' => "Trường {$field} phải là một trong: {$allowed}",
                            ];
                        }
                        break;

                    case 'datetime':
                        $d = DateTime::createFromFormat('Y-m-d H:i:s', (string) $value);
                        if (!($d && $d->format('Y-m-d H:i:s') === $value)) {
                            $errors[] = [
                                'field'   => $field,
                                'code'    => 'invalid_datetime',
                                'message' => "Trường {$field} phải có định dạng YYYY-MM-DD HH:mm:ss",
                            ];
                        }
                        break;

                    case 'date':
                        $d = DateTime::createFromFormat('Y-m-d', (string) $value);
                        if (!($d && $d->format('Y-m-d') === $value)) {
                            $errors[] = [
                                'field'   => $field,
                                'code'    => 'invalid_date',
                                'message' => "Trường {$field} phải có định dạng YYYY-MM-DD",
                            ];
                        }
                        break;

                    case 'array':
                        if (!is_array($value)) {
                            $errors[] = [
                                'field'   => $field,
                                'code'    => 'invalid_array',
                                'message' => "Trường {$field} phải là dạng mảng",
                            ];
                        }
                        break;
                }
            }
        }

        return $errors;
    }

    /**
     * Assert data is valid or throw 400 ApiException
     *
     * @param array $data
     * @param array $rules
     * @throws ApiException
     */
    public static function assertValid(array $data, array $rules): void
    {
        $errors = self::validate($data, $rules);
        if (!empty($errors)) {
            throw new ApiException(400, 'validation_failed', 'Dữ liệu đầu vào không hợp lệ', $errors);
        }
    }
}
