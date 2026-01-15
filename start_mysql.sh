#!/bin/sh

docker run --name bulletin-mysql -e MYSQL_ROOT_PASSWORD=dev -e MYSQL_DATABASE=bulletin -p 3306:3306 -d mysql:8
