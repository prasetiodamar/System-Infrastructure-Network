# System Infrastructure Network

Sistem manajemen infrastruktur jaringan berbasis web yang komprehensif, dirancang untuk operasi jaringan fiber optik Fiber-to-the-Home (FTTH). Sistem ini memungkinkan perusahaan telekomunikasi dan operator jaringan untuk mengelola, memantau, dan memvisualisasikan seluruh infrastruktur jaringan fiber optik mereka dari satu platform terpusat.

---

## Table of Contents / Daftar Isi

1. [Overview / Gambaran Umum](#overview--gambaran-umum)
2. [Technology Stack / Teknologi](#technology-stack--teknologi)
3. [Features / Fitur](#features--fitur)
4. [API Endpoints](#api-endpoints)
5. [Database Schema](#database-schema)
6. [Installation / Instalasi](#installation--instalasi)
7. [Configuration / Konfigurasi](#configuration--konfigurasi)
8. [Usage / Penggunaan](#usage--penggunaan)
9. [Project Structure / Struktur Proyek](#project-structure--struktur-proyek)
10. [Frontend Components / Komponen Frontend](#frontend-components--komponen-frontend)

---

## Overview / Gambaran Umum

**English:**
System Infrastructure Network provides complete management capabilities for fiber optic networks, including infrastructure components (OLT, OTB, ODC, ODP, Joint Boxes, Poles), cable management, splice point tracking, rack equipment management, client connections, and real-time map visualization using satellite imagery.

**Bahasa Indonesia:**
System Infrastructure Network menyediakan kemampuan manajemen lengkap untuk jaringan fiber optik, termasuk komponen infrastruktur (OLT, OTB, ODC, ODP, Joint Box, Tiang), manajemen kabel, pelacakan titik splic, manajemen peralatan rack, koneksi pelanggan, dan visualisasi peta real-time menggunakan citra satelit.

---

## Technology Stack / Teknologi

### Frontend
- **Framework**: React 19.2.3
- **Routing**: React Router DOM 7.12.0
- **Maps**: React Leaflet with Leaflet Draw untuk fungsionalitas peta interaktif
- **UI Icons**: Lucide React
- **HTTP Client**: Axios
- **Styling**: Custom CSS dengan desain responsif

### Backend
- **Framework**: Laravel 12.0 (PHP 8.2+)
- **Authentication**: Laravel Sanctum untuk autentikasi token API
- **Database**: MySQL

### External Integrations / Integrasi Eksternal
- **LibreNMS**: Integrasi sistem monitoring jaringan untuk manajemen perangkat
- **Nominatim**: Servis geocoding OpenStreetMap untuk pencarian lokasi
- **Esri World Imagery**: Tile citra satelit untuk visualisasi peta

---

## Features / Fitur

### 1. Authentication and Authorization / Autentikasi dan Otorisasi

**English:**
- User authentication with JWT/Sanctum token-based authentication
- Role-based access control (Admin and regular user roles)
- Session management with token storage in localStorage
- Protected routes requiring authentication

**Bahasa Indonesia:**
- Autentikasi pengguna dengan autentikasi berbasis token JWT/Sanctum
- Kontrol akses berbasis peran (Admin dan pengguna reguler)
- Manajemen sesi dengan penyimpanan token di localStorage
- Rute yang dilindungi memerlukan autentikasi

### 2. Dashboard

**English:**
The main dashboard provides a comprehensive overview of the entire network infrastructure:
- Summary statistics of all infrastructure components (Sites, Racks, Data Centers, POPs, OLT, OTB, Joint Boxes, ODC, ODP, Servers, Routers, Switches, Poles)
- Quick access navigation cards
- Network overview (cables, splices, connections, fiber cores count)
- Quick actions for common operations
- Alerts and warnings (duplicate splices detection, inactive/damaged cables, missing connections)
- Recent activity tracking
- Equipment distribution visualization
- Network topology mini view
- Site overview ranked by infrastructure count

**Bahasa Indonesia:**
Dashboard utama menyediakan gambaran komprehensif dari seluruh infrastruktur jaringan:
- Statistik ringkasan semua komponen infrastruktur (Sites, Racks, Data Center, POP, OLT, OTB, Joint Box, ODC, ODP, Server, Router, Switch, Tiang)
- Kartu navigasi akses cepat
- Gambaran jaringan (kabel, splice, koneksi, jumlah core fiber)
- Aksi cepat untuk operasi umum
- Peringatan dan peringatan (deteksi splice duplikat, kabel tidak aktif/rusak, koneksi yang hilang)
- Pelacakan aktivitas terbaru
- Visualisasi distribusi peralatan
- Mini view topologi jaringan
- Gambaran situs peringkat berdasarkan jumlah infrastruktur

### 3. Site Management / Manajemen Situs

**English:**
- Full CRUD operations for sites
- Site types: POP (Point of Presence) and Data Center
- Location data with latitude, longitude, and coverage radius
- Address management with province, city, district fields
- Search, filter, and grid/list view modes
- Radius calculation for service area

**Bahasa Indonesia:**
- Operasi CRUD lengkap untuk situs
- Jenis situs: POP (Point of Presence) dan Data Center
- Data lokasi dengan latitude, longitude, dan radius jangkauan
- Manajemen alamat dengan kolom provinsi, kota, kecamatan
- Pencarian, filter, dan mode tampilan grid/daftar
- Kalkulasi radius untuk area layanan

### 4. Infrastructure Management / Manajemen Infrastruktur

#### OLT (Optical Line Terminal)
**English:**
- OLT equipment management with port tracking
- Rack integration
- Status monitoring capabilities

**Bahasa Indonesia:**
- Manajemen peralatan OLT dengan pelacakan port
- Integrasi rack
- Kemampuan monitoring status

#### OTB (Optical Termination Box)
**English:**
- OTB type management with configurable port counts
- Installation tracking and maintenance records
- Connection management to downstream equipment

**Bahasa Indonesia:**
- Manajemen tipe OTB dengan jumlah port yang dapat dikonfigurasi
- Pelacakan instalasi dan rekam maintenance
- Manajemen koneksi ke peralatan downstream

#### ODC (Optical Distribution Cabinet)
**English:**
- ODC type management with customizable configurations
- Port management for feeder cable connections
- Splice tray tracking
- Pigtail management for fiber connections
- Splitter integration support
- ODC-to-ODP cable path management
- Port connection visualization

**Bahasa Indonesia:**
- Manajemen tipe ODC dengan konfigurasi yang dapat disesuaikan
- Manajemen port untuk koneksi kabel feeder
- Pelacakan splice tray
- Manajemen pigtail untuk koneksi fiber
- Dukungan integrasi splitter
- Manajemen jalur kabel ODC-ke-ODP
- Visualisasi koneksi port

#### ODP (Optical Distribution Point)
**English:**
- ODP type management with port capacity
- Connection to ODC infrastructure
- Client connection point management
- Splitter port allocation

**Bahasa Indonesia:**
- Manajemen tipe ODP dengan kapasitas port
- Koneksi ke infrastruktur ODC
- Manajemen titik koneksi pelanggan
- Alokasi port splitter

#### Joint Box
**English:**
- Splice point management for cable junctions
- Core allocation and tracking
- Multi-cable connection support
- Image documentation upload for splice points

**Bahasa Indonesia:**
- Manajemen titik splice untuk junction kabel
- Alokasi dan pelacakan core
- Dukungan koneksi multi-kabel
- Unggah dokumentasi gambar untuk titik splice

#### Rack Equipment / Peralatan Rack
**English:**
- **Server**: Network server equipment management
- **Router**: Router device tracking and configuration
- **Switch**: Network switch management with port assignment

**Bahasa Indonesia:**
- **Server**: Manajemen peralatan server jaringan
- **Router**: Pelacakan dan konfigurasi perangkat router
- **Switch**: Manajemen switch jaringan dengan penugasan port

#### Pole (Tiang)
**English:**
- Aerial infrastructure management
- Pole location tracking
- Cable attachment point management

**Bahasa Indonesia:**
- Manajemen infrastruktur udara
- Pelacakan lokasi tiang
- Manajemen titik pemasangan kabel

### 5. Cable Management / Manajemen Kabel

**English:**
- Full CRUD operations for fiber cables
- Cable types: Duct Cable, Direct Buried Cable, Aerial Cable, Dropcore, Dropcore Tube, Figure 8, Mini ADSS, ADSS, SCPT, Indoor Cable
- Path coordinates storage for cable routes on map
- Individual core tracking and allocation
- Bulk core operations
- Core utilization reporting

**Bahasa Indonesia:**
- Operasi CRUD lengkap untuk kabel fiber
- Jenis kabel: Duct Cable, Direct Buried Cable, Aerial Cable, Dropcore, Dropcore Tube, Figure 8, Mini ADSS, ADSS, SCPT, Indoor Cable
- Penyimpanan koordinat jalur untuk rute kabel di peta
- Pelacakan dan alokasi core individual
- Operasi bulk core
- Laporan pemanfaatan core

### 6. Splice Management / Manajemen Splice

**English:**
- Splice CRUD operations linked to joint boxes
- Core connection tracking (from_core and to_core)
- Image documentation upload
- Client tracing through splice points
- Duplicate splice detection

**Bahasa Indonesia:**
- Operasi CRUD splice yang terhubung ke joint box
- Pelacakan koneksi core (from_core dan to_core)
- Unggah dokumentasi gambar
- Pelacakan pelanggan melalui titik splice
- Deteksi splice duplikat

### 7. Client (Pelanggan) Management / Manajemen Pelanggan

**English:**
- Complete customer record management
- Package types support (10 Mbps to 500 Mbps)
- Coordinate-based location with interactive map picker
- Connection types: ODP, Joint Box, OTB
- ONT management (serial number and model tracking)
- IP address assignment and tracking
- Status management: Active, Pending, Inactive, Suspended
- Connection statistics dashboard
- Drop cable length tracking
- Infrastructure mapping
- Site association

**Bahasa Indonesia:**
- Manajemen lengkap rekam pelanggan
- Dukungan tipe paket (10 Mbps sampai 500 Mbps)
- Lokasi berbasis koordinat dengan picker peta interaktif
- Jenis koneksi: ODP, Joint Box, OTB
- Manajemen ONT (pelacakan serial number dan model)
- Penugasan dan pelacakan IP address
- Manajemen status: Aktif, Pending, Tidak Aktif, Suspensi
- Dashboard statistik koneksi
- Pelacakan panjang kabel drop
- Pemetaan infrastruktur
- Asosiasi situs

### 8. LibreNMS Integration / Integrasi LibreNMS

**English:**
- Device listing from LibreNMS API
- Port information display (status, speed, traffic statistics)
- Sensor data (DDM - Transceiver Digital Diagnostic Monitoring)
- Location import as sites
- Device category mapping
- Device site linking
- Statistics dashboard

**Bahasa Indonesia:**
- Daftar perangkat dari API LibreNMS
- Tampilan informasi port (status, kecepatan, statistik traffic)
- Data sensor (DDM - Transceiver Digital Diagnostic Monitoring)
- Import lokasi sebagai situs
- Pemetaan kategori perangkat
- Pengaitan situs perangkat
- Dashboard statistik

### 9. Rack Management / Manajemen Rack

**English:**
- Rack listing and detailed view
- Equipment position tracking
- Position validation within racks

**Bahasa Indonesia:**
- Daftar rack dan tampilan detail
- Pelacakan posisi peralatan
- Validasi posisi dalam rack

### 10. Map Visualization / Visualisasi Peta

**English:**
- Esri World Imagery satellite base layer
- Label overlay for streets and locations
- Site markers with type-based colors
- Custom infrastructure markers for each type (OLT, OTB, ODC, ODP, Joint Box, Pole, Server, Router, Switch)
- Client location markers with status colors
- Cable route polylines
- Nominatim geocoding search
- Animated fly-to navigation
- Marker popups with detailed information

**Bahasa Indonesia:**
- Layer dasar satelit Esri World Imagery
- Overlay label untuk jalan dan lokasi
- Marker situs dengan warna berdasarkan jenis
- Marker infrastruktur custom untuk setiap tipe (OLT, OTB, ODC, ODP, Joint Box, Tiang, Server, Router, Switch)
- Marker lokasi pelanggan dengan warna status
- Poliline rute kabel
- Pencarian geocoding Nominatim
- Navigasi fly-to dengan animasi
- Popup marker dengan informasi detail

### 11. Admin Panel / Panel Admin

**English:**
- User management (create, edit, delete)
- Role assignment (admin or regular user)
- Location settings configuration

**Bahasa Indonesia:**
- Manajemen pengguna (buat, edit, hapus)
- Penugasan peran (admin atau pengguna reguler)
- Konfigurasi pengaturan lokasi

### 12. KML Import / Import KML

**English:**
- KML file parsing
- Cable route import from KML
- Batch import operations

**Bahasa Indonesia:**
- Parsing file KML
- Import rute kabel dari KML
- Operasi import batch

---

## API Endpoints

### Authentication / Autentikasi
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/login` | User login |
| GET | `/api/me` | Get current user |
| POST | `/api/logout` | User logout |
| POST | `/api/register` | Register new user (admin only) |

### Sites / Situs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/sites` | List all sites |
| GET | `/api/sites/map` | Sites for map visualization |
| GET | `/api/sites/tree/{id}` | Site tree structure |
| GET | `/api/sites/statistics` | Site statistics |
| POST | `/api/sites` | Create site |
| PUT | `/api/sites/{id}` | Update site |
| DELETE | `/api/sites/{id}` | Delete site |
| POST | `/api/sites/{id}/recalculate-radius` | Recalculate coverage radius |

### Infrastructure / Infrastruktur
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/infrastructures` | List all infrastructure |
| GET | `/api/infrastructures/map/all` | All infrastructure for map |
| GET | `/api/infrastructures/site/{siteId}` | Infrastructure by site |
| GET | `/api/infrastructures/hierarchy/{siteId?}` | Hierarchical view |
| GET | `/api/infrastructures/pops-with-children` | POPs with child elements |
| POST | `/api/infrastructures` | Create infrastructure |
| PUT | `/api/infrastructures/{id}` | Update infrastructure |
| DELETE | `/api/infrastructures/{id}` | Delete infrastructure |
| POST | `/api/infrastructures/{id}/image` | Upload infrastructure image |
| GET | `/api/infrastructures/{id}/images` | Get infrastructure images |

### Cables / Kabel
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cables` | List all cables |
| GET | `/api/cables/{id}` | Get cable details |
| GET | `/api/cables/{id}/cores` | Get cable cores |
| GET | `/api/cables/{id}/cores/summary` | Core utilization summary |
| POST | `/api/cables` | Create cable |
| PUT | `/api/cables/{id}` | Update cable |
| DELETE | `/api/cables/{id}` | Delete cable |

### Splices
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/splices` | List all splices |
| GET | `/api/infrastructures/{id}/splices` | Splices for infrastructure |
| POST | `/api/splices` | Create splice |
| PUT | `/api/splices/{id}` | Update splice |
| DELETE | `/api/splices/{id}` | Delete splice |
| POST | `/api/splices/trace-client` | Trace client through splices |
| POST | `/api/splices/{id}/image` | Upload splice image |

### Clients / Pelanggan
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | List all clients |
| GET | `/api/clients/{id}` | Get client details |
| GET | `/api/clients-for-map` | Clients for map |
| GET | `/api/clients/statistics` | Client statistics |
| POST | `/api/clients` | Create client |
| PUT | `/api/clients/{id}` | Update client |
| DELETE | `/api/clients/{id}` | Delete client |
| POST | `/api/clients/{id}/connect` | Connect client to infrastructure |
| DELETE | `/api/clients/{id}/connections/{connectionId}` | Disconnect client |

### Splitters
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/splitters` | List all splitters |
| GET | `/api/splitters/ratios` | Available splitter ratios |
| POST | `/api/splitters/odp` | Create ODP connection |
| POST | `/api/splitters/client` | Create client connection |
| POST | `/api/splitters/{id}/ports/{portId}/allocate-odp` | Allocate port to ODP |
| POST | `/api/splitters/{id}/ports/{portId}/allocate-client` | Allocate port to client |
| POST | `/api/splitters/{id}/ports/{portId}/disconnect` | Disconnect port |

### LibreNMS
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/librenms/devices` | List LibreNMS devices |
| GET | `/api/librenms/devices/{hostname}/ports` | Device ports |
| GET | `/api/librenms/devices/{hostname}/sensors` | Device sensors (DDM) |
| GET | `/api/librenms/import-locations` | Import locations as sites |
| GET | `/api/librenms/categories` | Device categories |
| PUT | `/api/librenms/categories` | Update categories |

### Users / Pengguna
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (admin only) |
| POST | `/api/users` | Create user (admin only) |
| PUT | `/api/users/{id}` | Update user (admin only) |
| DELETE | `/api/users/{id}` | Delete user (admin only) |

---

## Database Schema / Schema Database

### Core Tables / Tabel Utama

**English:**
- **users**: User accounts with role-based authentication
- **sites**: Physical locations for network infrastructure
- **infrastructure_types**: Categories of infrastructure components
- **infrastructures**: Individual infrastructure records (OLT, OTB, ODC, ODP, Joint Box, Rack Equipment, Poles)
- **cable_types**: Categories of fiber cables
- **cables**: Fiber optic cable records
- **cores**: Individual fiber cores within cables
- **splices**: Splice point connections between cores
- **ports**: Physical ports on infrastructure equipment
- **connections**: Logical connections between infrastructure components
- **clients**: End-customer records

**Bahasa Indonesia:**
- **users**: Akun pengguna dengan autentikasi berbasis peran
- **sites**: Lokasi fisik untuk infrastruktur jaringan
- **infrastructure_types**: Kategori komponen infrastruktur
- **infrastructures**: Rekaman infrastruktur individual (OLT, OTB, ODC, ODP, Joint Box, Peralatan Rack, Tiang)
- **cable_types**: Kategori kabel fiber
- **cables**: Rekaman kabel fiber optik
- **cores**: Core fiber individual dalam kabel
- **splices**: Koneksi titik splice antar core
- **ports**: Port fisik pada peralatan infrastruktur
- **connections**: Koneksi logis antar komponen infrastruktur
- **clients**: Rekaman pelanggan akhir

### Support Tables / Tabel Pendukung

**English:**
- **odc_types**: ODC (Optical Distribution Cabinet) type configurations
- **odp_types**: ODP (Optical Distribution Point) type configurations
- **splitters**: Optical splitter devices
- **splitter_ports**: Individual ports on splitters
- **odc_port_connections**: Physical port connections at ODC
- **splice_trays**: Splice tray management within ODC
- **pigtails**: Pigtail fiber connections
- **odc_splices**: Splicing records at ODC
- **librenms_device_categories**: LibreNMS device category mappings
- **librenms_device_sites**: LibreNMS device site associations

**Bahasa Indonesia:**
- **odc_types**: Konfigurasi tipe ODC (Optical Distribution Cabinet)
- **odp_types**: Konfigurasi tipe ODP (Optical Distribution Point)
- **splitters**: Perangkat splitter optik
- **splitter_ports**: Port individual pada splitter
- **odc_port_connections**: Koneksi port fisik di ODC
- **splice_trays**: Manajemen splice tray dalam ODC
- **pigtails**: Koneksi fiber pigtail
- **odc_splices**: Rekaman splicing di ODC
- **librenms_device_categories**: Pemetaan kategori perangkat LibreNMS
- **librenms_device_sites**: Asosiasi situs perangkat LibreNMS

---

## Installation / Instalasi

### Prerequisites / Prasyarat

**English:**
- PHP 8.2 or higher
- Composer
- Node.js 18+ and npm
- MySQL 5.7+ or MariaDB 10.3+
- XAMPP or similar local development environment

**Bahasa Indonesia:**
- PHP 8.2 atau lebih tinggi
- Composer
- Node.js 18+ dan npm
- MySQL 5.7+ atau MariaDB 10.3+
- XAMPP atau lingkungan pengembangan lokal serupa

### Backend Setup / Setup Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
composer install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Run database migrations
php artisan migrate

# (Optional) Seed initial data
php artisan db:seed
```

### Frontend Setup / Setup Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Running the Application / Menjalankan Aplikasi

**Start Backend Server / Mulai Server Backend:**
```bash
cd backend
php artisan serve --port=8000
```

**Start Frontend Development Server / Mulai Server Development Frontend:**
```bash
cd frontend
npm start
```

**Application URL / URL Aplikasi:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

### XAMPP Configuration / Konfigurasi XAMPP

**English:**
For XAMPP deployment:
1. Place the project in `htdocs` directory
2. Configure virtual host or point to `backend/public` for API
3. Configure `.env` with XAMPP MySQL credentials
4. Create database `infrastructure_network` in phpMyAdmin

**Bahasa Indonesia:**
Untuk deployment XAMPP:
1. Tempatkan proyek di direktori `htdocs`
2. Konfigurasi virtual host atau arahkan ke `backend/public` untuk API
3. Konfigurasi `.env` dengan kredensial MySQL XAMPP
4. Buat database `infrastructure_network` di phpMyAdmin

---

## Configuration / Konfigurasi

### Environment Variables / Variabel Lingkungan

**Backend (.env):**
```env
APP_NAME=System Infrastructure Network
APP_ENV=local
APP_KEY=<generated_key>
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=infrastructure_network
DB_USERNAME=root
DB_PASSWORD=
```

**Frontend (.env):**
```env
REACT_APP_API_URL=http://localhost:8000/api
```

---

## Usage / Penggunaan

### Initial Setup / Setup Awal

**English:**
1. Start both backend and frontend servers
2. Access the application at http://localhost:3000
3. Login with default credentials (if seeded) or register a new admin account

**Bahasa Indonesia:**
1. Mulai kedua server backend dan frontend
2. Akses aplikasi di http://localhost:3000
3. Login dengan kredensial default (jika sudah di-seed) atau daftar akun admin baru

### Managing Infrastructure / Manajemen Infrastruktur

**English:**
1. Create Sites first to organize infrastructure locations
2. Add Infrastructure components linked to sites
3. Create Cables with path coordinates for cable routes
4. Create Splices to connect cable cores
5. Manage Clients and their connections to infrastructure

**Bahasa Indonesia:**
1. Buat Sites terlebih dahulu untuk mengorganisir lokasi infrastruktur
2. Tambahkan komponen Infrastruktur yang terhubung ke sites
3. Buat Cables dengan koordinat jalur untuk rute kabel
4. Buat Splices untuk menghubungkan core kabel
5. Kelola Clients dan koneksi mereka ke infrastruktur

---

## Project Structure / Struktur Proyek

```
infrastructure-network/
|-- backend/
|   |-- app/
|   |   |-- Http/
|   |   |   |-- Controllers/     # API controllers
|   |   |   |-- Middleware/       # Auth middleware
|   |   |-- Models/              # Eloquent models
|   |   |-- Observers/           # Model observers
|   |-- config/                  # Laravel configuration
|   |-- database/
|   |   |-- migrations/          # Database migrations
|   |   |-- seeders/            # Database seeders
|   |-- routes/
|   |   |-- api.php             # API routes definition
|   |-- composer.json           # PHP dependencies
|   |-- artisan                 # Laravel CLI
|-- frontend/
|   |-- src/
|   |   |-- components/         # React components
|   |   |-- pages/              # Page components
|   |   |-- services/          # API service modules
|   |   |-- context/           # React contexts
|   |   |-- utils/             # Utility functions
|   |   |-- styles/            # CSS stylesheets
|   |-- public/                # Static assets
|   |-- package.json          # Node dependencies
|-- README.md                  # This file
```

---

## Frontend Components / Komponen Frontend

### Core Components / Komponen Inti

| Component | Description |
|-----------|-------------|
| `AdminPanel` | Administrative functions and user management |
| `Sidebar` | Navigation sidebar with menu items |
| `MapNavbar` | Map view navigation tabs |
| `InfrastructureNavbar` | Infrastructure section navigation |

### Management Components / Komponen Manajemen

| Component | Description |
|-----------|-------------|
| `SiteManager` | Site CRUD with grid/list views |
| `InfrastructureView` | Generic infrastructure display |
| `InfrastructureForm` | Infrastructure add/edit form |
| `InfrastructureDashboard` | Dashboard with statistics |
| `CableManager` | Cable management interface |
| `CableList` | Cable listing component |
| `CableForm` | Cable creation form |
| `CableTypeManager` | Cable type management |
| `RackManager` | Rack management interface |
| `ClientManager` | Client management with connection features |
| `SplitterManager` | Splitter management interface |
| `OdcManager` | ODC management |
| `OdpManager` | ODP management |
| `OTBView` / `OTBList` | OTB management |
| `LibreNMSManager` | LibreNMS integration interface |

### Map Components / Komponen Peta

| Component | Description |
|-----------|-------------|
| `MapComponent` | Main map visualization with search, markers, and cable routes |
| `MapPicker` | Location picker modal |
| `CableMap` | Cable-specific map view |
| `LocationPicker` | Interactive location selection |

### Utility Components / Komponen Utilitas

| Component | Description |
|-----------|-------------|
| `UserManagement` | User account management |
| `PortManager` | Port management interface |
| `PortEditModal` | Port editing modal |
| `CoreAllocationModal` | Core allocation interface |
| `CoreEditModal` | Core editing modal |
| `KmlImportModal` | KML file import modal |

---

## License / Lisensi

**English:**
This project is proprietary software. All rights reserved.

**Bahasa Indonesia:**
Proyek ini adalah perangkat lunak proprietary. Semua hak dilindungi.