<?php
declare(strict_types=1);
namespace StudioHub\Helpdesk\LLM;
interface LanguageModel
{
    public function complete(array $messages, array $tools, float $deadline, mixed $toolChoice = 'auto'): array;
}
