# Dicode EBR - Electronic Batch Records System

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev/)

Electronic Batch Records (EBR) system for pharmaceutical manufacturing. A modern, tablet-friendly application for managing batch execution with real-time OPC-UA PLC integration, offline capability, and compliant digital signatures.

## 🎯 Overview

Dicode EBR digitizes and streamlines the batch manufacturing process in pharmaceutical environments. It replaces paper-based batch records with a digital workflow that ensures:

- **21 CFR Part 11 Compliance** - Electronic records and signatures
- **Real-time Integration** - Direct OPC-UA connection to PLCs and process equipment
- **Offline Capability** - Continue operations even without network connectivity
- **Audit Trail** - Complete traceability of all actions and changes
- **Mobile-First Design** - Optimized for tablet use on the manufacturing floor

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DICODE EBR ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        FRONTEND (React + Vite)                       │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │   │
│  │  │   Batch      │  │    Step      │  │  Signature   │  │  Offline  │ │   │
│  │  │  Execution   │  │    Card      │  │     Pad      │  │ Indicator │ │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘ │   │
│  │                                                                     │   │
│  │  • PWA with Workbox (offline support)                               │   │
│  │  • React 18 + Vite for fast development                             │   │
│  │  • Axios for API communication                                      │   │
│  │  • react-signature-canvas for e-signatures                          │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │ HTTP/WebSocket                         │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                       BACKEND (Fastify + Node.js)                    │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   Batches    │  │   Recipes    │  │ Integrations │    Routes    │   │
│  │  │    API       │  │    API       │  │     API      │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │   │
│  │  │   OPC-UA     │  │    PDF       │  │    Batch     │   Services   │   │
│  │  │   Client     │  │  Generator   │  │   Queue      │              │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │   │
│  │                                                                     │   │
│  │  ┌──────────────┐  ┌──────────────┐                                │   │
│  │  │    Batch     │  │    Recipe    │           Models              │   │
│  │  │    Model     │  │    Model     │                                │   │
│  │  └──────────────┘  └──────────────┘                                │   │
│  └─────────────────────────────────┬───────────────────────────────────┘   │
│                                    │                                        │
│                    ┌───────────────┼───────────────┐                        │
│                    ▼               ▼               ▼                        │
│  ┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────┐     │
│  │    TimescaleDB      │  │     Redis       │  │     OPC-UA PLC      │     │
│  │  (PostgreSQL + TS)  │  │    (BullMQ)     │  │   (Manufacturing    │     │
│  │                     │  │                 │  │     Equipment)      │     │
│  │  • Batch records    │  │  • Job queues   │  │                     │     │
│  │  • Time-series data │  │  • Caching      │  │  • Real-time data   │     │
│  │  • Audit trails     │  │  • Pub/sub      │  │  • Equipment status │     │
│  └─────────────────────┘  └─────────────────┘  └─────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 18 | UI library |
| | Vite | Build tool & dev server |
| | Workbox | PWA offline support |
| | Axios | HTTP client |
| | react-signature-canvas | Digital signatures |
| **Backend** | Node.js 18+ | Runtime |
| | Fastify | Web framework |
| | @fastify/cors | CORS support |
| | BullMQ | Job queues |
| | Puppeteer | PDF generation |
| **Database** | TimescaleDB | Time-series data |
| | PostgreSQL | Relational data |
| **Cache/Queue** | Redis | BullMQ backend |
| **Integration** | node-opcua | OPC-UA client |
| **DevOps** | Docker | Containerization |
| | Docker Compose | Local orchestration |

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn
- Docker and Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Dicode-Tech/dicode-app-pharma-ebr.git
cd dicode-app-pharma-ebr
```

### 2. Start Infrastructure Services

```bash
docker-compose up -d timescaledb redis
```

This starts:
- TimescaleDB on port 5432
- Redis on port 6379

### 3. Setup Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

Backend will be available at `http://localhost:3000`

### 4. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

### 5. Run Full Stack with Docker

Alternatively, run everything with Docker Compose:

```bash
docker-compose up -d
```

This starts:
- TimescaleDB (port 5432)
- Redis (port 6379)
- Backend (port 3000)
- Frontend (port 5173)

## 📁 Project Structure

```
dicode-app-pharma-ebr/
├── docker-compose.yml          # Infrastructure orchestration
├── README.md                   # This file
├── backend/                    # Fastify API server
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.js           # Server entry point
│   │   ├── config/
│   │   │   └── database.js    # Database configuration
│   │   ├── routes/
│   │   │   ├── batches.js     # Batch execution APIs
│   │   │   ├── recipes.js     # Recipe management APIs
│   │   │   └── integrations.js # OPC-UA integration APIs
│   │   ├── services/
│   │   │   ├── opcua.js       # OPC-UA client service
│   │   │   └── pdf-generator.js # PDF report generation
│   │   └── models/
│   │       ├── Batch.js       # Batch data model
│   │       └── Recipe.js      # Recipe data model
│   └── database/
│       └── schema.sql         # Database schema
├── frontend/                   # React application
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx           # App entry point
│   │   ├── App.jsx            # Root component
│   │   ├── components/
│   │   │   ├── BatchExecution.jsx # Batch execution UI
│   │   │   ├── StepCard.jsx   # Individual step component
│   │   │   ├── SignaturePad.jsx   # E-signature component
│   │   │   └── OfflineIndicator.jsx # Offline status indicator
│   │   ├── hooks/
│   │   │   └── useOffline.js  # Offline detection hook
│   │   └── styles/
│   │       └── App.css        # Application styles
│   └── public/                # Static assets
└── docs/                       # Documentation
    ├── architecture.md        # Detailed architecture docs
    └── API.md                 # API reference
```

## 🔌 Loyal Integration Approach

The Dicode EBR system is designed to integrate seamlessly with existing pharmaceutical manufacturing environments:

### OPC-UA Integration

- **Standard Protocol**: Uses OPC-UA (IEC 62541) for universal PLC compatibility
- **Real-time Data**: Subscribes to PLC variables for live process data
- **Write Operations**: Can send commands back to PLCs for equipment control
- **Alarm Handling**: Receives and logs equipment alarms and events

### Data Integrity

- **Audit Trails**: Every data change is logged with timestamp, user, and reason
- **Electronic Signatures**: 21 CFR Part 11 compliant e-signature workflow
- **Data Integrity ALCOA+**: Attributable, Legible, Contemporaneous, Original, Accurate

### Compliance Features

- **Role-Based Access**: Configurable user roles and permissions
- **Electronic Records**: Secure, tamper-evident record storage
- **Batch Review**: Supervisor review and approval workflows
- **Report Generation**: Automated batch record PDF generation

## 🧪 Development

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Database Migrations

```bash
cd backend
npm run db:migrate
npm run db:rollback
```

### Building for Production

```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd backend
npm run build
```

## 🗂️ Documentation

- [Production Scheduling & Cross-Contamination Safeguards](docs/production-scheduling.md) — scope and API drafts for the planning module.

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

For support, please contact:
- Email: support@dicode.tech
- Issues: [GitHub Issues](https://github.com/Dicode-Tech/dicode-app-pharma-ebr/issues)

---

Built with ❤️ by Dicode Tech for the pharmaceutical manufacturing industry.
