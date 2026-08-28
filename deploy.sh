#!/bin/bash
set -e

echo "Unzipping deploy.zip to /var/www/farmacia.adbtech.com.ar"
sudo mkdir -p /var/www/farmacia.adbtech.com.ar
sudo unzip -o /tmp/deploy.zip -d /var/www/farmacia.adbtech.com.ar
sudo chown -R $USER:$USER /var/www/farmacia.adbtech.com.ar

cd /var/www/farmacia.adbtech.com.ar/backend
echo "Setting up backend..."
npm install --omit=dev
npm i -g ts-node typescript
# Create .env file for production
echo "DATABASE_URL=\"mysql://pharmashare:PharmaShare2026!@localhost:3306/pharmashare\"" > .env
echo "JWT_SECRET=\"prod-super-secret-key-999\"" >> .env
echo "NODE_ENV=\"production\"" >> .env

npx prisma generate
npx prisma db push --accept-data-loss
npx ts-node prisma/seed.ts

cd ../frontend
echo "Setting up frontend..."
npm install --omit=dev
# PM2 ecosystem config
cat << 'EOF' > ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "farmacia-backend",
      script: "npx",
      args: "ts-node src/index.ts",
      cwd: "/var/www/farmacia.adbtech.com.ar/backend",
      env: { NODE_ENV: "production" }
    },
    {
      name: "farmacia-frontend",
      script: "npm",
      args: "start",
      cwd: "/var/www/farmacia.adbtech.com.ar/frontend",
      env: { NODE_ENV: "production", PORT: 3000 }
    }
  ]
};
EOF

echo "Starting with PM2..."
cd /var/www/farmacia.adbtech.com.ar
pm2 start frontend/ecosystem.config.js
pm2 save

echo "Configuring Nginx..."
sudo bash -c 'cat << "EOF" > /etc/nginx/sites-available/farmacia.adbtech.com.ar
server {
    listen 80;
    server_name farmacia.adbtech.com.ar;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/api/;
        proxy_set_header Host $host;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF'

sudo ln -sf /etc/nginx/sites-available/farmacia.adbtech.com.ar /etc/nginx/sites-enabled/
sudo systemctl reload nginx
echo "Deployment successful!"
