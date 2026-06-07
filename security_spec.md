# Security Specification

## Data Invariants
1. Users must have a status defined ('pending', 'active', 'disabled').
2. Only 'active' users can access non-public data (This is enforced by rules).
3. Access matrix defines permissions per role.
4. Audit logs are immutable records.

## The "Dirty Dozen" Payloads (Examples)
1. User sets own status to 'active'.
2. User sets their role to 'admin'.
3. Unauthenticated user lists all users.
4. 'Pending' user reads clinical records.
5. User modifies audit log.
6. User modifies access matrix.
7. User creates user with non-existent role.
8. Injection in permissionId field.
9. Injection in roleId field.
10. Attempt to update audit log.
11. Admin user from 'pending' status tries to activate self.
12. User with no role attempts to gain permission.

## Security Test Runner (Summary)
[To be implemented in firestore.rules.test.ts]
Will verify that all above payloads result in PERMISSION_DENIED.
