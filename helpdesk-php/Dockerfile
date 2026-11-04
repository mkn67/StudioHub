# syntax=docker/dockerfile:1
# Build from the repository root:
# docker build -f helpdesk-php/Dockerfile -t studiohub-helpdesk .
FROM php:8.2-apache-bookworm

# Composer is not required: bootstrap.php provides the project's autoloader.
# JSON, PDO and iconv are provided by the base image; build the other drivers.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libcurl4-openssl-dev \
        libonig-dev \
        libsqlite3-dev \
    && docker-php-ext-install -j"$(nproc)" curl mbstring pdo_mysql pdo_sqlite opcache \
    && rm -rf /var/lib/apt/lists/* \
    && cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && printf '%s\n' \
        'date.timezone=Asia/Ho_Chi_Minh' \
        'display_errors=Off' \
        'log_errors=On' \
        'max_execution_time=90' \
        > "$PHP_INI_DIR/conf.d/studiohub.ini"

WORKDIR /app/helpdesk-php
COPY helpdesk-php/bootstrap.php helpdesk-php/composer.json ./
COPY helpdesk-php/src/ ./src/
COPY helpdesk-php/public/ ./public/
COPY helpdesk-php/config/ ./config/
COPY helpdesk-php/database/ ./database/
COPY helpdesk-php/bin/*.php ./bin/

# Preserve the relative paths used by retrieval and source hash verification.
COPY docs/helpdesk/knowledge/knowledge.v1.json /app/docs/helpdesk/knowledge/knowledge.v1.json
COPY docs/helpdesk/evaluation.v1.json /app/docs/helpdesk/evaluation.v1.json
COPY client/docs/references/StudioHub_Design_Business_Specification_v1.0.md /app/client/docs/references/StudioHub_Design_Business_Specification_v1.0.md
COPY client/docs/references/StudioHub_Business_Policy_VI_v1.1.md /app/client/docs/references/StudioHub_Business_Policy_VI_v1.1.md

COPY helpdesk-php/docker/apache.conf /etc/apache2/sites-available/000-default.conf
RUN mkdir -p var \
    && chown www-data:www-data var \
    && chmod 0770 var

ENV HELPDESK_DATABASE_URL=sqlite:var/helpdesk.sqlite \
    HELPDESK_FRONTEND_ORIGIN=http://localhost:3000
VOLUME ["/app/helpdesk-php/var"]
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD php -r '$body = @file_get_contents("http://127.0.0.1/health"); exit($body !== false && (json_decode($body, true)["status"] ?? "") === "success" ? 0 : 1);'
CMD ["apache2-foreground"]
