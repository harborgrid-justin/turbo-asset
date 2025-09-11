# Contributing to Turbo Asset

We love your input! We want to make contributing to this project as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

### Branch Strategy

- `main` - Production-ready code
- `develop` - Latest development changes
- `feature/*` - Feature branches
- `hotfix/*` - Critical bug fixes
- `release/*` - Release preparation

## Coding Standards

### TypeScript Standards

This project follows strict TypeScript standards:

```typescript
// ✅ Good - Explicit typing
interface UserService {
  createUser(data: CreateUserRequest): Promise<User>;
  getUserById(id: string): Promise<User | null>;
}

// ❌ Bad - Implicit any
function createUser(data) {
  return userRepository.create(data);
}
```

### Naming Conventions

#### Files and Directories
- **Services**: `UserService.ts`, `DocumentService.ts`
- **Controllers**: `UserController.ts`, `DocumentController.ts`
- **Types**: `UserTypes.ts`, `DocumentTypes.ts`
- **Constants**: `ApiConstants.ts`, `DatabaseConstants.ts`
- **Utilities**: `dateUtils.ts`, `stringUtils.ts`

#### Code Structure
```typescript
// ✅ Good - PascalCase for classes and interfaces
class UserService implements UserServiceInterface {
  private readonly _userRepository: UserRepository;

  // camelCase for methods and properties
  async createUser(userData: CreateUserRequest): Promise<User> {
    // Implementation
  }

  // Private methods with underscore prefix
  private _validateUserData(data: CreateUserRequest): boolean {
    // Implementation
  }
}

// Constants in UPPER_CASE
const DEFAULT_PAGE_SIZE = 20;
const API_ENDPOINTS = {
  USERS: '/api/users',
  DOCUMENTS: '/api/documents'
};
```

### Directory Structure

```
src/
├── api/                    # API layer
│   ├── controllers/        # Route controllers
│   ├── routes/            # Express routes
│   └── graphql/           # GraphQL schemas and resolvers
├── core/                  # Core application logic
│   ├── auth/              # Authentication logic
│   ├── config/            # Configuration files
│   ├── database/          # Database connection and utilities
│   ├── middleware/        # Express middleware
│   └── utils/             # Utility functions
├── services/              # Business logic services (max 2 levels deep)
│   ├── asset/             # Asset management services
│   ├── document/          # Document services
│   ├── finance/           # Financial services
│   ├── integration/       # External integrations
│   ├── portfolio/         # Portfolio management
│   ├── space/             # Space management
│   ├── tenant/            # Tenant management
│   └── workflow/          # Workflow services
├── shared/                # Shared utilities and types
│   ├── types/             # TypeScript type definitions
│   ├── interfaces/        # TypeScript interfaces
│   └── constants/         # Application constants
└── models/                # Data models and DTOs
```

### Code Quality Rules

1. **Maximum Function Length**: 50 lines
2. **Maximum File Length**: 300 lines
3. **Maximum Directory Nesting**: 3 levels
4. **Cyclomatic Complexity**: Maximum 10
5. **Test Coverage**: Minimum 70%

### Error Handling

```typescript
// ✅ Good - Structured error handling
class UserService {
  async createUser(userData: CreateUserRequest): Promise<ApiResponse<User>> {
    try {
      const validatedData = this._validateUserData(userData);
      const user = await this._userRepository.create(validatedData);
      
      return {
        success: true,
        data: user,
        message: 'User created successfully'
      };
    } catch (error) {
      logger.error('Failed to create user', { error, userData });
      
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message,
            details: error.details
          }
        };
      }
      
      throw error; // Re-throw unexpected errors
    }
  }
}

// ❌ Bad - Catching and ignoring errors
async createUser(userData) {
  try {
    return await userRepository.create(userData);
  } catch (error) {
    console.log('Error occurred');
    return null;
  }
}
```

### Testing Standards

#### Unit Tests
```typescript
// UserService.test.ts
describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    mockUserRepository = createMockUserRepository();
    userService = new UserService(mockUserRepository);
  });

  describe('createUser', () => {
    it('should create user successfully with valid data', async () => {
      // Arrange
      const userData = createValidUserData();
      const expectedUser = createExpectedUser();
      mockUserRepository.create.mockResolvedValue(expectedUser);

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedUser);
      expect(mockUserRepository.create).toHaveBeenCalledWith(userData);
    });

    it('should handle validation errors appropriately', async () => {
      // Test implementation
    });
  });
});
```

#### Integration Tests
```typescript
// UserController.integration.test.ts
describe('UserController Integration', () => {
  let app: Express;
  let testDatabase: TestDatabase;

  beforeAll(async () => {
    testDatabase = await setupTestDatabase();
    app = createTestApp();
  });

  afterAll(async () => {
    await teardownTestDatabase(testDatabase);
  });

  describe('POST /api/users', () => {
    it('should create user with valid request', async () => {
      const userData = createValidUserData();

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(userData.email);
    });
  });
});
```

## API Design Standards

### RESTful API Guidelines

1. **Resource Naming**: Use nouns, not verbs
   - ✅ `GET /api/users`
   - ❌ `GET /api/getUsers`

2. **HTTP Methods**:
   - `GET` - Retrieve data
   - `POST` - Create new resource
   - `PUT` - Update entire resource
   - `PATCH` - Partial update
   - `DELETE` - Remove resource

3. **Status Codes**:
   - `200` - Success
   - `201` - Created
   - `400` - Bad Request
   - `401` - Unauthorized
   - `403` - Forbidden
   - `404` - Not Found
   - `500` - Internal Server Error

4. **Response Format**:
```typescript
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### GraphQL Standards

```typescript
// ✅ Good - Clear schema definition
type User {
  id: ID!
  email: String!
  firstName: String!
  lastName: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateUserInput {
  email: String!
  firstName: String!
  lastName: String!
  password: String!
}

type Mutation {
  createUser(input: CreateUserInput!): UserResponse!
}

type UserResponse {
  success: Boolean!
  user: User
  errors: [ValidationError!]
}
```

## Database Standards

### Schema Design
1. Use descriptive table and column names
2. Always include `id`, `createdAt`, `updatedAt` fields
3. Use proper foreign key constraints
4. Index frequently queried columns
5. Use database migrations for all changes

### Migration Example
```typescript
// migrations/001_create_users_table.ts
import { Prisma } from '@prisma/client';

export const up = async (prisma: Prisma.TransactionClient): Promise<void> => {
  await prisma.$executeRaw`
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;

  await prisma.$executeRaw`
    CREATE INDEX idx_users_email ON users(email);
  `;
};

export const down = async (prisma: Prisma.TransactionClient): Promise<void> => {
  await prisma.$executeRaw`DROP TABLE IF EXISTS users;`;
};
```

## Pull Request Process

1. **Before Starting**:
   - Create an issue describing the problem or feature
   - Get approval for significant changes
   - Fork the repository and create a feature branch

2. **Development**:
   - Follow coding standards
   - Write tests for new functionality
   - Update documentation
   - Run linting and formatting: `npm run quality`
   - Ensure all tests pass: `npm test`

3. **Pull Request**:
   - Fill out the PR template completely
   - Link to related issues
   - Include screenshots for UI changes
   - Request review from maintainers

4. **Review Process**:
   - Address all feedback
   - Keep PR focused and atomic
   - Update branch with latest main if needed
   - Ensure CI passes

## Issue Reporting

When reporting bugs, please include:
- **Environment**: Node.js version, OS, etc.
- **Steps to Reproduce**: Detailed steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Error Messages**: Full error output
- **Additional Context**: Screenshots, logs, etc.

## Feature Requests

Feature requests should include:
- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives Considered**: Other approaches
- **Additional Context**: Use cases, examples

## Code of Conduct

This project follows the [Contributor Covenant](https://www.contributor-covenant.org/) Code of Conduct. By participating, you are expected to uphold this code.

## Questions?

Feel free to open an issue with the "question" label or contact the maintainers directly.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.