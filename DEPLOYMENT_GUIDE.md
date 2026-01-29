# Docker Deployment Guide for DMRC Wage Rates Monitoring

## 🐳 Docker Setup Complete

I've created all the necessary Docker configuration files for deploying your PHP application on Render.

## 📁 Files Created

1. **`Dockerfile`** - Main Docker configuration
2. **`.dockerignore`** - Files to exclude from Docker build
3. **`render.yaml`** - Render deployment configuration
4. **`docker-compose.yml`** - Local development setup
5. **`DEPLOYMENT_GUIDE.md`** - This guide

## 🚀 Deploy to Render

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add Docker configuration for Render deployment"
git push origin main
```

### Step 2: Create Render Service
1. Go to [render.com](https://render.com)
2. Click **"New Web Service"**
3. Connect your GitHub repository
4. **Select "Docker"** as environment
5. **Runtime**: Docker
6. **Plan**: Free (or paid)
7. **Build Command**: `echo "Building Docker image..."`
8. **Start Command**: `echo "Starting Apache server..."`
9. **Health Check Path**: `/`

### Step 3: Configure Environment Variables
Add these environment variables in Render:
```
APACHE_DOCUMENT_ROOT=/var/www/html
PHP_MEMORY_LIMIT=256M
PHP_MAX_EXECUTION_TIME=300
PHP_UPLOAD_MAX_FILESIZE=10M
PHP_POST_MAX_SIZE=10M
```

## 🏠 Local Development with Docker

### Option 1: Using docker-compose (Recommended)
```bash
# Build and start all services
docker-compose up --build

# Access your app at: http://localhost:8080
# Access phpMyAdmin at: http://localhost:8081 (if using database)
```

### Option 2: Using Docker directly
```bash
# Build image
docker build -t wage-rates-app .

# Run container
docker run -p 8080:80 -v "$(pwd)/data:/var/www/html/data" wage-rates-app
```

## 🔧 Configuration Details

### Dockerfile Features
- **PHP 8.2** with Apache
- **Required extensions**: zip, mysqli, pdo_mysql
- **URL rewriting** enabled
- **Proper file permissions**
- **Health checks**
- **Optimized for production**

### Environment Variables
- `APACHE_DOCUMENT_ROOT`: Document root path
- `PHP_MEMORY_LIMIT`: PHP memory limit (256MB)
- `PHP_MAX_EXECUTION_TIME`: Script execution time (300s)
- `PHP_UPLOAD_MAX_FILESIZE`: Max upload size (10MB)
- `PHP_POST_MAX_SIZE`: Max POST size (10MB)

## 🌐 URL Structure After Deployment

**Render URL**: `https://your-app-name.onrender.com`

- **Main App**: `https://your-app-name.onrender.com/`
- **Admin Panel**: `https://your-app-name.onrender.com/admin.php`
- **API Endpoints**: `https://your-app-name.onrender.com/api/`

## 🛠️ Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Fix data directory permissions
   chmod -R 777 data/
   chmod -R 777 api/
   ```

2. **404 Errors**
   - Check if `.htaccess` is properly configured
   - Verify Apache mod_rewrite is enabled

3. **API Not Working**
   - Check file permissions in `/api/` directory
   - Verify PHP error logs

4. **Database Connection (if using MySQL)
   - Ensure database service is running
   - Check connection credentials

### Debug Commands
```bash
# Check container logs
docker-compose logs web

# Access container shell
docker-compose exec web bash

# Check Apache status
docker-compose exec web service apache2 status

# Restart Apache
docker-compose exec web service apache2 restart
```

## 📊 Performance Optimization

### For Production
1. **Enable OPcache** in Dockerfile:
   ```dockerfile
   RUN docker-php-ext-install opcache
   ```

2. **Use Redis** for session storage (optional)

3. **Enable Gzip compression** in `.htaccess`

### Monitoring
- Render provides built-in monitoring
- Check health checks in dashboard
- Monitor response times

## 🔒 Security Considerations

1. **Change default admin password** in `admin.php`
2. **Use HTTPS** (Render provides free SSL)
3. **Restrict file uploads** in PHP configuration
4. **Regular backups** (Render has automatic backups)

## 📝 Next Steps

1. **Test locally** with docker-compose
2. **Push to GitHub**
3. **Deploy to Render**
4. **Test all functionality**
5. **Monitor performance**

## 🆘 Support

If you encounter issues:

1. **Check Render logs** in dashboard
2. **Review Docker logs**: `docker-compose logs`
3. **Verify file permissions**
4. **Test API endpoints** directly

Your PHP application is now ready for Docker deployment on Render! 🎉
