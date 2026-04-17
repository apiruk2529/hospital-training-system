# Testing Checklist for Phase 2-5 Implementation

## Environment Setup
- [ ] Database reset with updated schema (`npm run init-db`)
- [ ] Server running (`npm run dev`)
- [ ] Browser console open for debugging
- [ ] Two browser windows open for admin/user testing

## Phase 2: Course Registration & Course Detail Page

### Admin Functionality
- [ ] Admin can view course list
- [ ] Admin can click "ดูตัวอย่าง" to view course detail
- [ ] Admin enrollment button shows "ลงทะเบียนเรียน (Admin)"
- [ ] Admin can enroll in course (creates user_course_progress record)
- [ ] Admin can view enrolled course materials
- [ ] Admin can see all course quizzes

### User Functionality
- [ ] User can view course list
- [ ] User can click "เข้าสู่บทเรียน" to view course detail
- [ ] Unenrolled users see enrollment button only
- [ ] User can enroll in course
- [ ] User can view enrolled course materials
- [ ] User can see quiz buttons for available quizzes

### Materials Display
- [ ] Videos load with YouTube embed
- [ ] YouTube video player controls work
- [ ] PDF documents load in viewer
- [ ] Material list shows proper icons (🎥 for video, 📄 for PDF)
- [ ] Clicking material highlights it as active
- [ ] Multiple materials can be clicked without errors

## Phase 3: Quiz System Testing

### Pre-Test
- [ ] Pre-test button shows for enrolled users
- [ ] Pre-test opens modal with questions
- [ ] All questions display correctly
- [ ] Answer options display without correct answer indicator
- [ ] User can select all answers
- [ ] Submit button validates all questions answered
- [ ] Score calculates correctly

### Post-Test
- [ ] Post-test available after pre-test
- [ ] Post-test questions display correctly
- [ ] Passing score logic works
- [ ] Score updates user_course_progress
- [ ] Status changes to "completed" when passing post-test
- [ ] Can retake test multiple times
- [ ] Score improves when retaking

### Quiz Edge Cases
- [ ] Cannot submit incomplete quiz (error message shown)
- [ ] Score never exceeds 100%
- [ ] Passing score from quiz settings is respected

## Phase 4: Learning Time Tracking

### Timer Functionality
- [ ] Timer starts when opening material
- [ ] Timer stops when exiting course or closing page
- [ ] Time display shows in format: "⏱️ เวลาเรียนสะสม: X.X นาที"
- [ ] Time is accumulated across sessions
- [ ] Timer pauses when page is hidden (tab switch)
- [ ] Timer resumes when page is visible again

### Progress Sync
- [ ] Progress syncs every 30 seconds while viewing material
- [ ] Progress syncs when closing/leaving course
- [ ] learning_time_minutes column updates in database
- [ ] Time persists after page refresh
- [ ] Admin can see accumulated time for enrolled courses

### Auto-Save Behavior
- [ ] Every 30 seconds, progress updates to database
- [ ] No errors in console during auto-save
- [ ] Network requests show successful responses (200)

## Phase 5: Admin Access & System-wide Testing

### Admin Enrollment Permissions
- [ ] Admin enrollment endpoint accepts POST /courses/:id/enroll
- [ ] Admin gets same progress tracking as users
- [ ] Admin quiz submissions work identically to users
- [ ] Admin time tracking works

### End-to-End Flows
- [ ] Admin: Can create course → add materials → add quizzes → enroll → take tests → see time
- [ ] User: Can enroll → view materials → take tests → see time
- [ ] Multiple users: Can enroll in same course independently
- [ ] Progress isolation: User A's progress doesn't affect User B

### Database Validation
- [ ] `learning_time_minutes` column exists in user_course_progress
- [ ] Values stored as DECIMAL(10,2)
- [ ] Default value is 0
- [ ] No NULL values for enrolled users

### UI/UX Polish
- [ ] Enrollment button properly styled and clickable
- [ ] Learning time display styled consistently
- [ ] Quiz modal responsive on mobile/desktop
- [ ] Back button returns to course list
- [ ] All Thai text displays correctly
- [ ] No console errors during normal operation

## Bug Fixes & Optimizations

### Common Issues to Watch For
- [ ] CORS errors on progress update
- [ ] JWT token expiration during long sessions
- [ ] Floating point precision in time calculations
- [ ] Race conditions in timer/sync
- [ ] Modal not closing after quiz submission
- [ ] Progress not updating after page refresh

### Performance Checks
- [ ] Course list loads within 2 seconds
- [ ] Course detail loads within 2 seconds
- [ ] Quiz modal loads within 1 second
- [ ] No memory leaks when navigating between courses
- [ ] Timer cleanup when stopping (no orphaned intervals)

## Regression Testing

### Existing Features Still Work
- [ ] Login/logout functioning
- [ ] Training records CRUD operations
- [ ] Dashboard displays correctly
- [ ] User management (admin only)
- [ ] File uploads work
- [ ] Search/filter on records

## Sign-off Checklist
- [ ] All tests above completed
- [ ] No critical bugs found
- [ ] Admin testing completed
- [ ] User testing completed
- [ ] Edge cases handled
- [ ] UI is responsive and polished
- [ ] Ready for production deployment

