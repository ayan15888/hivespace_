# random notes + future ideas + some things discussed in meeting

cloudledger notes from calls and slack + stuff not yet final

---

need to revisit invoice email flow because currently invoice reminder thing says 7 days before due but maybe make configurable ??? ask product team.

invoice pdf export maybe watermark?? not sure.

also talked about stripe integration with finance people, but probably not v1.

---

expense categories maybe too generic

Travel
office supplies
marketing
software
misc

need category for legal maybe ?

someone said contractors too

---

reports slow with bigger datasets maybe move some calculations into background jobs. celery already there anyway according to arch doc.

possible issue:
monthly report endpoint maybe timeout if company has 100k invoices.

idea:
cache report results in redis for 5 mins same as dashboard metrics

---

TODO backend

[] check invoice delete logic
paid invoices cannot be deleted (BR-003)
draft invoice delete ok
pending invoice maybe confirmation popup??

need ask UX

---

Notification stuff

email reminders currently 7 days before renewal according BR-007

maybe add

3 day reminder
1 day reminder

not priority

---

random db thoughts

users table probably fine

invoice table maybe need customer_email field because sending invoice manually not ideal.

expense table maybe tags ?? optional

audit logs retention 365 days but what if customer enterprise plan want 2 years? later.

---

meeting with team3

raj said object storage cost can increase because receipts + pdf exports.

possible compression before upload ??

jpeg ok but pdf sometimes huge.

need benchmark

---

security things

jwt expiration 8 hours

someone suggested 24h but security issue maybe.

refresh token logic should be enough

add brute force protection login endpoint ? maybe rate limit 10 req/min already.

---

customer feedback

"search is slow"

might be because no index on invoice status + customer_name

need check postgres query plan.

also partial matching expensive.

maybe trigram index later

---

future

ocr receipts
AI expense categorization
mobile app
quickbooks sync

don't know order.

---

BUGS FOUND STAGING

invoice search returns duplicates sometimes

reproduce:

create invoice
edit invoice
search customer

got 2 rows ??? not sure if frontend issue.

need investigate.

---

notes from support call

customer wanted:

multi currency

invoice templates

dark mode

bulk invoice import csv

sub accounts for accountants

probably not q3

---

infra stuff

redis restart last week caused dashboard lag

maybe cache rebuild job needed.

also celery queue had stuck jobs.

check if workers auto restart.

---

things for later

kubernetes maybe overkill rn

docker compose ok

monitor api latency

keep under 300ms target

need dashboard for metrics

grafana ??

prometheus ??

---

question

should invitation emails expire after 48 hrs or 72?

docs say 48.

one customer asked longer because some people don't check email.

---

api stuff

POST /api/v1/invoices works

need bulk endpoint

POST /api/v1/invoices/bulk

not sure request format.

csv upload maybe easier

---

meeting notes 12 june

finance manager should maybe edit approved expenses?? currently no.

BR-004 says only approve expenses.

editing after approval maybe weird.

need clarify with product.

---

ideas from slack

"what happens if redis down"

fallback direct db queries ??

might increase latency though.

need ask devops.

---

search improvement ideas

elasticsearch??

postgres full text search enough?

embedding search not needed maybe.

---

NOT FINAL

clean up later
