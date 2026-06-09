# thoraHELP Auth Testing Playbook

## Strategy
Auth uses JWT in httpOnly cookie `access_token` (15 min) + `refresh_token` (7 days). Also supports `Authorization: Bearer <token>` header fallback.

## Admin (seeded)
- email: `admin@thorahelp.app`
- password: `Admin@12345`

## Register a test user
```
curl -c /tmp/c.txt -X POST $REACT_APP_BACKEND_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@thorahelp.app","password":"Test@12345","name":"Test User"}'
```

## Login
```
curl -c /tmp/c.txt -X POST $REACT_APP_BACKEND_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@thorahelp.app","password":"Admin@12345"}'
```

## Test /me
```
curl -b /tmp/c.txt $REACT_APP_BACKEND_URL/api/auth/me
```

## Browser cookie test
The login response also returns `{"access_token":"...","user":{...}}` in body; frontend can use either cookie or header.
