# ECS Maps Zambia — Interactive Geospatial Dashboard

> High-performance loan portfolio visualisation and territory management for field teams in Zambia.

Built with **Next.js 15** and **Supabase** — designed for real-time PAR (Portfolio At Risk) tracking, boundary layer management, and field-ready geographic intelligence.

---

## 🎨 Design System: Luminous Curator

A professional, high-contrast light-mode theme built for field visibility:

| Principle | Implementation |
|-----------|---------------|
| **Clarity** | Tonal sidebars and glassmorphic navbar — metrics scannable in high-glare environments |
| **Typography** | `Inter` for primary UI · `Manrope` for map labels · `DM Mono` for technical data |
| **Status Encoding** | Color-coded markers by PAR bucket · Priority labels for critical collections |

---

## ✨ Features

- **Real-Time Portfolio Tracking** - Monitor On-Time and At-Risk (PAR 1-30 through PAR 90+) metrics across operational regions.
- **Advanced Layer Management** - Upload, rename, recolor, and lock KMZ / KML boundary layers.
- **Buffer Circle Generator** - Create geodesic polygons (e.g. 1km/2km shop buffers) from CSV coordinates.
- **Area Team Management** - Assign boundary layers to specific field teams for territorial monitoring.
- **Role-Based Access** - Secure Admin dashboard protected by Supabase Auth and Next.js Edge Middleware.
- **High Performance** - Canvas-based rendering handles thousands of customer markers with zero lag.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Core** | Next.js 15 (Pages Router) · TypeScript |
| **Database** | Supabase (PostgreSQL + Row level Security) |
| **Mapping** | Mapbox GL (Styling) · Leaflet (Interactivity) · React-Leaflet v5 |
| **UI** | Vanilla CSS (Luminous Curator Tokens) · SVG Icon Components |
| **Parsing** | JSZip (KMZ) · PapaParse (CSV) · Geodesic Mathematics |

---

## 📂 Project Structure

```
par-map/
├── src/
│   ├── components/
│   │   ├── Map.tsx              # Core Leaflet integration (Dynamic Import, SSR: false)
│   │   ├── admin/               # Admin-only dashboard modules
│   │   └── NavIcons.tsx         # Brand-specific SVG icons
│   ├── lib/
│   │   ├── supabase.ts          # Client initialization with error boundaries
│   │   ├── useAuth.ts           # Authentication & role management hook
│   │   └── layerService.ts      # KMZ persistence and visibility logic
│   ├── pages/
│   │   ├── map.tsx              # Main interactive map interface
│   │   ├── admin.tsx            # Protected dashboard configuration
│   │   └── login.tsx            # Next.js 15 compliant auth entry
│   └── middleware.ts            # Edge Auth guard & cookie sync
```

---

## 🚀 Setup & Installation

### 1. Requirements
- Node.js 18+
- Supabase Project
- Mapbox Access Token

### 2. Environment Configuration
Create a `.env.local` file:

```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
```

### 3. Installation
```bash
npm install
npm run dev
```

---

## 💾 Database Schema

The application requires the following tables in Supabase:
- `profiles`: User identities and roles (`admin` vs `user`)
- `kmz_layers`: Persistent boundary and buffer metadata
- `customers`: Geographic loan data points
- `teams`: Organizational groupings for boundary layers

> Migration scripts are available in the `/supabase/migrations` directory.

---

## 🔒 Security

- **Middleware Protection**: All admin routes are guarded at the Edge.
- **Strict RLS**: Row Level Security ensures users only access data they are authorized to see.
- **Auth Resilience**: Next.js 15 compliant cookie handling for seamless session persistence.

---

## 📄 License

MIT © 2026 ECS Maps Zambia.
