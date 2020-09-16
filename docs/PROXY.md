While hosting a trading post, you might need to set up a reverse proxy.

## Nginx

You can find the official docs for setting up a reverse proxy at https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/

Install `nginx` on a Ubuntu server

```shell script
sudo apt-get update
sudo apt-get install nginx
```

> You can confirm your nginx installation using `nginx -v`

**Adding your domain**

First, create a Nginx virtual host configuration using the follwing command:

```shell script
sudo touch /etc/nginx/sites-available/YOUR-DOMAIN
```

> Be sure to replace YOUR-DOMAIN with the domain you plan to associate with the trading post.

**Create nginx configuration**

Next, we setup our nginx configuration by editing the file that we just created.

```shell script
sudo nano /etc/nginx/sites-available/YOUR-DOMAIN
```

> You can either use `vim` or `nano` as your text editor

You can now paste the following configuration:

```nginx
server {
  listen 80;
  listen [::]:80;
  server_name YOUR-DOMAIN;

  location ^~ /.well-known/acme-challenge {
    default_type text/plain;
    root /path/to/letsencrypt/challenge;
  }

  location / {
    return 301 https://$host$request_uri;
  }
}
server {
  listen 443 ssl http2;
  listen [::]:443 ssl http2;
  server_name YOUR-DOMAIN;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  ssl_trusted_certificate /path/to/ca.pem;
  ssl_dhparam /path/to/dhparams.pem;

  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
  ssl_ecdh_curve prime256v1:secp384r1;
  ssl_prefer_server_ciphers on;

  add_header Strict-Transport-Security "max-age=63072000; preload;" always;

  ssl_stapling on;
  ssl_stapling_verify on;

  resolver 1.1.1.1;

  ssl_session_timeout 24h;
  ssl_session_cache shared:SSL:50m;
  ssl_session_tickets off;

  access_log /var/log/nginx/access.log;

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://localhost:8080;
    # change this to the port where the trading post is running
    proxy_read_timeout 90;
  }
}
```

> SSL is compulsory otherwise CORS for the trading post API will be blocked. You can easily generate SSL certificates using Let's Encrypt and specify the certificate file and key in the above configuration

**Be sure to replace YOUR-DOMAIN with your actual domain and make sure your trading post is running at port 8080.**

Save the file and proceed to the final step.

**Start nginx**

Before starting nginx, we will need to link the file in the `sites-available` folder to a location within the `sites-enabled` folder.

Again, change YOUR-DOMAIN here with the actual name of the file you created earlier.

```shell script
ln -s /etc/nginx/sites-avaialable/YOUR-DOMAIN /etc/nginx/sites-enabled/YOUR-DOMAIN.conf
```

Let’s now test the configuration file.

```shell script
sudo nginx -t
```

If the test is successful, you’ll see this output:

```bash
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Now that we know it’s going to work as expected, issue the command to restart the Nginx service

```shell script
sudo systemctl restart nginx

# OR #

sudo service nginx restart
```

Both commands perform the same task, simply preference decides your method here.

Congratulations! You should now be able to launch your trading post (if it wasn’t running already) and visit `YOUR-DOMAIN` in a browser, assuming the DNS is correct. :smile:
