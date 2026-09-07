# Skylink Backend

Production-ready backend foundation, authentication infrastructure, and **Blog CMS Management** system for the **Skylink** web platform, built with Node.js, Express, MongoDB (Mongoose), Cloudinary, and Brevo.

---

## 🛠️ Tech Stack

* **Runtime:** [Node.js](https://nodejs.org/) (ES Modules)
* **Framework:** [Express.js](https://expressjs.com/)
* **Database:** [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
* **Authentication:** [JWT (jsonwebtoken)](https://github.com/auth0/node-jsonwebtoken) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
* **File Uploads & Media:** [Multer](https://github.com/expressjs/multer) & [Cloudinary](https://cloudinary.com/) (`cloudinary`)
* **Email Service:** [Brevo](https://www.brevo.com/) Transactional Email API (`@getbrevo/brevo`)
* **Security & Utility:** [Helmet](https://helmetjs.github.io/), [CORS](https://github.com/expressjs/cors), [Morgan](https://github.com/expressjs/morgan), [dotenv](https://github.com/motdotla/dotenv)
* **Dev Tooling:** [Nodemon](https://nodemon.io/)

---

## 📁 Project Structure

```text
Skylink_Backend/
├── src/
│   ├── config/
│   │   ├── db.js              # MongoDB database connection via Mongoose
│   │   └── cloudinary.js      # Cloudinary service & upload helper
│   │
│   ├── controllers/
│   │   ├── authController.js  # Controller for login and profile endpoints
│   │   └── blogController.js  # Controller for Blog CMS (public & admin)
│   │
│   ├── middleware/
│   │   ├── authMiddleware.js  # JWT authentication verification
│   │   ├── errorMiddleware.js # Centralized error handling
│   │   ├── notFoundMiddleware.js # 404 handler
│   │   └── uploadMiddleware.js   # Multer file upload & validation (JPG/PNG/WEBP)
│   │
│   ├── models/
│   │   ├── Admin.js           # Admin Mongoose model with bcrypt hashing
│   │   └── Blog.js            # Blog Mongoose model with slugification & indexing
│   │
│   ├── routes/
│   │   ├── authRoutes.js      # Authentication endpoints (/api/auth)
│   │   ├── blogRoutes.js      # Blog endpoints (/api/blogs)
│   │   └── healthRoutes.js    # Health check endpoint (/api/health)
│   │
│   ├── services/
│   │   ├── authService.js     # Admin auth logic, token generation, seeding
│   │   ├── blogService.js     # Blog CRUD, pagination, filtering, Cloudinary cleanup
│   │   └── emailService.js    # Reusable Brevo email service
│   │
│   ├── utils/
│   │   └── seedAdmin.js       # Secure CLI script to initialize the first admin
│   │
│   ├── app.js                 # Express application & middleware pipeline
│   └── server.js              # Server entry point & startup logic
│
├── .env                       # Local environment variables (git-ignored)
├── .env.example               # Template environment configuration
├── .gitignore                 # Files ignored in Git repository
├── package.json               # Dependencies and npm scripts
└── README.md                  # Project documentation
```

---

## 🚀 Getting Started

### 1. Installation

Install all required dependencies:

```bash
npm install
```

### 2. Environment Variables Configuration

Copy `.env.example` to `.env` if not already present:

```bash
cp .env.example .env
```

Configure your `.env` with your actual credentials:

```env
PORT=5000

MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/skylink?retryWrites=true&w=majority

CLIENT_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

BREVO_API_KEY=your_brevo_api_key
BREVO_SENDER_EMAIL=your_verified_sender@skylink.com
BREVO_SENDER_NAME=Skylink

JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=1d

ADMIN_EMAIL=admin@skylink.com
ADMIN_PASSWORD=YourSecureAdminPassword123!
```

---

## 🔒 Initial Admin Account Setup

To securely create your initial admin account in MongoDB without exposing any public registration endpoints:

1. Ensure `MONGODB_URI`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` are filled in your `.env`.
2. Run the seeding script:

```bash
npm run seed:admin
```

---

## 🏃 Running the Application

### Development Mode (with hot reloading via Nodemon)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

---

## 📡 API Endpoints

### 🩺 1. Health Check
* **Method:** `GET`
* **Path:** `/api/health`
* **Access:** Public

---

### 🔐 2. Admin Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Admin login with `{ email, password }` |
| `GET` | `/api/auth/me` | Private (Admin JWT) | Get current authenticated admin profile |

---

### 📰 3. Blog Public APIs

| Method | Endpoint | Query Parameters / Description |
|---|---|---|
| `GET` | `/api/blogs` | Get published blogs. Supports `page`, `limit`, `category`, `technology`, `keyword`, `search`, `featured`. |
| `GET` | `/api/blogs/:slug` | Get single published blog by slug. |

---

### 🛠️ 4. Blog Admin Management APIs (Protected by JWT)

All admin APIs require: `Authorization: Bearer <JWT_TOKEN>`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/blogs/upload-image` | Upload featured blog image (`multipart/form-data`, field: `image`) |
| `GET` | `/api/blogs/admin` | List all blogs (drafts + published) with pagination and search |
| `GET` | `/api/blogs/admin/:id` | Get blog by ID for editing |
| `POST` | `/api/blogs` | Create a new blog |
| `PUT` | `/api/blogs/:id` | Update an existing blog |
| `PATCH` | `/api/blogs/:id/status` | Publish / Unpublish blog (`{ status: 'draft' \| 'published' }`) |
| `PATCH` | `/api/blogs/:id/featured` | Toggle featured status (`{ featured: true \| false }`) |
| `DELETE` | `/api/blogs/:id` | Delete blog and remove its Cloudinary image |

---

### 📝 Blog Data Structure

```json
{
  "title": "Global Trade Compliance Guide",
  "slug": "global-trade-compliance-guide",
  "shortDescription": "A comprehensive guide on global logistics and trade compliance.",
  "content": "<p>Complete rich article content here...</p>",
  "featuredImage": {
    "url": "https://res.cloudinary.com/.../image.jpg",
    "publicId": "skylink/blogs/image_id"
  },
  "imageAltText": "Trade Compliance Logistics",
  "category": "Trade Compliance",
  "technology": ["Digital Trade", "AI"],
  "keywords": ["EXIM consultancy", "global logistics", "trade compliance"],
  "author": "Skylink Team",
  "status": "draft",
  "featured": false,
  "publishedAt": null
}
```
