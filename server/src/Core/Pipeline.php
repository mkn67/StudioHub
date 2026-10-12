<?php

declare(strict_types=1);

namespace App\Core;

class Pipeline
{
    private array $middlewares = [];

    public function pipe(callable|object $middleware): self
    {
        $this->middlewares[] = $middleware;
        return $this;
    }

    /**
     * Run the request through the middleware pipeline and invoke destination
     *
     * @param Request $request
     * @param callable $destination
     * @return mixed
     */
    public function process(Request $request, callable $destination): mixed
    {
        $pipeline = array_reduce(
            array_reverse($this->middlewares),
            function (callable $next, callable|object $middleware) {
                return function (Request $req) use ($middleware, $next) {
                    if (is_object($middleware) && method_exists($middleware, 'handle')) {
                        return $middleware->handle($req, $next);
                    }
                    if (is_callable($middleware)) {
                        return $middleware($req, $next);
                    }
                    return $next($req);
                };
            },
            $destination
        );

        return $pipeline($request);
    }
}

