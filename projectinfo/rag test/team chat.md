#team3-backend

**ayan:** Morning. Did you get a chance to look at that duplicate invoice issue support reported yesterday?

**sanjay:** Not yet. I reproduced it once in staging though. Create invoice → edit amount → search customer. Somehow two rows appear in the table.

**ayan:** Actual duplicates in DB or frontend cache weirdness?

**sanjay:** Database only has one row. Looks like frontend state or query cache issue.

**ayan:** Good. Better than corrupted data.

**sanjay:** Yeah. Also reports endpoint gets really slow when I seed 100k invoices.

**ayan:** Monthly report?

**sanjay:** Yep. /reports/monthly takes around 7 seconds.

**ayan:** That's expected. We said large reports should go through Celery workers. API doc mentions that.

**sanjay:** True. I think we should cache report summaries in Redis too.

**ayan:** Dashboard already refreshes every 5 mins. Same strategy should work.

---

**sanjay:** Another question. BR-003 says paid invoices can't be deleted. Support asked whether organization owners should have override permissions.

**ayan:** Hmm. Docs say blocked for everyone. I'd rather keep it that way.

**sanjay:** Yeah otherwise audit trail becomes messy.

**ayan:** Ask product before changing anything.

---

**sanjay:** Finance team requested reminder settings.

**ayan:** Invoice reminders?

**sanjay:** Yeah currently renewal notifications are fixed at 7 days.

**ayan:** BR-007.

**sanjay:** They want 3 days and 1 day reminders too.

**ayan:** Not for v1. Put it in backlog.

---

**sanjay:** Customer uploaded a 17MB PDF receipt yesterday and got an error.

**ayan:** Working as expected. Max size is 10MB.

**sanjay:** Enterprise customers asking for bigger limit.

**ayan:** Object storage costs already increasing. ayanesh mentioned that in ops meeting.

**sanjay:** Maybe compress PDFs before upload?

**ayan:** Could work.

---

**sanjay:** Redis died last Friday right?

**ayan:** Yeah dashboard latency jumped to 8 seconds.

**sanjay:** Celery queues also got stuck?

**ayan:** Couple workers froze. Restart fixed it.

**sanjay:** Need proper monitoring.

**ayan:** Thinking Prometheus + Grafana later.

---

**sanjay:** Search performance still bad.

**ayan:** Which filters?

**sanjay:** customer_name partial matching.

**ayan:** Did you add index?

**sanjay:** Not yet.

**ayan:** Start with index on customer_name and invoice_status. Elasticsearch feels overkill.

**sanjay:** Agreed.

---

**ayan:** BTW support keeps asking for dark mode.

**sanjay:** 😂 Every SaaS app eventually gets that request.

**ayan:** Also multi-currency.

**sanjay:** That's definitely not Q3.

**ayan:** Stripe integration first.

**sanjay:** OCR receipts too.

**ayan:** One feature at a time 😄

---

**sanjay:** Invite links expire after 48h right?

**ayan:** Yep.

**sanjay:** Accountant users want 7 days.

**ayan:** Docs say 48h. Security > convenience.

**sanjay:** Fair.

---

**ayan:** Before tomorrow's standup let's prioritize:

* Duplicate invoice search bug.
* Report endpoint benchmark.
* Index customer_name.
* Investigate Redis outage root cause.
* Finish customer_email field migration.

**sanjay:** Sounds good. I'll push my changes tonight.

**ayan:** 👍

**hex(ai)**Hex(ai repley after i ran /ai summarize)
AI Assistant
Summary of Discussion
### Key Topics Discussed
1. Report Endpoint Performance: The /reports/monthly endpoint is slow when handling large reports, and it was suggested to use Celery workers for large reports.
2. Caching Report Summaries: Caching report summaries in Redis was proposed to improve performance.
3. Invoice Deletion: The team discussed whether organization owners should have override permissions to delete paid invoices, but decided to maintain the current block for everyone.
4. Reminder Settings: The finance team requested customizable reminder settings, but this feature was put on the backlog for now.
5. File Upload Limit: Enterprise customers are requesting a larger file upload limit, and compressing PDFs before upload was suggested as a potential solution.
6. Redis Outage: The team discussed the recent Redis outage and the need for proper monitoring, with Prometheus and Grafana proposed as potential solutions.
7. Search Performance: The team discussed improving search performance, particularly for customer_name partial matching, and decided to start by adding an index on customer_name and invoice_status.
8. Feature Requests: The team received requests for dark mode, multi-currency support, and OCR receipts, but prioritized other features, such as Stripe integration, for now.
### Decisions Made
1. Maintain the current block on deleting paid invoices for everyone.
2. Put customizable reminder settings on the backlog for now.
3. Prioritize other features, such as Stripe integration, over dark mode, multi-currency support, and OCR receipts.
4. Use Celery workers for large reports.
5. Add an index on customer_name and invoice_status to improve search performance.
### Action Items
1. Sanjay:
Push changes tonight.
Investigate the root cause of the Redis outage.
2. Team:
Prioritize the following tasks before tomorrow's standup:
		+ Duplicate invoice search bug.
		+ Report endpoint benchmark.
		+ Index customer_name.
		+ Investigate Redis outage root cause.
		+ Finish customer_email field migration.
3. Ayan:
Consider implementing Prometheus and Grafana for monitoring.
Review and prioritize the backlog of feature requests.

 user asked **Why can't paid invoices be deleted?** using the **/ai ask command**
**hex(ai)**[Source: Business Requirements Specification (BRS)] According to Business Rule BR-003, invoices marked as Paid cannot be deleted. This rule is also enforced in the Invoice APIs, as stated in [Source: CloudLedger API Specification and Integration Guide].
Sources:
[User Stories, Sprint Planning and Development Roadmap](/dashboard/docs/d349842d-c59b-4499-86cf-c956fd4146f0) (Chunk #1)
[Random notes + future ideas + some things discussed in meeting](/dashboard/docs/f3b24b83-ad20-45dc-9ed7-2fc851654c32) (Chunk #1)
[Business Requirements Specification (BRS)](/dashboard/docs/5e060adb-d060-41b4-a924-50289ef1bf78) (Chunk #1)
[CloudLedger API Specification and Integration Guide](/dashboard/docs/b1215f9b-7360-460b-8532-98a845522fb8) (Chunk #2)
[CloudLedger Product Requirements Document (PRD)](/dashboard/docs/3e531b96-3c0b-4fc0-a67b-2c5830c8df24) (Chunk #1)

user asked **What happens if Redis goes down?** using the **/ai ask command**
**hex(ai)**If Redis goes down, it may cause slow dashboard loading and queue delays, as Redis is used for caching and queue management. According to the incident response procedures in the [Source: Deployment, Operations and Incident Response Guide], the actions to take in case of a Redis failure include restarting the Redis instance, clearing the corrupted cache, rebuilding the cache, and monitoring the Celery queue.
Sources:
[Deployment, Operations and Incident Response Guide](/dashboard/docs/ce5ac465-5d13-4f76-9864-fb3a58d4095f) (Chunk #2)
[Deployment, Operations and Incident Response Guide](/dashboard/docs/ce5ac465-5d13-4f76-9864-fb3a58d4095f) (Chunk #1)
[Deployment, Operations and Incident Response Guide](/dashboard/docs/ce5ac465-5d13-4f76-9864-fb3a58d4095f) (Chunk #3)
[User Stories, Sprint Planning and Development Roadmap](/dashboard/docs/d349842d-c59b-4499-86cf-c956fd4146f0) (Chunk #2)
[System Architecture Document (SAD)](/dashboard/docs/49b27729-9269-437e-9be1-615e1cc4107c) (Chunk #1)