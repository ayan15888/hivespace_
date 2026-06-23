**Q1.Why can't paid invoices be deleted?**
According to BR-003 in the Business Requirements Specification, paid invoices cannot be deleted. This rule is enforced by the Invoice Service and the API layer. During a Team3 backend discussion, the possibility of allowing organization owners to override this restriction was discussed, but the team decided to keep deletion blocked for everyone to preserve audit trails and data integrity.


**Q2.What happens if Redis goes down?**
A Redis outage previously caused dashboard latency to increase significantly and Celery queues became stuck. Workers had to be restarted to restore service. The Operations Guide recommends cache rebuilding and Redis recovery procedures. The team also discussed introducing Prometheus and Grafana monitoring to improve observability and incident response.
