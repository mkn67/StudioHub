<?php

declare(strict_types=1);

namespace App\Core;

use App\Exceptions\ApiException;
use FastRoute\Dispatcher;
use FastRoute\RouteCollector;
use function FastRoute\simpleDispatcher;

class Router
{
    private array $routes = [];
    private array $globalMiddlewares = [];

    public function use(callable|object $middleware): self
    {
        $this->globalMiddlewares[] = $middleware;
        return $this;
    }

    public function addRoute(string $method, string $uri, callable|array $handler, array $middlewares = []): self
    {
        $this->routes[] = [
            'method'      => strtoupper($method),
            'uri'         => $uri,
            'handler'     => $handler,
            'middlewares' => $middlewares,
        ];
        return $this;
    }

    public function get(string $uri, callable|array $handler, array $middlewares = []): self
    {
        return $this->addRoute('GET', $uri, $handler, $middlewares);
    }

    public function post(string $uri, callable|array $handler, array $middlewares = []): self
    {
        return $this->addRoute('POST', $uri, $handler, $middlewares);
    }

    public function patch(string $uri, callable|array $handler, array $middlewares = []): self
    {
        return $this->addRoute('PATCH', $uri, $handler, $middlewares);
    }

    public function put(string $uri, callable|array $handler, array $middlewares = []): self
    {
        return $this->addRoute('PUT', $uri, $handler, $middlewares);
    }

    public function delete(string $uri, callable|array $handler, array $middlewares = []): self
    {
        return $this->addRoute('DELETE', $uri, $handler, $middlewares);
    }

    /**
     * Dispatch the request through FastRoute and middleware pipeline
     *
     * @param Request $request
     * @return mixed
     * @throws ApiException
     */
    public function dispatch(Request $request): mixed
    {
        $dispatcher = simpleDispatcher(function (RouteCollector $r) {
            foreach ($this->routes as $index => $route) {
                $r->addRoute($route['method'], $route['uri'], $index);
            }
        });

        $routeInfo = $dispatcher->dispatch($request->method(), $request->uri());

        switch ($routeInfo[0]) {
            case Dispatcher::NOT_FOUND:
                throw new ApiException(404, 'not_found', 'Tuyến đường không tồn tại');

            case Dispatcher::METHOD_NOT_ALLOWED:
                throw new ApiException(405, 'method_not_allowed', 'Phương thức HTTP không được hỗ trợ');

            case Dispatcher::FOUND:
                $routeIndex = $routeInfo[1];
                $vars = $routeInfo[2];
                $matchedRoute = $this->routes[$routeIndex];

                // Build pipeline: global middlewares -> route middlewares -> handler
                $pipeline = new Pipeline();
                foreach ($this->globalMiddlewares as $mw) {
                    $pipeline->pipe($mw);
                }
                foreach ($matchedRoute['middlewares'] as $mw) {
                    $pipeline->pipe($mw);
                }

                $handler = $matchedRoute['handler'];

                return $pipeline->process($request, function (Request $req) use ($handler, $vars) {
                    if (is_array($handler)) {
                        [$class, $method] = $handler;
                        $controller = is_object($class) ? $class : new $class();
                        return $controller->$method($req, $vars);
                    }
                    return $handler($req, $vars);
                });
        }
    }
}

