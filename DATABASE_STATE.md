# Database State Documentation

## Updated Schema Changes

### user_course_progress Table
**New Column Added:**
```sql
learning_time_minutes DECIMAL(10,2) DEFAULT 0
```

**Full Table Structure After Update:**
```
+-----------+-----------+----------+-----------------------------------------+
| Field     | Type      | Null    | Key | Default | Extra  |
+-----------+-----------+----------+-----------------------------------------+
| progress_id | int     | NO      | PRI | NULL    | auto_increment |
| user_id   | int       | NO      | MUL | NULL    |        |
| course_id | int       | NO      |     | NULL    |        |
| status    | enum      | NO      |     | enrolled|        |
| pre_test_score | int  | YES     |     | NULL    |        |
| post_test_score | int | YES     |     | NULL    |        |
| learning_time_minutes | decimal | NO | | 0     |        |
| enrolled_at | timestamp | NO    |     | CURRENT |        |
| completed_at | timestamp | YES  |     | NULL    |        |
+-----------+-----------+----------+-----------------------------------------+
```

## Sample Data After Testing

### Expected user_course_progress Records

**Scenario 1: User who started a course**
```sql
progress_id: 1
user_id: 2 (user001)
course_id: 1
status: 'in_progress'
pre_test_score: 85
post_test_score: NULL
learning_time_minutes: 15.5
enrolled_at: 2025-11-27 10:30:00
completed_at: NULL
```

**Scenario 2: User who completed a course**
```sql
progress_id: 2
user_id: 2 (user001)
course_id: 2
status: 'completed'
pre_test_score: 70
post_test_score: 92
learning_time_minutes: 45.3
enrolled_at: 2025-11-27 09:00:00
completed_at: 2025-11-27 11:15:00
```

**Scenario 3: Admin who enrolled**
```sql
progress_id: 3
user_id: 1 (admin)
course_id: 1
status: 'enrolled'
pre_test_score: NULL
post_test_score: NULL
learning_time_minutes: 0
enrolled_at: 2025-11-27 14:00:00
completed_at: NULL
```

## Verification Queries

### Check All Users' Course Progress
```sql
SELECT 
  u.user_id,
  u.full_name,
  u.role,
  c.title as course,
  p.status,
  p.pre_test_score,
  p.post_test_score,
  p.learning_time_minutes,
  p.enrolled_at,
  p.completed_at
FROM user_course_progress p
JOIN users u ON p.user_id = u.user_id
JOIN courses c ON p.course_id = c.course_id
ORDER BY p.enrolled_at DESC;
```

### Check Specific User's Progress
```sql
SELECT 
  c.title,
  p.status,
  p.learning_time_minutes as hours,
  p.pre_test_score,
  p.post_test_score,
  CASE 
    WHEN p.post_test_score >= q.passing_score THEN 'PASSED'
    WHEN p.post_test_score IS NULL THEN 'NOT TAKEN'
    ELSE 'FAILED'
  END as result
FROM user_course_progress p
JOIN courses c ON p.course_id = c.course_id
LEFT JOIN quizzes q ON c.course_id = q.course_id AND q.type = 'post'
WHERE p.user_id = 2;
```

### Check Course Enrollment Stats
```sql
SELECT 
  c.title,
  COUNT(p.user_id) as enrolled_count,
  SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) as completed,
  AVG(p.learning_time_minutes) as avg_learning_time,
  AVG(p.post_test_score) as avg_post_score
FROM courses c
LEFT JOIN user_course_progress p ON c.course_id = p.course_id
GROUP BY c.course_id, c.title;
```

### Verify Column Exists and Type
```sql
DESCRIBE user_course_progress;
```

**Expected output should show:**
```
learning_time_minutes | decimal(10,2) | NO | | 0 |
```

### Check for NULL values
```sql
SELECT COUNT(*) as null_count
FROM user_course_progress
WHERE learning_time_minutes IS NULL;
```

**Should return: 0** (all should have value or default 0)

## Data Migration (if needed)

If running on existing database with NULL values:

```sql
-- Set NULLs to 0
UPDATE user_course_progress 
SET learning_time_minutes = 0 
WHERE learning_time_minutes IS NULL;

-- Verify it worked
SELECT COUNT(*) 
FROM user_course_progress 
WHERE learning_time_minutes IS NULL; -- should be 0
```

## Testing Data Scenarios

### Scenario A: Create Test Data (Admin Testing)
```sql
-- Admin enrolls in course 1
INSERT INTO user_course_progress 
(user_id, course_id, status, enrolled_at)
VALUES (1, 1, 'enrolled', NOW());

-- Simulate 30 minutes of learning
UPDATE user_course_progress 
SET learning_time_minutes = 30.0
WHERE user_id = 1 AND course_id = 1;

-- Simulate taking pre-test
UPDATE user_course_progress 
SET pre_test_score = 75, status = 'in_progress'
WHERE user_id = 1 AND course_id = 1;

-- Simulate taking post-test and passing
UPDATE user_course_progress 
SET post_test_score = 88, status = 'completed', completed_at = NOW()
WHERE user_id = 1 AND course_id = 1;
```

### Scenario B: Multiple Users (User Testing)
```sql
-- Ensure test user exists
SELECT * FROM users WHERE username = 'user001';

-- Enroll user in multiple courses
INSERT INTO user_course_progress (user_id, course_id, status, enrolled_at)
VALUES 
  (2, 1, 'enrolled', NOW()),
  (2, 2, 'in_progress', NOW()),
  (2, 3, 'completed', NOW());

-- Add learning time to each
UPDATE user_course_progress SET learning_time_minutes = 15.5 WHERE user_id = 2 AND course_id = 1;
UPDATE user_course_progress SET learning_time_minutes = 45.3 WHERE user_id = 2 AND course_id = 2;
UPDATE user_course_progress SET learning_time_minutes = 120.0 WHERE user_id = 2 AND course_id = 3;
```

## Real-Time Monitoring During Testing

### Watch Progress Updates
```sql
-- Run every 30 seconds during testing:
SELECT 
  learning_time_minutes,
  status,
  updated_at
FROM user_course_progress 
WHERE user_id = 2 AND course_id = 1;
```

### Monitor Quiz Submissions
```sql
-- Check if quiz scores being saved:
SELECT 
  pre_test_score,
  post_test_score,
  status,
  updated_at
FROM user_course_progress 
WHERE course_id = 1
ORDER BY updated_at DESC;
```

### Verify Timer Accuracy
```sql
-- After 5 minutes of learning, learning_time_minutes should be ~5.0
-- Allow ±0.5 margin (depends on sync timing)
-- After 30 minutes, should be ~30.0

SELECT 
  full_name,
  learning_time_minutes,
  ROUND((learning_time_minutes * 60), 0) as seconds_estimate
FROM user_course_progress p
JOIN users u ON p.user_id = u.user_id
WHERE p.user_id = 2;
```

## Performance Index Check

Verify indexes exist for efficient queries:

```sql
-- Check indexes
SHOW INDEXES FROM user_course_progress;

-- Expected indexes:
-- - PRIMARY KEY on progress_id
-- - FOREIGN KEY on user_id
-- - FOREIGN KEY on course_id
-- - UNIQUE KEY on (user_id, course_id)
```

## Backup Before Testing

Before running tests, backup the database:

```bash
# Backup
mysqldump -u root -p wph_training_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore if needed
mysql -u root -p wph_training_db < backup_20251127_140000.sql
```

## Data Cleanup After Testing

If test data needs to be removed:

```sql
-- Delete all progress records
DELETE FROM user_course_progress;

-- Reset auto-increment
ALTER TABLE user_course_progress AUTO_INCREMENT = 1;

-- Verify
SELECT COUNT(*) FROM user_course_progress; -- should be 0
```

---

**Note**: All `learning_time_minutes` values should be DECIMAL(10,2) format with values like 0, 15.5, 45.3, etc., never NULL for enrolled users.

