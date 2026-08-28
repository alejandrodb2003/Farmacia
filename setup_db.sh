#!/bin/bash
sudo mysql -e "CREATE DATABASE IF NOT EXISTS pharmashare;"
sudo mysql -e "CREATE USER IF NOT EXISTS 'pharmashare'@'localhost' IDENTIFIED BY 'PharmaShare2026!';"
sudo mysql -e "GRANT ALL PRIVILEGES ON pharmashare.* TO 'pharmashare'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
echo "Database created successfully"
