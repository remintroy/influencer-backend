# Influencer Management Platform Backend

A robust, scalable backend service for managing influencers, brands, and their collaborations.

## 🚀 Features

- **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (Admin, Influencer, User)
  - Google OAuth integration
  - Session management
  - OTP verification

- **User Management**
  - User registration and profile management
  - Influencer profile creation and management
  - Social media integration
  - Portfolio management

- **Category Management**
  - Dynamic category creation
  - Category hierarchy
  - Category-based search and filtering

- **File Management**
  - Secure file uploads via AWS S3
  - Image and video handling
  - Content delivery optimization

## 🛠 Tech Stack

- **Framework**: NestJS
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT, Passport.js
- **File Storage**: AWS S3
- **API Documentation**: Swagger/OpenAPI
- **Validation**: class-validator, class-transformer
- **Testing**: Jest

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB
- AWS Account (for S3)
- Google Cloud Console (for OAuth)

## 🔧 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Application
NODE_ENV=dev
PORT=3000
API_PREFIX=api/v1

# MongoDB
MONGODB_URI=mongodb://localhost:27017/influencer-platform

# JWT
ACCESS_TOKEN_SECRET=your_access_token_secret
REFRESH_TOKEN_SECRET=your_refresh_token_secret
ACCESS_TOKEN_EXPIRES_IN=15m

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_bucket_name

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/influencer-backend.git
   cd influencer-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run start:dev
   ```

4. **Access the API documentation**
   ```
   http://localhost:3000/api/docs
   ```

## 📁 Project Structure

```
src/
├── auth/                 # Authentication module
├── user/                 # User management module
├── category/            # Category management module
├── common/              # Shared resources
│   ├── decorators/      # Custom decorators
│   ├── guards/          # Authentication guards
│   ├── s3/              # AWS S3 integration
│   └── types/           # TypeScript types
└── main.ts              # Application entry point
```

## 🔐 Security Features

- JWT token-based authentication
- Role-based access control
- Request validation
- Rate limiting
- CORS configuration
- Secure password hashing
- Input sanitization

## 🧪 Testing

```bash
# Unit tests
npm run test

# e2e tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📝 API Documentation

The API documentation is available at `/api/docs` when running the server. It includes:

- Detailed endpoint descriptions
- Request/response schemas
- Authentication requirements
- Example requests and responses

## 🔄 CI/CD

The project includes GitHub Actions workflows for:

- Automated testing
- Code quality checks
- Security scanning
- Deployment automation

## 📈 Monitoring

- Application metrics via Prometheus
- Error tracking with Sentry
- Performance monitoring
- Health check endpoints

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- Project Lead: [Name]
- Backend Developers: [Names]
- DevOps: [Name]

## 📞 Support

For support, email support@yourdomain.com or join our Slack channel.