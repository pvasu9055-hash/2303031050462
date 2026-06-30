# Notification System Design

## Stage 1

### REST API Endpoints

**1. Get notifications for logged-in user**

```
GET /api/notifications?userId={userId}&limit=20&offset=0
Headers: Authorization: Bearer <token>

Response:
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "Google hiring drive scheduled",
      "isRead": false,
      "createdAt": "2026-06-30T10:00:00Z"
    }
  ],
  "totalCount": 45
}
```

**2. Mark a notification as read**

```
PATCH /api/notifications/{id}/read
Headers: Authorization: Bearer <token>

Response:
{
  "id": "uuid",
  "isRead": true
}
```

**3. Create a new notification (admin/system use)**

```
POST /api/notifications
Headers: Authorization: Bearer <token>
Body:
{
  "userId": "uuid",
  "type": "Result",
  "message": "Mid-sem results published"
}

Response:
{
  "id": "uuid",
  "createdAt": "2026-06-30T10:05:00Z"
}
```

### Real-time mechanism

For real-time delivery, I would use WebSockets. When a user logs in, the client opens a persistent WebSocket connection to the server. When a new notification is created, the server pushes it directly to the connected client through that socket, instead of the client repeatedly asking the server for updates. This avoids constant polling and gives instant delivery. As a fallback, Server-Sent Events (SSE) can be used as an alternative one-way push channel.

---

## Stage 2

### Database choice: PostgreSQL

I would use PostgreSQL because notification data is structured, relational (tied to users), and benefits from indexing and querying capabilities that a relational DB provides well.

### Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT NOT NULL REFERENCES users(id),
  notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('Event', 'Result', 'Placement')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
CREATE INDEX idx_notifications_type ON notifications(notification_type);
```

### Problems with increased data volume

As notification volume grows, queries filtering by user and sorting by recency will slow down without proper indexes. The table will also grow very large over time, making backups and maintenance slower.

### Solutions

I would add composite indexes on frequently queried column combinations (like user_id + created_at), and consider partitioning the table by date range once volume crosses a threshold. Older notifications could be archived to a separate cold-storage table.

---

## Stage 3

### Is the query accurate? Why is it slow?

```sql
SELECT * FROM students 
WHERE notification_type = 'Placement' 
AND created_at >= NOW() - INTERVAL '7 days';
```

This query is functionally correct, but slow without an index on notification_type and created_at, since the database performs a full table scan checking every row.

### Is "add an index on every column" good advice?

No. Adding an index on every column is not good advice. While indexes speed up reads, every additional index slows down writes since the database has to update all indexes on every insert/update, and increases storage usage. Indexes should be added selectively based on actual query patterns.

### Better approach

Add a composite index specifically on (notification_type, created_at) since that matches exactly how the query filters data.

### Finding students who got a placement notification in the last 7 days

```sql
SELECT s.* 
FROM students s
JOIN notifications n ON s.id = n.user_id
WHERE n.notification_type = 'Placement'
AND n.created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4

### Problem

Notifications are fetched on every page load for every student, creating heavy repeated load on the database and poor user experience due to latency.

### Solution

I would introduce a caching layer using Redis. Notifications fetched for a user are cached for 30-60 seconds keyed by userId. Subsequent page loads within that window are served from cache instead of hitting the database again. Combined with the WebSocket push mechanism from Stage 1, the frontend doesn't need to re-fetch on every page load at all — it listens for new notifications pushed in real time, with only one initial fetch per session.

### Tradeoffs

Caching introduces slight staleness (a few seconds delay), which is acceptable given notifications aren't extremely time-critical at the millisecond level. The benefit of reduced database load and faster response times outweighs this small staleness window.

---

## Stage 5

### Shortcomings of the original pseudocode

```
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    send_email(student_id, message)
    save_to_db(student_id, message)
    push_to_app(student_id, message)
```

The biggest shortcoming is that this loop runs synchronously and sequentially for 50,000 students. If send_email fails partway through, the process can be interrupted with no automatic retry. There's no error handling, so one failure could halt the entire batch. Doing this within a single function/request makes it slow and not horizontally scalable.

### Redesign

I would decouple this into an asynchronous queue-based system. The notify_all function would push a job for each student onto a message queue (e.g., RabbitMQ, AWS SQS, or BullMQ with Redis). Separate worker processes would consume these jobs in parallel. If a job fails, the queue system can automatically retry it before marking it as failed for manual review, instead of silently failing or blocking the whole batch.

Saving to DB and sending the email should be decoupled. I would save the notification to the DB first (fast and reliable), and treat the email/push notification as sent only after successful delivery. This way, even if the email fails, the student still sees the notification in-app, and the email can be retried independently.

### Revised pseudocode

```
function notify_all(student_ids: array, message: string):
  for student_id in student_ids:
    save_to_db(student_id, message)
    enqueue_job("send_notification", { student_id, message })

function process_notification_job(job):
  try:
    send_email(job.student_id, job.message)
    push_to_app(job.student_id, job.message)
    mark_job_complete(job.id)
  except Error as e:
    retry_job(job.id, max_retries=3)
    if retries_exhausted:
      log_to_dead_letter_queue(job)
```

This way, saving to DB happens fast and reliably for all 50,000 students immediately, while emails and push notifications happen asynchronously in the background with retry logic.
