# Copilot Instructions for WPH Training System

## Project Overview

**WPH Training System** is a hospital training & conference records management platform for Wat Phleng Hospital. It's a full-stack Node.js + MySQL application with JWT-based authentication, two-level authorization (admin/user), and comprehensive course management with learning time tracking.

## Architecture

### Technology Stack
- **Backend**: Express.js (REST API)
- **Frontend**: Vanilla JavaScript with responsive HTML/CSS
- **Database**: MySQL with utf8mb4 charset (supports Thai characters)
- **Authentication**: JWT tokens with bcrypt password hashing
- **File Uploads**: Multer middleware (images & PDFs only, max 5MB)

### Core Features (Phases 1-5)
1. **Training Records Management** (Phase 1) - CRUD for training records
2. **Course Registration System** (Phase 2) - Enroll/unenroll in courses
3. **Course Detail Page** (Phase 2) - Materials viewer, progress display
4. **Quiz System** (Phase 3) - Pre/post tests with scoring
5. **Learning Time Tracking** (Phase 4) - Auto timer with 30-second sync
6. **Admin Enrollment** (Phase 5) - Admin can take courses like users

### Data Model
The system manages multiple entity types with referential integrity:

1. **Users** (`users` table): Hospital staff with roles (admin/user)
2. **Courses** (`courses` table): Online training courses
3. **Course Materials** (`course_materials` table): Videos/PDFs per course
4. **Quizzes** (`quizzes` table): Pre/post tests (max 2 per course)
5. **Quiz Questions** (`quiz_questions` table): Questions with multiple answers
6. **User Course Progress** (`user_course_progress` table): Enrollment tracking with:
   - `status`: enrolled | in_progress | completed
   - `pre_test_score`: Pre-test percentage (0-100)
   - `post_test_score`: Post-test percentage (0-100)
   - `learning_time_minutes`: Accumulated learning time (DECIMAL)
7. **Training Records** (`training_records` table): Traditional training record
8. **Attachments** (`attachments` table): File associations

**Key Design Patterns**: 
- All course entities cascade delete (deleting course removes materials, quizzes, progress)
- User progress has unique constraint (one record per user/course pair)
- Both admin and regular users can have progress records

### API Architecture
Routes structured in `server/routes/`:
- **auth.js**: Login/logout, JWT generation
- **users.js**: User management (admin only)
- **training.js**: Training records CRUD
- **courses.js**: Course CRUD + enrollment
- **quizzes.js**: Quiz creation, submission, scoring
- **progress.js**: Learning time tracking

**Auth Pattern**: All routes use `verifyToken` middleware (Bearer token from Authorization header). Additional middleware like `isAdmin` enforce role-based access.

### Frontend Architecture
Single-page app in `public/js/app.js` + `public/js/online-training.js` manages:
- Authentication state (JWT token + user data in localStorage)
- Course catalog and enrollment UI
- Modal-based forms for CRUD operations
- Material viewer with YouTube/PDF support
- Real-time timer with auto-sync
- Quiz UI with validation

## Critical Workflows

### Setup & Initialization
1. **Database Setup** (required first):
   ```bash
   # Option 1: Batch script (Windows)
   setup-database.bat
   
   # Option 2: Manual
   mysql -u root -p < database/schema.sql
   npm run init-db
   ```
   - Creates `wph_training_db` database with all tables
   - Initializes default admin (username: `admin`, password: `admin123`)
   - Creates sample user (username: `user001`, password: `user123`)

2. **Server Start** (dev environment):
   ```bash
   npm run dev  # Uses nodemon for auto-reload
   # or
   npm start    # Production mode
   ```
   - Runs on `http://localhost:3000`
   - Check `/api/health` endpoint to verify API status

### Course Enrollment Flow
1. User/admin views course list (`GET /api/courses`)
2. Clicks course to view details (`GET /api/courses/{id}`)
3. If not enrolled, sees enrollment button
4. Clicks enrollment button (`POST /api/courses/{id}/enroll`)
5. Server creates `user_course_progress` record with `status='enrolled'`
6. Course detail page now shows materials and quizzes

### Material Viewing & Timer
1. User clicks material in course detail
2. Timer starts (`startTimer()` called)
3. Every 5 seconds, checks if 30+ seconds elapsed
4. If yes, syncs progress (`POST /api/progress/update`)
5. Server adds time delta to `learning_time_minutes`
6. UI updates immediately
7. When leaving material, remaining time flushed to server

### Quiz Flow
1. User clicks "แบบทดสอบก่อนเรียน" or "แบบทดสอบหลังเรียน"
2. Timer stops temporarily
3. Quiz modal opens, questions load (`GET /api/quizzes/course/{courseId}/{type}`)
4. User selects answers and submits
5. Server validates enrollment + calculates score
6. Updates `pre_test_score` or `post_test_score` in progress
7. If post-test passes: status→'completed', completed_at→NOW()

### Debugging Tools
- **check-db.js**: Verify MySQL connection and database state
- **debug-courses.js**, **debug-users.js**: Ad-hoc query runners for testing
- **server/scripts/init-database.js**: Resets users and metadata with seed data

## Project-Specific Conventions

### Code Patterns
1. **Database Queries**: Use promise-based pool (`promisePool.query()`) for async/await consistency:
   ```javascript
   const [rows] = await promisePool.query('SELECT * FROM users WHERE id = ?', [userId]);
   ```

2. **Error Responses**: All API responses follow this structure:
   ```json
   { "success": boolean, "message": "Thai description", "data": {...} }
   ```
   Status codes: 400 (validation), 401 (auth), 403 (authorization), 404 (not found), 500 (server error)

3. **Middleware Stacking**: Routes apply multiple middleware left-to-right:
   ```javascript
   router.post('/:id/enroll', verifyToken, async (req, res) => {
       // User must be authenticated, role doesn't matter
   });
   ```

4. **Admin-Only Routes**: Use `isAdmin` middleware:
   ```javascript
   router.post('/', verifyToken, isAdmin, async (req, res) => {
       // Only admins can create
   });
   ```

5. **Time Tracking**: Client accumulates time, sends delta to server:
   ```javascript
   const diff = (now - lastSyncTime) / 1000 / 60; // Minutes
   await fetch(`${API_URL}/progress/update`, {
       method: 'POST',
       body: JSON.stringify({ courseId, timeSpent: diff })
   });
   ```

### Frontend Patterns
- **State Management**: Global variables (`currentUser`, `authToken`, `currentCourse`)
- **UI Updates**: Direct DOM manipulation via `getElementById`, `classList`
- **Form Submission**: Event delegation with `handleSubmit` functions
- **Modal Reuse**: Single modal HTML with dynamic content injection
- **Timer State**: Global `learningTimer` interval, synced with `lastSyncTime`

### File Structure Conventions
- Routes don't handle business logic; they orchestrate middleware and DB calls
- No service layer—queries run directly in route handlers
- Middleware exports individual functions, imported selectively
- All Thai UI strings hardcoded (no i18n framework)
- Frontend heavily uses inline event listeners on HTML elements

## Integration Points & External Dependencies

### MySQL Connection
- **Pool Configuration** in `server/config/database.js` uses charset `utf8mb4`
- Connection pool of 10 instances for concurrent requests
- Connection errors logged with specific error codes
- Test connection on startup to catch DB issues early

### File Upload Flow
1. Client submits multipart form via `<form enctype="multipart/form-data">`
2. Multer middleware validates (image/PDF only, <5MB)
3. File stored in `uploads/` with timestamped filename
4. File path inserted into `attachments` table with FK to `training_records`
5. File path or URL stored in `course_materials.content_url`

### Course Material Display
- **Videos**: YouTube URL parsed with regex, embedded via iframe
- **PDFs**: Stored in `/uploads/` and displayed via iframe viewer
- Material type determines display format

## Common Development Tasks

### Adding a New Course Endpoint
1. Create handler in `server/routes/courses.js`
2. Apply `verifyToken` middleware (required for all)
3. Apply `isAdmin` if admin-only
4. Use `promisePool.query()` for DB access
5. Return `{ success: boolean, message: string, data: object }`
6. Frontend: Add fetch call in `online-training.js` and bind event listener

### Adding a New Quiz
1. Admin creates quiz via modal in `online-training.js`
2. Frontend batches questions with answers
3. `POST /api/quizzes/create` submits to server
4. Server inserts quiz record + questions + answers
5. Quiz type must be 'pre' or 'post' (unique constraint per course)

### Modifying Database Schema
1. Edit `database/schema.sql`
2. Reset database: `mysql -u root -p < database/schema.sql`
3. Reinitialize: `npm run init-db`
4. Update corresponding route queries
5. Update frontend form fields if needed

### Tracking Learning Time
- Client sends `{ courseId, timeSpent }` in minutes to `POST /api/progress/update`
- Server adds delta to existing `learning_time_minutes`
- Formula: `learning_time_minutes += timeSpent`
- Syncs every 30 seconds for efficiency

### Troubleshooting Connection Issues
- Check MySQL service is running
- Verify `.env` credentials match MySQL user/password
- Run `node check-db.js` to isolate DB problems
- Check server console for specific error codes

## Important Notes
- **Charset**: System uses `utf8mb4` for full Thai character support
- **Authentication**: Bearer token in `Authorization: Bearer <token>` header
- **CORS**: Allows all origins by default; configure `CORS_ORIGIN` in `.env` for production
- **Rate Limiting**: Applied to `/api/*` routes (100 req/15min per IP)
- **File Storage**: Uploads persisted to disk in `uploads/` directory
- **Timer Precision**: Syncs every 30 seconds; may lose <30 seconds on exit
- **Admin Enrollment**: Admin can enroll and be tracked like any user

## Phase-Specific Notes

### Phase 2-5 Features
- Course registration now fully functional
- Admin and users can both enroll in courses
- Learning time automatically tracked when viewing materials
- Quiz scores update progress status
- Completion status set when post-test passes
- All features integrate with existing training record system

See `PHASE_2_5_SUMMARY.md` for detailed feature documentation.

