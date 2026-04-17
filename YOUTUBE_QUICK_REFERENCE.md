# 🎥 YouTube Video Player - Quick Reference

## For Admins

### Adding a YouTube Video to Course

1. **Get the YouTube URL**
   - Any of these formats work:
     - `https://www.youtube.com/watch?v=VIDEO_ID`
     - `https://youtu.be/VIDEO_ID`
     - `https://www.youtube.com/embed/VIDEO_ID`

2. **Create/Edit Course Material**
   ```
   1. Go to Course Admin
   2. Select course
   3. Add Material
   4. Type: วิดีโอ (Video)
   5. Title: [Your title]
   6. URL: [Paste YouTube URL]
   7. Save ✅
   ```

3. **View the Video**
   ```
   1. Go to หลักสูตรออนไลน์
   2. Click course
   3. Click video material
   4. Video plays! ✅
   ```

---

## For Users

### Watching a Video

```
1. Go to หลักสูตรออนไลน์
2. Click course title
3. Click video from list
4. Video opens with:
   - Full screen button
   - Play/pause controls
   - Volume control
   - Learning timer (automatic)
```

---

## Testing

### Quick Test
Visit: **http://localhost:3000/youtube-test.html**

Paste your YouTube URL to test if it works!

### Example Test Link
```
https://www.youtube.com/watch?v=CmPvaKibA6o
```

---

## Troubleshooting

### Video Won't Play?

1. **Check URL Format** ✅
   - Visit: http://localhost:3000/youtube-test.html
   - Paste your URL
   - If preview shows → URL is correct

2. **Clear Browser Cache** ✅
   - Press: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
   - Select "Clear browsing data"
   - Refresh page

3. **Check Browser Console** ✅
   - Press: F12
   - Click: Console tab
   - Look for error messages

4. **Test Video Embedding** ✅
   - Try: https://www.youtube.com/embed/VIDEO_ID
   - If this works in browser → our code is working
   - If not → video might have restrictions

### Common Issues

| Problem | Solution |
|---------|----------|
| Video says "Error 153" | Clear browser cache + refresh |
| "Wrong URL format" | Use standard YouTube URL |
| "Video not embeddable" | Video might be private |
| No play button | Browser JavaScript disabled? |
| Black screen | Check YouTube directly |

---

## Supported Formats

✅ All these YouTube URL formats work:

```
https://www.youtube.com/watch?v=CmPvaKibA6o
https://youtu.be/CmPvaKibA6o
https://www.youtube.com/embed/CmPvaKibA6o
https://www.youtube.com/v/CmPvaKibA6o
https://www.youtube.com/watch?v=CmPvaKibA6o&t=10s
```

---

## Key Features

✨ **What's Included:**

- ✅ Full video controls (play, pause, seek)
- ✅ Fullscreen mode
- ✅ Volume control
- ✅ Automatic learning time tracking
- ✅ Works on all browsers
- ✅ Works on mobile devices
- ✅ Responsive design

---

## Console Logs (For Debugging)

When you click a video, console shows:

```javascript
Material URL: https://www.youtube.com/watch?v=CmPvaKibA6o
Extracted Video ID: CmPvaKibA6o
Embed URL: https://www.youtube.com/embed/CmPvaKibA6o
```

If you see these → everything is working! ✅

---

## Browser Support

✅ Works on:
- Google Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers

---

## Links

- 📖 Full troubleshooting: `YOUTUBE_TROUBLESHOOTING.md`
- 📖 Detailed fix report: `YOUTUBE_VIDEO_FIX.md`
- 📖 Implementation summary: `YOUTUBE_FIX_SUMMARY.md`
- 🧪 Test page: http://localhost:3000/youtube-test.html
- 🚀 Deployment guide: `DEPLOYMENT_GUIDE.md`

---

## Need Help?

1. **Test Page**: http://localhost:3000/youtube-test.html
2. **Browser Console**: F12 → Console
3. **Documentation**: See files above
4. **Check Logs**: npm run dev (watch console)

---

✅ **Status**: Ready to use!

