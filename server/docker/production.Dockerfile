FROM php:8.2-apache-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends libzip-dev libonig-dev unzip \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql zip mbstring \
    && rm -rf /var/lib/apt/lists/* \
    && a2enmod rewrite

COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && printf '%s\n' \
        'DirectoryIndex index.php' \
        '<Directory /var/www/html/public>' \
        '    Options -Indexes +FollowSymLinks' \
        '    AllowOverride All' \
        '    Require all granted' \
        '</Directory>' > /etc/apache2/conf-available/studiohub.conf \
    && a2enconf studiohub

WORKDIR /var/www/html
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-autoloader --no-interaction --prefer-dist --no-progress

COPY . .
RUN composer dump-autoload --no-dev --optimize \
    && mkdir -p public/uploads storage \
    && chown -R www-data:www-data public/uploads storage

RUN cp "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    && printf '%s\n' \
        'date.timezone=Asia/Ho_Chi_Minh' \
        'display_errors=Off' \
        'log_errors=On' \
        'upload_max_filesize=8M' \
        'post_max_size=10M' \
        > "$PHP_INI_DIR/conf.d/studiohub.ini"

EXPOSE 80
CMD ["apache2-foreground"]
