# Contributing to Pulse

Thank you for your interest in contributing to Pulse! This guide will help you get started.

## Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/yourusername/pulse.git
   cd pulse
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment**
   ```bash
   cp .env.example .env
   # Configure your .env file
   ```

4. **Start Infrastructure**
   ```bash
   npm run docker:up
   ```

5. **Run Tests**
   ```bash
   npm test
   ```

## Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (run `npm run format`)
- **Linting**: ESLint (run `npm run lint`)
- **Naming**: 
  - Files: `kebab-case.ts`
  - Classes: `PascalCase`
  - Functions/Variables: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`

## Project Structure

- `src/domain/`: Business logic (pure, no framework deps)
- `src/server/`: API routes and HTTP layer
- `src/jobs/`: Background job tasks
- `src/observability/`: Logging and monitoring
- `test/`: Unit and integration tests
- `scripts/`: Utility scripts
- `docs/`: Documentation

## Adding a New Drift Detector

1. Create detector in `src/domain/drift/detectors/`:
   ```typescript
   export class MyDetector extends DriftDetector {
     async detect(segment, current, previous) {
       // Your logic
     }
   }
   ```

2. Add to `drift.detector.ts`:
   ```typescript
   private detectors = [
     // ... existing detectors
     new MyDetector(),
   ];
   ```

3. Add tests in `test/unit/`:
   ```typescript
   describe('MyDetector', () => {
     it('should detect my drift type', async () => {
       // Test logic
     });
   });
   ```

## Adding a New Alert Channel

1. Create channel in `src/domain/alerts/channels/`:
   ```typescript
   export class MyChannel {
     async send(incident, segment, explanation) {
       // Send alert
     }
   }
   ```

2. Update `alert.service.ts`:
   ```typescript
   private myChannel = new MyChannel();
   
   async sendAlerts(incident, segment) {
     promises.push(this.myChannel.send(...));
   }
   ```

## Testing Guidelines

### Unit Tests
- Test business logic in isolation
- Mock external dependencies
- Use fixtures for test data
- Aim for >80% coverage

### Writing Tests
```typescript
import { describe, it, expect } from 'vitest';

describe('MyFeature', () => {
  it('should do something', () => {
    const result = myFunction();
    expect(result).toBe(expected);
  });
});
```

### Running Tests
```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Specific file
npm test path/to/test.ts
```

## Database Migrations

For schema changes:

1. Update `infra/sql/init.sql`
2. Create migration script in `infra/sql/migrations/`
3. Test migration on fresh database
4. Document breaking changes

## API Changes

When adding/modifying endpoints:

1. Update route handler
2. Add/update Zod schema validator
3. Update README API documentation
4. Consider backward compatibility
5. Add integration test

## Documentation

Update docs when changing:
- API endpoints → `README.md`
- Metrics → `docs/metrics_definition.md`
- Drift rules → `docs/drift_rules.md`
- Demo flow → `docs/demo_script.md`

## Pull Request Process

1. **Branch Naming**
   - Feature: `feature/description`
   - Bug: `fix/description`
   - Docs: `docs/description`

2. **Commit Messages**
   ```
   type(scope): description
   
   Longer explanation if needed.
   
   Fixes #123
   ```
   
   Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

3. **PR Description**
   - What changed
   - Why it changed
   - How to test
   - Screenshots (if UI)

4. **Before Submitting**
   - [ ] Tests pass (`npm test`)
   - [ ] Linter passes (`npm run lint`)
   - [ ] Code formatted (`npm run format`)
   - [ ] Docs updated
   - [ ] No console.logs
   - [ ] Types correct

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. Build: `npm run build`
6. Test production build
7. Deploy

## Community Guidelines

- Be respectful and inclusive
- Help others learn
- Provide constructive feedback
- Ask questions when unclear
- Share knowledge

## Getting Help

- **Issues**: Open a GitHub issue
- **Discussions**: Use GitHub Discussions
- **Security**: Email security@pulse.example.com
- **Questions**: Tag your issue with `question`

## Feature Requests

We love new ideas! When requesting:

1. Check existing issues first
2. Explain the use case
3. Describe expected behavior
4. Provide examples
5. Consider implementation approach

## Bug Reports

Great bug reports include:

1. **Description**: What happened vs. what should happen
2. **Steps to Reproduce**: 
   - Step 1
   - Step 2
   - ...
3. **Environment**:
   - OS
   - Node version
   - Pulse version
4. **Logs/Screenshots**: Any relevant output
5. **Expected Behavior**: What you expected
6. **Actual Behavior**: What actually happened

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone.

### Our Standards

✅ **Positive**:
- Using welcoming language
- Being respectful
- Accepting constructive criticism
- Focusing on what's best for community
- Showing empathy

❌ **Unacceptable**:
- Trolling, insults, derogatory comments
- Public or private harassment
- Publishing private information
- Unprofessional conduct

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Pulse! 🫀
