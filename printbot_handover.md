# Printbot 3D — Complete Project Handover Document
**Date:** July 2026  
**Prepared by:** Achyuth  
**Project:** Printbot 3D — 3D Printing Service Web Application

---

# SECTION 1 — PROJECT OVERVIEW

Printbot 3D is a full-stack web application for a 3D printing service business based in Kerala, India. Customers upload STL/OBJ/STEP files, configure print settings, and place orders. Admins manage orders, update statuses, and notify customers at each stage.

**Business Locations:**
- Trivandrum Office — TrEST Research Park, Sreekaryam, Thiruvananthapuram, Kerala 695016
- Kanjirappally Office — Kasperob Robotics Pvt. Ltd, Startups Valley TBI, Kanjirappally, Kerala 686518

---

# SECTION 2 — WHAT IS BUILT AND WORKING

## Frontend Pages
- Landing page with hero, feature bar, client logos carousel, products, about us, footer with Google Maps
- Login page with Sign In and Sign Up tabs
- Quote page — file upload, 3D model viewer, print settings, order placement
- My Orders page — customer order history with 5-step timeline
- Admin Dashboard — order management, status updates, file downloads
- Admin Printer Status — full CRUD for printer fleet
- Admin Users — user list, search, delete

## Features Completed
- Email/password authentication with JWT tokens
- Role-based routing (USER vs ADMIN)
- STL file upload with real-time 3D browser preview
- Per-file print settings (FDM/SLA, material, color, infill, layer height)
- Order placement with customer notes
- Admin internal notes (separate from customer notes)
- Admin can update order status, quoted price, internal notes
- Customer gets email notification on every status change
- Admin gets email notification on every event
- WhatsApp notifications (ready for live credentials)
- Cancel order button for customer (PENDING orders only)
- Client logos carousel with 19 logos
- Bulk Order Enquiry modal with validation
- Dark/light mode toggle
- Error boundary (prevents blank page crashes)
- File type validation (STL/OBJ/STEP only)
- File size limit (150MB maximum)
- Rate limiting (prevents spam/attacks)
- PostgreSQL database on Supabase (Mumbai region)

## Email Templates (4)
1. Welcome email — sent on registration
2. Order confirmation — sent when order placed
3. Status update — sent when admin changes status (colored badge per status)
4. Admin notification — sent to admin on every event

## WhatsApp Templates (5, ready for Meta approval)
1. admin_new_user — new user registered
2. order_placed — customer order confirmation
3. admin_new_order — admin new order alert
4. order_status_update — customer status update
5. admin_status_changed — admin status alert

---

# SECTION 3 — TECH STACK

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | PostgreSQL via Supabase (Mumbai) |
| ORM | Prisma v5 |
| Authentication | JWT (jsonwebtoken + bcryptjs) |
| File Uploads | Multer (disk storage) |
| Email | Nodemailer |
| Frontend | React 19 + TypeScript |
| Routing | React Router DOM v7 |
| 3D Viewer | Three.js + React Three Fiber |
| Animations | Framer Motion v12 |
| CSS | TailwindCSS v4 |
| Bundler | Vite |
| Rate Limiting | express-rate-limit |

---

# SECTION 4 — DATABASE (SUPABASE)

**Provider:** Supabase PostgreSQL  
**Region:** South Asia — Mumbai (ap-south-1)  
**Dashboard:** supabase.com  
**Project Name:** Printbot-India

## Models
- User — id, name, email, phone, password, role (USER/ADMIN)
- Order — id, customerName, customerEmail, customerPhone, shippingAddress, status, totalCost, notes (customer), adminNotes (admin only), userId
- PrintJob — id, orderId, fileName, fileUrl, technology, material, color, infill, layerHeight
- Printer — id, name, model, technology, status, notes
- Category — schema only, unused
- Product — schema only, unused

## Order Status Flow
```
PENDING → QUOTED → PRINTING → SHIPPED → COMPLETE
                                        ↓
                                    CANCELLED (any point)
```

## Seed Accounts
- admin@printbot.in / Admin@1234 (ADMIN)
- test@printbot.in / User@1234 (USER)

---

# SECTION 5 — ENVIRONMENT VARIABLES

Create a `.env` file in the project root with these values:

```env
# Database
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Server
JWT_SECRET=your-strong-random-secret-here
BASE_URL=https://your-domain.com

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=Printbot 3D <your@gmail.com>
ADMIN_EMAIL=admin@printbot.in

# WhatsApp (Meta Cloud API)
WHATSAPP_TOKEN=your-meta-access-token
WHATSAPP_PHONE_ID=your-phone-number-id
WHATSAPP_ADMIN_NUMBER=919778517331
WHATSAPP_TEST_NUMBER=919778517331

# Firebase (not needed if hosting on Hostinger)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

---

# SECTION 6 — API ENDPOINTS

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/register | None | Create account |
| POST | /api/login | None | Sign in |
| GET | /api/users | Admin | List all users |
| DELETE | /api/users/:id | Admin | Delete user |
| POST | /api/orders | User | Place order |
| GET | /api/orders/mine | User | My orders |
| GET | /api/orders | Admin | All orders |
| PATCH | /api/orders/:id/status | Admin | Update status/price/notes |
| POST | /api/orders/:id/cancel | User | Cancel PENDING order |
| GET | /api/printers | Admin | List printers |
| POST | /api/printers | Admin | Add printer |
| PATCH | /api/printers/:id | Admin | Update printer |
| DELETE | /api/printers/:id | Admin | Delete printer |
| GET | /api/test/email | Admin | Test all email templates |
| GET | /api/test/whatsapp | Admin | Test WhatsApp connection |

---

# SECTION 7 — GITHUB REPOSITORY

**Repository:** github.com/achyuth-u/printbot  
**Visibility:** Private  
**Branch:** main  
**Commit history:** Full history of all changes

## To Clone
```bash
git clone https://github.com/achyuth-u/printbot.git
cd printbot
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npx tsx server.ts
```

---

# SECTION 8 — LOCAL DEVELOPMENT SETUP

## Prerequisites
- Node.js 18+
- npm
- Git

## Steps
1. Clone the repository
2. Run `npm install`
3. Create `.env` file with all variables from Section 5
4. Run `npx prisma generate`
5. Run `npx prisma db push`
6. Run `npx tsx prisma/seed.ts` (creates admin and test accounts)
7. Run `npx tsx server.ts`
8. Open `http://localhost:3000`

## Daily Development
```bash
npx tsx server.ts
```
That's it. Server runs at http://localhost:3000

---

# SECTION 9 — DEPLOYMENT (HOSTINGER)

## Requirements
- Hostinger Business plan (₹249/month) or higher — needed for Node.js support
- All environment variables from Section 5

## Steps
1. Login to Hostinger hPanel
2. Go to Node.js section
3. Create new Node.js app
4. Connect GitHub repository
5. Set all environment variables in Hostinger dashboard
6. Set startup file to `server.ts`
7. Set Node.js version to 18+
8. Deploy

## Build Command
```bash
npm install && npm run build && npx prisma generate
```

## Start Command
```bash
npx tsx server.ts
```

---

# SECTION 10 — WHAT IS NOT DONE YET (PENDING FEATURES)

## High Priority — Needed Soon
| Feature | Status | Notes |
|---|---|---|
| Razorpay Payment | Not started | Needs live URL first, KYC approval 1-2 days |
| WhatsApp Live Testing | Code done, not tested | Needs Meta account + template approval |
| Email Live Testing | Code done, not tested | Needs Gmail App Password in .env |

## Medium Priority — Add After Launch
| Feature | Status | Notes |
|---|---|---|
| Google OAuth | Not started | googleId field in schema ready |
| Cancel order UI | Done | Server endpoint done, UI button added |
| PDF Invoice | Not started | — |
| Admin Analytics | Not started | — |

## Low Priority — Future
| Feature | Status | Notes |
|---|---|---|
| Shiprocket integration | Not started | — |
| Inventory management | Not started | — |
| Pagination | Not started | Needed at 100+ orders |
| JWT token refresh | Not started | Expires after 7 days |

---

# SECTION 11 — KNOWN LIMITATIONS

1. Files save to local disk — will persist on Hostinger but not on Railway
2. No Google OAuth yet — email/password only
3. No payment gateway yet — manual payment collection for now
4. WhatsApp in dev mode — needs Meta credentials to send real messages
5. No pagination — all orders load at once (fine for early stage)
6. OBJ files cannot be previewed in 3D viewer — STL only
7. Bulk Order Enquiry modal has no backend — just frontend for now
8. Category and Product database models exist but are unused

---

# SECTION 12 — TESTING GUIDE

## Email Testing
1. Add SMTP variables to .env
2. Restart server
3. Get admin token from POST /api/login
4. Hit GET /api/test/email with Bearer token
5. Check inbox for 4 emails

## WhatsApp Testing
1. Create Meta developer account
2. Add WhatsApp product
3. Get token and phone ID
4. Add to .env
5. Verify personal number in Meta dashboard
6. Create 5 templates and wait for approval
7. Hit GET /api/test/whatsapp with Bearer token
8. Check phone for message

## Order Flow Testing
1. Login as test@printbot.in / User@1234
2. Upload STL file at /quote
3. Configure and place order
4. Login as admin@printbot.in / Admin@1234
5. Go to /dashboard
6. Find order, change status, save
7. Check customer email for notification

---

# SECTION 13 — CREDENTIALS TO HAND OVER

When handing over to Printbot, replace these with their own accounts:

| Service | Current | Replace With |
|---|---|---|
| GitHub | achyuth-u/printbot | Transfer repo or create new |
| Supabase | achyuth Gmail | admin@printbot.in |
| SMTP | bambooboys6969@gmail.com | admin@printbot.in |
| WhatsApp | Personal number | Printbot business number |
| Meta Developer | Personal Facebook | Printbot business account |

## Transfer Steps
1. Printbot creates accounts on Supabase, Meta, Gmail
2. They generate their own credentials
3. Replace values in .env file
4. Restart server
5. Run `npx prisma db push` and `npx tsx prisma/seed.ts` on new database
6. Transfer GitHub repo ownership in Settings → Danger Zone

---

# SECTION 14 — FOLDER STRUCTURE

```
Printbot/
├── .env                    # Environment variables (never in Git)
├── .env.example            # Template with all variable keys
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── server.ts               # Entire Express backend
├── railway.toml            # Railway deployment config
│
├── prisma/
│   ├── schema.prisma       # Database models
│   └── seed.ts             # Creates admin and test accounts
│
├── public/
│   ├── fonts/              # Rileno Sans + Prelo fonts
│   ├── logos/              # 19 client logo files
│   ├── products/           # 6 product catalog images
│   └── uploads/            # Uploaded STL files (local dev)
│
└── src/
    ├── App.tsx             # Root with routing
    ├── index.css           # Design tokens + TailwindCSS
    ├── context/
    │   ├── AuthContext.tsx
    │   └── ThemeContext.tsx
    ├── components/
    │   ├── ErrorBoundary.tsx
    │   ├── ModelViewer.tsx
    │   └── layout/
    │       ├── Navbar.tsx
    │       ├── Sidebar.tsx
    │       ├── Footer.tsx
    │       └── FloatingThemeToggle.tsx
    └── pages/
        ├── Landing.tsx
        ├── Login.tsx
        ├── Quote.tsx
        ├── MyOrders.tsx
        ├── Dashboard.tsx
        ├── Printers.tsx
        ├── Users.tsx
        └── Catalog.tsx
```

---

# SECTION 15 — CONTACT AND SUPPORT

**Developer:** Achyuth  
**GitHub:** github.com/achyuth-u/printbot  
**Project started:** June 2026  
**Current status:** Ready for deployment

---

*This document covers the complete current state of the Printbot 3D project as of July 2026.*
