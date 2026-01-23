# Shopify Custom Product Designer App

Aplikasi Shopify untuk membuat custom product designer dengan integrasi Shopify App Bridge, memungkinkan merchant untuk mengkonfigurasi produk yang dapat dikustomisasi oleh pelanggan.

## 📋 Daftar Isi
- [Teknologi yang Digunakan](#teknologi-yang-digunakan)
- [Struktur Project](#struktur-project)
- [Database Schema](#database-schema)
- [API Endpoints](#api-endpoints)
- [Instalasi & Setup](#instalasi--setup)
- [Menjalankan Aplikasi](#menjalankan-aplikasi)
- [Services & Deployment](#services--deployment)

## 🛠️ Teknologi yang Digunakan

### Frontend
- **Framework**: React 18.3.1
- **Build Tool**: Vite 6.3.5
- **Styling**: 
  - Tailwind CSS 4.1.12
  - Material-UI (MUI) 7.3.5
  - Radix UI Components
- **Routing**: React Router DOM 7.12.0
- **State Management**: React Hooks
- **UI Components**:
  - Lucide React (Icons)
  - React Colorful (Color Picker)
  - React DnD (Drag & Drop)
  - Recharts (Charts)
  - Sonner (Toast Notifications)
- **Shopify Integration**:
  - @shopify/app-bridge 3.7.11
  - @shopify/app-bridge-react 3.7.10
  - @shopify/polaris 13.9.5
- **File Processing**:
  - PDF.js 5.4.530
  - PSD.js 3.9.2

### Backend
- **Runtime**: Node.js (v22.11.0)
- **Framework**: Express 5.2.1
- **Database**: PostgreSQL (via Prisma ORM)
- **ORM**: Prisma 5.22.0
- **Shopify SDK**:
  - @shopify/shopify-api 12.3.0
  - @shopify/shopify-app-express 6.0.5
  - @shopify/shopify-app-session-storage-prisma 8.0.1
- **Utilities**:
  - dotenv 17.2.3 (Environment Variables)
  - morgan 1.10.1 (HTTP Logger)
  - winston 3.19.0 (Application Logger)
  - cross-env 10.1.0 (Cross-platform Scripts)
- **Python**: Python 3 (untuk remove_bg.py)

## 📁 Struktur Project

```
/www/wwwroot/custom.local/
├── frontend/                    # React SPA Application
│   ├── src/
│   │   ├── App.tsx             # Main Router & Entry Point
│   │   ├── main.tsx            # React DOM Entry
│   │   ├── components/         # Reusable UI Components (59 files)
│   │   ├── pages/              # Route Pages (6 pages)
│   │   │   ├── Designer.tsx    # Product Designer Page
│   │   │   └── ...
│   │   ├── hooks/              # Custom React Hooks
│   │   ├── styles/             # Global Styles & CSS (4 files)
│   │   └── types/              # TypeScript Type Definitions
│   │       └── types.ts        # Canvas Elements, Design Types
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/                     # Node.js API Server
│   ├── server.js               # Express Server (652 lines)
│   ├── prisma/
│   │   └── schema.prisma       # Database Schema
│   ├── remove_bg.py            # Python Script untuk Background Removal
│   ├── package.json
│   ├── .env                    # Environment Variables
│   ├── out.log                 # Application Logs
│   └── err.log                 # Error Logs
│
├── font/                        # Custom Fonts (20 files)
├── README.md                    # Dokumentasi Utama
├── SHOPIFY_CONFIG.md           # Konfigurasi Shopify
└── SAMESITE_COOKIE_ISSUE.md    # Cookie Issue Documentation
```

## 🗄️ Database Schema

Database menggunakan **PostgreSQL** dengan Prisma ORM. Schema utama:

### 1. **Session** - Shopify App Session Storage
```prisma
- id, shop, state, isOnline
- accessToken, refreshToken
- userId, firstName, lastName, email
- scope, expires, locale
```

### 2. **MerchantConfig** - Konfigurasi Produk per Merchant
```prisma
- id (UUID)
- shop, shopifyProductId
- printArea (JSON) - Area yang bisa di-customize
- baseImage - Gambar dasar produk
- masks (JSON) - Masking areas
```

### 3. **SavedDesign** - Design yang Disimpan User
```prisma
- id (UUID)
- shop, shopifyProductId
- name, designJson (JSON)
- previewUrl, status
- shopifyOrderId, lineItemId
```

### 4. **Asset** - Font, Color, Image Assets
```prisma
- id (UUID)
- shop, type (font/color/image)
- name, value
- config (JSON) - Additional configuration
```

## 🔌 API Endpoints

Base URL: `/imcst_api` (memerlukan Shopify authentication)

### Products
- `GET /imcst_api/products` - List semua produk (GraphQL)
- `GET /imcst_api/products/:id` - Detail produk
- `PUT /imcst_api/products/:gid/status` - Toggle product status

### Orders
- `GET /imcst_api/orders` - List orders

### Collections
- `GET /imcst_api/collections` - List collections

### Product Configuration
- `GET /imcst_api/config/:productId` - Get product config
- `POST /imcst_api/config` - Save product config
- `GET /imcst_api/configured-products` - List configured products

### Designs
- `POST /imcst_api/designs` - Save design
- `GET /imcst_api/designs` - List designs
- `GET /imcst_api/designs/:id` - Get design by ID
- `PUT /imcst_api/designs/:id` - Update design
- `DELETE /imcst_api/designs/:id` - Delete design

### Assets
- `GET /imcst_api/assets` - List assets (fonts, colors, images)
- `POST /imcst_api/assets` - Upload asset
- `DELETE /imcst_api/assets/:id` - Delete asset

### Image Processing
- `POST /imcst_api/remove-background` - Remove background dari image
- `POST /imcst_api/upload-image` - Upload image

## 🚀 Instalasi & Setup

### Prerequisites
- Node.js v22.11.0 atau lebih tinggi
- PostgreSQL Database
- Python 3 (untuk background removal)
- Shopify Partner Account

### 1. Clone & Install Dependencies

```bash
# Install Frontend Dependencies
cd /www/wwwroot/custom.local/frontend
npm install

# Install Backend Dependencies
cd /www/wwwroot/custom.local/backend
npm install

# Setup Python Virtual Environment (optional)
cd /www/wwwroot/custom.local/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Environment Configuration

Edit `/www/wwwroot/custom.local/backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
SHOPIFY_API_KEY="your_api_key"
SHOPIFY_API_SECRET="your_api_secret"
SCOPES="write_products,read_orders"
HOST="https://yourdomain.com"
```

### 3. Database Setup

```bash
cd /www/wwwroot/custom.local/backend
npm run prisma:generate
npm run prisma:migrate
```

## 🏃 Menjalankan Aplikasi

### Development Mode

```bash
# Terminal 1 - Backend API Server
cd /www/wwwroot/custom.local/backend
npm run dev
# Berjalan di http://localhost:3000

# Terminal 2 - Frontend Dev Server
cd /www/wwwroot/custom.local/frontend
npm run dev
# Berjalan di http://localhost:3006

# Terminal 3 - Prisma Studio (Database GUI)
cd /www/wwwroot/custom.local/backend
npx prisma studio --browser none
# Berjalan di http://localhost:5555
```

### Production Mode

```bash
# Build Frontend
cd /www/wwwroot/custom.local/frontend
npm run build

# Start Backend
cd /www/wwwroot/custom.local/backend
npm start
```

## 🔧 Services & Deployment

### Running Services (Production)

Aplikasi saat ini berjalan dengan **manual node processes** (bukan systemctl):

```bash
# Check running services
ps aux | grep node

# Active Services:
# - Backend API: node server.js (Port 3000)
# - Frontend Dev: vite --host --port 3006 (Port 3006)
# - Prisma Studio: prisma studio (Port 5555)
```

### Port Mapping
- **3000** - Backend API Server (Express)
- **3006** - Frontend Development Server (Vite)
- **5555** - Prisma Studio (Database GUI)

### Logs Location
- **Application Logs**: `/www/wwwroot/custom.local/backend/out.log`
- **Error Logs**: `/www/wwwroot/custom.local/backend/err.log`

### Membuat Systemd Service (Opsional)

Untuk auto-start saat server reboot, buat systemd service:

```bash
# Backend Service
sudo nano /etc/systemd/system/custom-backend.service
```

```ini
[Unit]
Description=Custom Product Designer Backend
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/www/wwwroot/custom.local/backend
ExecStart=/www/server/nodejs/v22.11.0/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=append:/www/wwwroot/custom.local/backend/out.log
StandardError=append:/www/wwwroot/custom.local/backend/err.log
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
# Enable dan start service
sudo systemctl daemon-reload
sudo systemctl enable custom-backend.service
sudo systemctl start custom-backend.service
sudo systemctl status custom-backend.service
```

### Nginx Configuration (Reverse Proxy)

```nginx
# Frontend
location / {
    proxy_pass http://localhost:3006;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}

# Backend API
location /imcst_api {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## 📝 Integration Status

- ✅ **Designer**: Fully integrated dengan React Router
- ✅ **Backend**: Express API dengan Shopify SDK
- ✅ **Database**: PostgreSQL dengan Prisma ORM
- ✅ **Shopify**: App Bridge configured
- ✅ **Authentication**: Shopify OAuth & Session Management
- ✅ **Image Processing**: Background removal support
- ✅ **Asset Management**: Font, Color, Image uploads

## 🔗 Related Documentation

- [SHOPIFY_CONFIG.md](./SHOPIFY_CONFIG.md) - Shopify App Configuration
- [SAMESITE_COOKIE_ISSUE.md](./SAMESITE_COOKIE_ISSUE.md) - Cookie Handling Issues
- [Backend README](./backend/README.md) - Backend Specifications

## 📞 Support

Untuk pertanyaan atau issue, silakan buat issue di repository atau hubungi tim development.
