FROM php:8.2-apache

# Install PHP PDO MySQL extension (using built-in mysqlnd driver)
RUN docker-php-ext-install pdo pdo_mysql

# Enable Apache mod_rewrite for RESTful routing
RUN a2enmod rewrite

# Configure Apache DocumentRoot to point to /var/www/html/public
ENV APACHE_DOCUMENT_ROOT=/var/www/html/public

RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf

# Configure Apache to allow .htaccess overrides in DocumentRoot
RUN printf '%s\n' \
    'DirectoryIndex index.php' \
    '<Directory /var/www/html/public>' \
    '    Options -Indexes +FollowSymLinks' \
    '    AllowOverride All' \
    '    Require all granted' \
    '</Directory>' > /etc/apache2/conf-available/override.conf \
    && a2enconf override

WORKDIR /var/www/html

EXPOSE 80

CMD ["apache2-foreground"]
