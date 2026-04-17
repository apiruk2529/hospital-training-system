# Quick Start: Phase 2-5 Features

## 60-Second Setup

```bash
# 1. Reset database with new schema
mysql -u root -p < database/schema.sql
npm run init-db

# 2. Start server
npm run dev

# 3. Open browser
http://localhost:3000
```

## Test Accounts
- **Admin**: `admin` / `admin123`
- **User**: `user001` / `user123`

## What's New

### For Admins
1. Go to "หลักสูตรออนไลน์" tab
2. Click course → "ดูตัวอย่าง" (View)
3. Click "ลงทะเบียนเรียน (Admin)" button
4. Now you can:
   - View materials (🎥 videos, 📄 PDFs)
   - See learning time counter
   - Take pre/post tests
   - See quiz scores

### For Users
1. Same as admin, but:
   - Button says "ลงทะเบียนเรียน" (not Admin)
   - Can't edit/delete courses
   - Only see their own progress

## Key Features

| Feature | How It Works |
|---------|-------------|
| **Enrollment** | Click button → creates progress record |
| **Materials** | Click item → starts timer automatically |
| **Timer** | Auto-syncs every 30 seconds to database |
| **Quizzes** | Pre-test first, then post-test |
| **Scores** | Post-test passes automatically mark course complete |

## File Changes Summary

```
✅ database/schema.sql
   └─ Added: learning_time_minutes DECIMAL(10,2)

✅ server/routes/courses.js
   ├─ Enhanced: GET /:id (returns progress for all)
   ├─ New: POST /:id/enroll
   └─ New: POST /:id/unenroll

✅ server/routes/quizzes.js
   └─ Enhanced: POST /submit (better validation)

✅ public/js/online-training.js
   ├─ Enhanced: showCourseDetail() (admin support)
   ├─ New: startTimer() / stopTimer()
   ├─ New: syncProgress()
   └─ Enhanced: viewMaterial() (timer integration)

✅ TESTING_CHECKLIST.md (New)
✅ IMPLEMENTATION_GUIDE.md (New)
✅ PHASE_2_5_SUMMARY.md (New)
```

## Common Workflows

### As Admin: Create & Take Course
```
1. Admin Dashboard
2. Create new course + add materials + add quiz
3. Go to Online Training
4. View course, enroll
5. Take pre-test, view materials, take post-test
6. Check learning time accumulated
```

### As User: Enroll & Learn
```
1. Login as user001
2. Go to Online Training
3. Find course, click "เข้าสู่บทเรียน"
4. Click enrollment button
5. Watch materials (timer starts)
6. Take tests when ready
7. See completion status
```

### Verify Data in Database
```sql
-- Check user's progress
SELECT * FROM user_course_progress WHERE user_id = 1;

-- See learning time
SELECT full_name, learning_time_minutes, status 
FROM user_course_progress p
JOIN users u ON p.user_id = u.user_id
WHERE p.course_id = 1;

-- Check quiz scores
SELECT pre_test_score, post_test_score, status 
FROM user_course_progress 
WHERE course_id = 1;
```

## If Something Breaks

| Issue | Fix |
|-------|-----|
| Enrollment doesn't work | Check: Is user logged in? Does course exist? |
| Timer not tracking | Check: Start viewing material, check browser console for errors |
| Time not saving | Check: Server running? /api/progress/update endpoint working? |
| Quiz fails to load | Check: Does course have quiz? Does quiz have questions? |
| Admin can't enroll | Check: Token valid? Course exists? Not already enrolled? |

## Endpoints Cheat Sheet

```javascript
// Enroll
POST /api/courses/{courseId}/enroll

// Get course + materials + quizzes + progress
GET /api/courses/{courseId}

// Submit quiz
POST /api/quizzes/submit
{
  "courseId": 1,
  "quizType": "pre", // or "post"
  "answers": {
    "question_id_1": answer_id_1,
    "question_id_2": answer_id_2
  }
}

// Sync learning time (auto-called)
POST /api/progress/update
{
  "courseId": 1,
  "timeSpent": 0.5  // minutes
}

// Get learning time
GET /api/progress/{courseId}
```

## Testing Checklist (5 min)

- [ ] Admin can view course list
- [ ] Admin can enroll in course
- [ ] Course detail page shows materials
- [ ] Clicking material starts video/PDF
- [ ] Time counter appears and increments
- [ ] Back button returns to course list
- [ ] User can enroll similarly
- [ ] Quiz loads and calculates score

## Performance Tips

1. **First load**: Course list may take 2 seconds (normal)
2. **Videos**: YouTube loads separately, check network tab
3. **PDFs**: Large PDFs may take time to render
4. **Timer**: Runs every 5 seconds, check = doesn't impact performance
5. **Quiz modal**: Should open instantly

## Browser Console Monitoring

Open Developer Tools (F12) and watch for:
- ✅ No 401/403 errors
- ✅ Progress updates show 200 status
- ✅ No memory leaks on page switches
- ✅ Timer clears on exit (no orphaned intervals)

---

**Ready to test?** Start with "60-Second Setup" above! 🚀

