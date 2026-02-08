# Canonical Use Cases

Each question should be answerable by acx without leaking policy logic into application code. The list intentionally mixes RBAC, ABAC, ReBAC, task-based approvals, field-level rules, and contextual checks.

1) Can a member of the "finance" role view the invoice list for their tenant?
2) Can a contractor with role "viewer" download a file if the file is tagged "confidential"?
3) Can a project owner share a folder with a partner organization, and do files inside inherit access?
4) Can a collaborator view a nested file if they have access to the parent folder but the file is marked "private"?
5) Can a user with "editor" role update only the title field of a post but not the body?
6) Can a support agent update the "status" field but not the "amount" field on a payment?
7) Can the creator of an expense submit it for approval but not approve it themselves (separation of duties)?
8) Can a second approver override a rejection only if they are in a different department?
9) Can a device from an unmanaged profile access admin endpoints?
10) Can a user access payroll data only during business hours in their time zone?
11) Can a request originating from an untrusted IP range read any PII fields?
12) Can a user with "tenant_admin" role manage users in their tenant but not in other tenants?
13) Can a "tenant_admin" in tenant A grant a role that does not exist in tenant B?
14) Can a user assigned to project X view resources tagged with project X and region EU?
15) Can a user access a document if they are in a group that has access through a parent group (nested groups)?
16) Can a user access a record if they have a relationship like "assigned" or "watcher" (ReBAC)?
17) Can a user view a shared file if they are two hops away (shared by a colleague's team)?
18) Can a user in a partner org access a shared folder only if the contract status is "active"?
19) Can a user download a report only if they have completed the required training task?
20) Can a user access a feature flag only if they are in the "beta" cohort and opted in?
21) Can a user delete a project only if no active invoices exist (state-based rule)?
22) Can an internal admin impersonate a user only if the ticket is approved and logged?
23) Can a user with "manager" role approve timecards for direct reports but not peers?
24) Can a user see the "ssn" field on a profile only if they have "hr_read" and are in the same tenant?
25) Can a user export data only if their org has an "export" entitlement and rate limits allow it?
26) Can a user from tenant A view resources in tenant B if there is an explicit cross-tenant share?
27) Can a user edit a document only if they are the current editor in a locking workflow?
28) Can a user access an API only if their device attestation is valid and the risk score is below threshold?
29) Can a user approve a purchase order only if the amount is below their approval limit and they are not the requester?
30) Can a user view audit logs only if they are in the "security" role and on a corporate network?
