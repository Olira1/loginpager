# School Portal API - Postman Collection

This folder contains Postman files for testing the School Portal backend API.

## Files

| File | Description |
|------|-------------|
| `School_Portal_API.postman_collection.json` | Main API collection with all endpoints |
| `School_Portal_Local.postman_environment.json` | Environment variables for local testing |

## How to Import

### Step 1: Import Collection
1. Open Postman
2. Click **Import** button (top-left)
3. Drag and drop `School_Portal_API.postman_collection.json` or click **Upload Files**
4. Click **Import**

### Step 2: Import Environment
1. Click **Import** button again
2. Drag and drop `School_Portal_Local.postman_environment.json`
3. Click **Import**

### Step 3: Select Environment
1. Click the **Environment** dropdown (top-right, next to the eye icon)
2. Select **"School Portal - Local"**

## How to Use

### Authentication Flow

1. **Start the server** (if not running):
   ```bash
   cd SchoolPortal/backend
   node server.js
   ```

2. **Login to get a token**:
   - Go to **1. Authentication** folder
   - Choose the login request for your role (Admin, School Head, Teacher, etc.)
   - Click **Send**
   - Copy the `access_token` from the response

3. **Set the token**:
   - Click the **Environment quick look** (eye icon, top-right)
   - Click **Edit** next to "School Portal - Local"
   - Paste the token in the `token` variable's **Current Value**
   - Click **Save**

4. **Test other endpoints**:
   - Now all authenticated endpoints will use your token automatically

### Test Users

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@schoolportal.edu.et | password123 |
| School Head | kebede@aass.edu.et | password123 |
| Teacher | tigist@aass.edu.et | password123 |
| Class Head | berhanu@aass.edu.et | password123 |
| Student | abebe.k@student.aass.edu.et | password123 |
| Parent | kebede.d@parent.aass.edu.et | password123 |
| Store House | mulugeta@aass.edu.et | password123 |

## Collection Structure

```
School Portal API/
├── 1. Authentication/
│   ├── Login - Admin
│   ├── Login - School Head
│   ├── Login - Teacher
│   ├── Login - Class Head
│   ├── Login - Student
│   ├── Login - Parent
│   ├── Login - Store House
│   ├── Get Current User
│   └── Logout
│
├── 2. Admin/
│   ├── Schools/
│   │   ├── List Schools
│   │   ├── Get School Details
│   │   ├── Create School
│   │   ├── Update School
│   │   ├── Activate School
│   │   ├── Deactivate School
│   │   └── Delete School
│   ├── Promotion Criteria/
│   │   ├── List Promotion Criteria
│   │   ├── Get Promotion Criteria
│   │   ├── Create Promotion Criteria
│   │   ├── Update Promotion Criteria
│   │   └── Delete Promotion Criteria
│   └── Statistics/
│       └── Get Platform Statistics
│
├── 3. School Head/
│   ├── Grades/
│   ├── Classes/
│   ├── Subjects/
│   ├── Assessment Types/
│   ├── Teaching Assignments/
│   └── Teachers/
│
├── 4. Teacher/
│   ├── View Assignments/
│   ├── Assessment Weights/
│   ├── Student Grades/
│   └── Submissions/
│
├── 5. Class Head/
│   ├── Student List/
│   ├── Submissions/
│   ├── Grade Management/
│   ├── Reports/
│   └── Store House/
│
├── 6. Student/
│   ├── Profile/
│   ├── Reports/
│   └── Grades/
│
├── 7. Parent/
│   ├── Children/
│   ├── Reports/
│   └── Grades/
│
└── 8. Store House/
    ├── Rosters/
    ├── Students/
    └── Transcripts/
```

## Testing Tips

1. **Test in order**: Start with Authentication, then test endpoints for each role
2. **Change tokens**: When switching roles, login with that role's credentials and update the token
3. **Check IDs**: Some endpoints require specific IDs - check the database or list endpoints first
4. **Query parameters**: Many GET endpoints support filtering with query parameters

## Troubleshooting

| Error | Solution |
|-------|----------|
| `No token provided` | Login first and set the token in environment |
| `Invalid token` | Token may be expired - login again |
| `Not found` | Check if the ID exists in the database |
| `Forbidden` | You're using a token for wrong role |
| `Connection refused` | Server not running - start with `node server.js` |

