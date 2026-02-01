# Shopify Integration and Configuration

This document centralizes information regarding Shopify app configuration, authentication, and known issues related to the embedded environment.

## ⚙️ Partner Dashboard Configuration

### App Setup
1.  **App URL**: `https://custom.duniasantri.com`
2.  **Allowed redirection URL(s)**:
    - `https://custom.duniasantri.com/api/auth`
    - `https://custom.duniasantri.com/api/auth/callback`
    - `https://custom.duniasantri.com/exitiframe`

### App Distribution
- **Distribution**: Custom app (configured for specific stores).

### Embedded App Requirements
- The app MUST be configured as an **embedded app** in the Partner Dashboard.
- **Session Tokens**: Should be enabled (default for modern embedded apps).
- **Cookies**: The app should NOT rely on third-party cookies for session management due to browser restrictions.

---

## 🍪 SameSite Cookie & OAuth Issues

### Current Situation
If experiencing persistent `same_site_cookies` errors or OAuth loops:
1.  Browsers block third-party cookies in iframes (Shopify Admin context).
2.  The OAuth flow may attempt to set cookies after callback, which fails in the embedded context.
3.  Successful OAuth might fail session storage, creating a redirect loop:
    `/api/auth` → `Shopify OAuth` → `/api/auth/callback` → (fails to set cookie) → `redirects back to /api/auth` (LOOP).

### Proposed Solutions

#### 1. Use Shopify CLI for Development (Recommended)
The Shopify CLI handles OAuth and tunneling automatically:
```bash
# In your project root
shopify app dev
```
- Creates a secure tunnel.
- Handles OAuth without cookie dependency issues.
- Provides hot reload.

#### 2. Upgrade Shopify Libraries
Ensure dependencies are up to date:
```bash
npm install @shopify/shopify-app-express@latest @shopify/shopify-api@latest
```
*Note: Requires Node.js 20+.*

#### 3. Token Exchange Flow
Completely bypass the OAuth redirect flow using Shopify's token exchange methods in `@shopify/shopify-api`. This is the most robust solution for embedded apps.

#### 4. Temporary Workaround (Non-Embedded)
For isolated testing, uncheck "Embed app in Shopify admin" in the Partner Dashboard. The app will open in a new tab where cookies work normally.

---

## 📅 Maintenance & Status
- **Backend**: Express + Prisma + PostgreSQL.
- **Frontend**: Vite + React + Polaris.
- **Authentication**: Token-based auth middleware in `server.js` protects API routes.
- **OAuth Breakout**: Handled via `/exitiframe` path.

---

## 📍 Open Designer Configuration

### Deskripsi
Pengaturan ini menentukan bagaimana designer ditampilkan kepada pelanggan di storefront. Konfigurasi dapat diatur per produk melalui panel **Summary** di Designer Admin.

### Opsi Mode Tampilan

| Mode | Label UI | Deskripsi |
| :--- | :--- | :--- |
| **Redirect** | `Open Designer` | Membuka Designer di halaman penuh (Full Page). |
| **Inline** | `Inline on Product Page` | Designer dimuat langsung di dalam halaman produk. |
| **Modal** | `Modal Popup` | Membuka designer dalam popup/overlay. |
| **Wizard** | `Step-by-Step Wizard` | Panduan langkah demi langkah untuk kustomisasi. |

### Strategi Pemisahan (Decoupling)
Meskipun Admin dan Public saat ini mungkin berbagi komponen `DesignerCore`, struktur wrapper (`PublicLayout` vs `AdminLayout`) harus terpisah total. Hal ini memastikan perubahan pada tampilan publik tidak merusak fungsionalitas admin.
