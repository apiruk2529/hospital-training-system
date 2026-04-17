# Implementation Guide: Phase 2-5 Features

## What's Been Done

### 1. Database Schema Updated ✅
- Added `learning_time_minutes DECIMAL(10,2) DEFAULT 0` to `user_course_progress` table
- Existing user_course_progress records will have `NULL` for time initially

**If existing data causes issues, run:**
```sql
UPDATE user_course_progress SET learning_time_minutes = 0 WHERE learning_time_minutes IS NULL;
ALTER TABLE user_course_progress MODIFY learning_time_minutes DECIMAL(10,2) DEFAULT 0;
```

### 2. Backend APIs Enhanced ✅

#### courses.js
- **GET /:id** - Now returns userProgress for all users (admin + regular)
- **POST /:id/enroll** - Allows any authenticated user (including admin) to enroll
- **POST /:id/unenroll** - New endpoint to remove enrollment

**Usage:**
```javascript
// Enroll in course
POST /api/courses/{courseId}/enroll
Authorization: Bearer {token}

// Unenroll from course
POST /api/courses/{courseId}/unenroll
Authorization: Bearer {token}

// Get course details (includes materials, quizzes, userProgress)
GET /api/courses/{courseId}
Authorization: Bearer {token}
```

#### quizzes.js
- **POST /submit** - Enhanced with enrollment check and better error handling
- Validates that user is enrolled before submitting answers
- Returns clearer success/failure messages

#### progress.js (Already exists - no changes needed)
- **POST /update** - Receives `courseId` and `timeSpent` (in minutes)
- Accumulates learning_time_minutes in database
- Auto-fails gracefully if not enrolled

### 3. Frontend Enhanced ✅

#### online-training.js
- **showCourseDetail()** - Now works for admin AND users
- **startTimer()** - Syncs every 30 seconds to /progress/update
- **stopTimer()** - Flushes remaining time on exit
- **syncProgress()** - Batches time updates and updates UI

**Key Functions:**
```javascript
enrollCourse()           // POST /courses/{id}/enroll
viewMaterial(index)     // Starts timer when material displayed
startQuiz(type)         // 'pre' or 'post'
submitUserQuiz()        // Calculates answers & submits
```

## Deployment Steps

### 1. Reset Database
```bash
mysql -u root -p < database/schema.sql
npm run init-db
```

### 2. Start Server
```bash
npm run dev
# or
npm start
```

### 3. Test with Accounts
- **Admin**: username: `admin`, password: `admin123`
- **User**: username: `user001`, password: `user123` (from init-db script)

## Testing Workflow

### Quick Smoke Test (5 minutes)
1. Login as admin
2. Go to Online Training
3. Click a course → "ดูตัวอย่าง"
4. Click enrollment button
5. Click a material → should start playing/displaying
6. Check time counter increments
7. Back to courses
8. Login as user001
9. Repeat 2-6

### Detailed Testing (30 minutes)
See `TESTING_CHECKLIST.md` for comprehensive test plan

## Key Implementation Details

### Progress Tracking Algorithm
1. Timer starts when material is viewed
2. Every 30 seconds: calculate elapsed time since last sync
3. Send delta (incremental time) to `/progress/update`
4. Server accumulates: `learning_time_minutes += timeSpent`
5. UI updates immediately with new total

**Example Flow:**
```
T=0s: View material, timer starts
T=30s: Sync 0.5 minutes, total = 0.5
T=60s: Sync 0.5 minutes, total = 1.0
T=90s: Leave material, sync 0.5 minutes, total = 1.5
```

### Quiz Submission Flow
```
User selects answers → Click Submit
  ↓
Validate all answered ✓
  ↓
POST /quizzes/submit {courseId, quizType, answers}
  ↓
Server calculates score
Server updates user_course_progress with score
If post-test & passed: status = 'completed', set completed_at
  ↓
Return score & pass/fail to client
  ↓
Show result modal & refresh course view
```

### Admin Enrollment
- Admin CAN enroll in courses (same as users)
- Admin sees "ลงทะเบียนเรียน (Admin)" button
- Admin gets own progress tracked separately
- Admin can see their own quiz scores and time

## Common Issues & Fixes

### Timer not syncing?
- Check browser console for fetch errors
- Verify Authorization header is present
- Check server console for 401/403 errors
- Ensure user is logged in

### Progress not saving?
- Check if user_course_progress record exists (may not auto-create)
- Verify learning_time_minutes column exists: `DESC user_course_progress;`
- Check MySQL error logs

### Quiz not loading?
- Verify course has quiz records in database
- Check if quiz has questions (quiz_questions table)
- Check server logs for query errors
- Ensure quizType is 'pre' or 'post'

### Admin can't enroll?
- Verify authorization header is sent
- Check if course exists
- Check if already enrolled (unique constraint)

## Database Queries for Manual Testing

```sql
-- Check user's progress
SELECT * FROM user_course_progress WHERE user_id = 1 AND course_id = 1;

-- See all enrolled users for a course
SELECT u.full_name, p.status, p.learning_time_minutes, p.pre_test_score, p.post_test_score
FROM user_course_progress p
JOIN users u ON p.user_id = u.user_id
WHERE p.course_id = 1;

-- Total learning time across all courses
SELECT SUM(learning_time_minutes) as total_minutes
FROM user_course_progress
WHERE user_id = 1;

-- Find courses without quizzes
SELECT c.course_id, c.title
FROM courses c
LEFT JOIN quizzes q ON c.course_id = q.course_id
WHERE q.quiz_id IS NULL;
```

## Next Steps (Post-Implementation)

- [ ] Add course completion certificate generation
- [ ] Create dashboard showing learner progress
- [ ] Add discussion/comment feature on courses
- [ ] Implement course ratings/reviews
- [ ] Add reminder emails for uncompleted courses
- [ ] Create detailed learning analytics reports

