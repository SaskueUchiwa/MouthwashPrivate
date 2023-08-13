# https://github.com/nvm-sh/nvm#install--update-script
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20.5.1
npm install -g yarn

sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo apt-get install -y nginx

yarn
yarn build-all

mkdir -p data/prometheus
mkdir -p data/pg

chown 65534:65534 data/prometheus

rm /etc/nginx/sites-enabled/default
echo "server {
    listen 80;
    listen [::]:80;

    server_name accounts.mouthwash.midlight.studio;

    location / {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass http://localhost:8000;
    }
}" > /etc/nginx/sites-enabled/accounts
service nginx restart

apt-get install -y certbot
apt install python3-certbot-nginx
certbot --nginx --non-interactive --agree-tos -m edward@midlight.studio --cert-name mouthwash_accounts -d accounts.mouthwash.midlight.studio;