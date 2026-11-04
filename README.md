# Moneo – Personal Finance Manager with AI Advisor

**Take control of your money. Understand your spending. Make smarter financial decisions.**

Moneo is an AI-powered personal finance management application designed to help users track transactions, manage budgets, analyze spending patterns, monitor financial health, and make informed financial decisions.

It combines financial analytics, predictive insights, and a conversational AI advisor in one platform.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [AI Financial Advisor](#ai-financial-advisor)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)
- [Security and Data Handling](#security-and-data-handling)
- [Future Improvements](#future-improvements)

---

## Overview

Managing personal finances involves more than simply recording income and expenses. Users need to understand where their money goes, plan budgets, identify spending patterns, and make better financial decisions.

Moneo brings these capabilities together through a centralized financial management platform.

The application uses a React frontend, a FastAPI backend, PostgreSQL for data storage, and an AI integration layer for conversational financial guidance.

### Core Objectives

- Simplify personal expense and income management.
- Help users create and monitor budgets.
- Provide meaningful insights into spending habits.
- Track financial health and financial goals.
- Identify potential overspending.
- Make financial information easier to understand using AI.

## Features

### 1. Dashboard and Financial Analytics

- Monitor income, expenses, account balance, and financial trends.
- Visualize spending patterns and view period-based summaries.
- Compare monthly activity and identify potential overspending.
- Track financial health scores and progress over time.

### 2. Transactions and Receipt Scanning

- Add, categorize, and manage income and expense transactions.
- View transaction history and import data through CSV.
- Manage recurring payments and expenses.
- Upload receipt images and extract information using OCR to support transaction entry.

### 3. Budget Planning and Financial Goals

- Create budgets and monitor spending against allocated amounts.
- Track budget utilization and progress.
- Maintain wealth-related information and financial goals.
- Use financial insights to support better budgeting decisions.

### 4. AI Financial Advisor

Moneo includes a conversational AI financial advisor that uses the user's financial context to answer questions.

Example questions:

- What is my biggest expense this month?
- How much did I spend on food?
- Am I exceeding my monthly budget?
- Why have my expenses increased?
- How can I reduce my spending?
- How much money did I save this month?

**Key capabilities:**

- Natural-language questions with context-aware responses.
- Follow-up questions using recent conversation history.
- Answers based on backend-calculated financial data, not guesses.
- Monthly spending insights and personalized financial guidance.
- Configurable AI providers using Ollama or OpenAI.

### 5. Financial Reports

- Generate financial reports with categorized financial information.
- Generate PDF reports.

### 6. Authentication and Profile Management

- User registration, login, and password reset.
- JWT-based authentication and protected application routes.
- User profile and session-related functionality.

### 7. User Experience

- Responsive interface with light and dark themes.
- Interactive financial charts.
- Progressive Web App support and reusable React components.

---

## Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 18, Vite |
| Styling | Tailwind CSS 4 |
| Routing | React Router |
| State Management | Zustand |
| HTTP Client | Axios |
| Data Visualization | Chart.js, react-chartjs-2 |
| Icons | Lucide React |
| Backend | Python, FastAPI |
| API Server | Uvicorn |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Database Migrations | Alembic |
| Authentication | JWT, python-jose, Passlib, bcrypt |
| Validation | Pydantic |
| AI Integration | Ollama, OpenAI API |
| OCR | Tesseract OCR, pytesseract, Pillow |
| PDF Generation | ReportLab |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## System Architecture

Moneo follows a frontend-backend architecture in which the frontend communicates with the backend through REST APIs.

The backend handles authentication, financial calculations, database operations, analytics, and AI integration.

```mermaid
flowchart TD
    U["User"] --> FE["React Frontend"]
    FE --> AX["Axios API Client"]
    AX --> API["FastAPI Backend"]

    API --> AUTH["Authentication and Security"]
    API --> ROUTERS["API Routers"]

    ROUTERS --> SERVICES["Business Logic and Services"]

    SERVICES --> DB[("PostgreSQL Database")]
    SERVICES --> AI["AI Advisor Service"]
    SERVICES --> OCR["Receipt OCR Processing"]
    SERVICES --> ANALYTICS["Financial Analytics"]
    SERVICES --> REPORTS["PDF Report Generation"]

    AI --> PROVIDER["Ollama / OpenAI"]
    OCR --> IMAGE["Receipt Image Processing"]

    DB --> SERVICES
    PROVIDER --> AI

    SERVICES --> API
    API --> FE
```

### Architecture Components

**Frontend – React**

Responsible for:
- User interface and navigation.
- Dashboard and financial visualizations.
- Transaction and budget management.
- Authentication state.
- Communication with backend APIs.

**Backend – FastAPI**

Responsible for:
- REST API endpoints.
- Authentication and authorization.
- Financial calculations.
- Budget and transaction management.
- AI advisor integration.
- Analytics and reporting.

**Database – PostgreSQL**

Stores application information, including:
- User information.
- Transactions.
- Budgets.
- Recurring transactions.
- Wealth information.
- Financial health information.
- AI advisor conversations.

**AI Integration Layer**

Connects the backend to the configured AI provider and generates responses using financial information prepared by backend services.

---

## AI Financial Advisor

The AI advisor is one of Moneo's key features.

Instead of functioning as a general-purpose chatbot, it receives financial information calculated by the backend and uses that information to generate relevant financial explanations and recommendations.

### AI Architecture

```mermaid
flowchart TD
    A["User asks a financial question"] --> B["Advisor API"]
    B --> C["Authenticate User"]
    C --> D["Load or Create Conversation"]
    D --> E["Retrieve Recent Conversation History"]

    E --> F["Fetch User Financial Data"]

    F --> G["Calculate Financial Context"]

    G --> H["Monthly Income and Expenses"]
    G --> I["Category-wise Spending"]
    G --> J["Budget Progress"]
    G --> K["Overspending Predictions"]
    G --> L["Monthly Comparison"]
    G --> M["Financial Health Information"]

    H --> N["Build Financial Context"]
    I --> N
    J --> N
    K --> N
    L --> N
    M --> N

    N --> O["Construct AI Prompt"]

    O --> P{"AI Provider"}

    P -->|Ollama| Q["Ollama API"]
    P -->|OpenAI| R["OpenAI API"]

    Q --> S["Generate Financial Advice"]
    R --> S

    S --> T["Save Conversation"]
    T --> U["Return Response to Frontend"]
```

### How It Works

1. The user submits a financial question through the frontend.
2. The FastAPI backend authenticates the user.
3. The backend loads an existing conversation or creates a new one.
4. Recent conversation messages are retrieved to maintain conversational context.
5. The backend prepares the user's available financial information.
6. Financial services calculate relevant figures such as income, expenses, category-wise spending, budget progress, overspending predictions, monthly comparisons, and financial health.
7. The backend combines the calculated information into a financial context.
8. An AI prompt is constructed using the financial context, conversation history, and current question.
9. The configured AI provider generates a response.
10. The conversation is saved and the answer is returned to the frontend.

### Important Design Principle: Verified Financial Data

Financial calculations are performed by the backend, not by the language model.

The AI receives the calculated financial context and explains it in natural language.

This approach helps prevent the AI from inventing transactions, balances, income, expenses, or budgets.

The advisor is also instructed to identify unavailable information instead of guessing.

### Supported AI Providers

**Ollama**

Ollama allows Moneo to communicate with a configured locally hosted or remotely accessible language model through its HTTP API.

Example configuration:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

**OpenAI**

Moneo also supports the OpenAI Chat Completions API.

Example configuration:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

The AI provider can be selected through backend environment configuration.

---

## Project Structure

```text
moneo/
│
├── Documentation/
│   └── API_CONTRACTS.md
│
├── api/
│   │
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   │
│   ├── models/
│   │   ├── user.py
│   │   ├── transaction.py
│   │   ├── budget.py
│   │   ├── financial_health.py
│   │   ├── recurring_transaction.py
│   │   ├── session.py
│   │   └── wealth_item.py
│   │
│   ├── routers/
│   │   ├── auth.py
│   │   ├── transactions.py
│   │   ├── budgets.py
│   │   ├── advisor.py
│   │   ├── health_score.py
│   │   ├── reports.py
│   │   ├── recurring_transactions.py
│   │   └── receipt_ocr.py
│   │
│   ├── schemas/
│   │
│   ├── services/
│   │   ├── ai_advisor.py
│   │   ├── ai_budget_generator.py
│   │   ├── auto_categorizer.py
│   │   ├── budget_progress.py
│   │   ├── finance_analytics.py
│   │   ├── health_score.py
│   │   ├── monthly_comparison.py
│   │   ├── overspending_prediction.py
│   │   ├── statement_parser.py
│   │   └── pdf_report_generator.py
│   │
│   ├── alembic/
│   │   └── versions/
│   │
│   ├── main.py
│   ├── requirements.txt
│   ├── alembic.ini
│   └── .env.example
│
├── frontend/
│   │
│   ├── public/
│   │   └── brand/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── store/
│   │   ├── App.jsx
│   │   ├── index.jsx
│   │   └── index.css
│   │
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── .env.example
│
├── docker-compose.yml
└── README.md
```

### Backend Directory Responsibilities

| Directory | Responsibility |
|---|---|
| `core/` | Configuration, database connection, security |
| `models/` | SQLAlchemy database models |
| `routers/` | FastAPI API endpoints |
| `schemas/` | Pydantic request and response validation |
| `services/` | Financial calculations, AI integration, OCR, reporting |
| `alembic/` | Database migrations |

### Frontend Directory Responsibilities

| Directory | Responsibility |
|---|---|
| `components/` | Reusable UI components |
| `pages/` | Application pages |
| `services/` | API communication |
| `store/` | Zustand state management |
| `hooks/` | Reusable React hooks |
| `public/` | Static assets and PWA resources |

---

## Getting Started

Follow these steps to run Moneo locally.

### Prerequisites

Make sure the following are installed:

- Python 3.10 or newer.
- Node.js compatible with the installed Vite version.
- npm.
- PostgreSQL.
- Git.
- Tesseract OCR for local receipt OCR functionality.

### 1. Clone the Repository

Clone the repository and navigate into the project directory.

### 2. Backend Setup

Navigate to the API directory:

```bash
cd api
```

Create a Python virtual environment:

**Windows PowerShell**

```powershell
python -m venv venv

.\venv\Scripts\Activate.ps1
```

**Linux / macOS**

```bash
python3 -m venv venv

source venv/bin/activate
```

Install the Python dependencies:

```bash
pip install -r requirements.txt
```

### 3. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE finance_manager;
```

Configure the database connection in the backend environment file.

Example:

```env
DATABASE_URL=postgresql://finance_user:finance_pass@localhost:5432/finance_manager
```

Replace the example username, password, and database details with your actual PostgreSQL configuration.

### 4. Backend Environment Setup

Create a `.env` file inside the `api/` directory using `.env.example` as a reference.

Example:

```env
DATABASE_URL=postgresql://finance_user:finance_pass@localhost:5432/finance_manager

SECRET_KEY=replace-with-a-strong-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
EMAIL_FROM=
EMAIL_FROM_NAME=Moneo

FRONTEND_URL=http://localhost:5173
FRONTEND_ORIGIN=http://localhost:5173
```

Never commit real passwords, API keys, or secret keys to GitHub.

### 5. Configure AI

Choose one of the supported AI providers.

**Option A: Ollama**

Install Ollama and download a model:

```bash
ollama pull llama3.2
```

Make sure the Ollama service is running.

Configure:

```env
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

**Option B: OpenAI**

Configure:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

Note: OpenAI API usage may incur charges.

### 6. Run Database Migrations

From the `api/` directory:

```bash
alembic upgrade head
```

### 7. Start the Backend

From the `api/` directory:

```bash
uvicorn main:app --reload
```

### 8. Frontend Setup

Open another terminal and navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside `frontend/`:

```env
VITE_API_URL=http://localhost:8000
```

Start the frontend development server:

```bash
npm run dev
```

The frontend development server uses the default Vite development port.

---

## Environment Variables

### Backend Configuration

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL database connection |
| `SECRET_KEY` | JWT signing secret |
| `ALGORITHM` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiration |
| `AI_PROVIDER` | Selects Ollama or OpenAI |
| `OLLAMA_BASE_URL` | Ollama service URL |
| `OLLAMA_MODEL` | Ollama model name |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | OpenAI model name |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP server port |
| `SMTP_USERNAME` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |
| `EMAIL_FROM` | Sender email address |
| `EMAIL_FROM_NAME` | Sender display name |
| `FRONTEND_URL` | Frontend application URL |
| `FRONTEND_ORIGIN` | Allowed frontend CORS origin |

### Frontend Configuration

| Variable | Description |
|---|---|
| `VITE_API_URL` | Backend API base URL |

For local development:

```env
VITE_API_URL=http://localhost:8000
```

For production, configure the backend API base address through the frontend hosting platform's environment variable settings.

---

## Running the Application

Start the backend and frontend in separate terminals.

**Backend**

```bash
cd api

uvicorn main:app --reload
```

**Frontend**

```bash
cd frontend

npm run dev
```

### Available Frontend Commands

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build frontend for production |
| `npm run preview` | Preview production build locally |

### Backend Health Check

Root endpoint:

```http
GET /
```

Expected response:

```json
{
  "status": "ok",
  "service": "finance-manager-api",
  "version": "0.1.0"
}
```

Health endpoint:

```http
GET /health
```

---

## API Documentation

Moneo uses FastAPI to expose REST API endpoints.

FastAPI automatically generates interactive API documentation using Swagger UI.

The API documentation can be accessed through the running backend's `/docs` route.

### Main API Modules

| Module | Responsibility |
|---|---|
| Authentication | Registration, login, and account security |
| Transactions | Income and expense management |
| Budgets | Budget creation and tracking |
| Advisor | AI financial advice and monthly insights |
| Health Score | Financial health calculations and history |
| Reports | Financial report generation |
| Recurring Transactions | Recurring financial activity |
| Receipt OCR | Receipt image processing |

### AI Advisor

The advisor module supports:

- Monthly spending insights.
- Financial health information.
- Saved advisor conversations.
- Conversation message retrieval.
- Natural-language financial questions.

---

## Deployment

Moneo uses separate frontend and backend deployments.

| Component | Hosting Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render |
| Database | PostgreSQL |

### Frontend Deployment – Vercel

The React application is deployed using Vercel.

The frontend production build command is:

```bash
npm run build
```

Configure the following environment variable in the Vercel project settings:

```env
VITE_API_URL=<your-deployed-backend-base-address>
```

After changing environment variables, redeploy the frontend so the new configuration is included in the production build.

### Backend Deployment – Render

The FastAPI backend is deployed using Render.

The backend deployment requires:

- PostgreSQL database connectivity.
- Correct backend environment variables.
- Production frontend origin configured for CORS.
- A reachable AI provider if AI features are enabled.
- Required system dependencies for OCR functionality.

Configure the frontend settings:

```env
FRONTEND_ORIGIN=<your-deployed-frontend-origin>
FRONTEND_URL=<your-deployed-frontend-origin>
```

### Production AI Configuration

The local Ollama address:

```env
OLLAMA_BASE_URL=http://localhost:11434
```

works only when Ollama is running on the same machine as the backend.

A cloud-hosted backend cannot automatically access Ollama running on an individual user's computer.

For production Ollama integration, configure `OLLAMA_BASE_URL` to point to a securely accessible hosted Ollama service.

Alternatively, configure the OpenAI provider.

Users should not need to install Ollama locally to use a centrally hosted AI service.

### Production Connection

The frontend communicates with the backend through the Axios API client.

The production frontend API base address is configured using `VITE_API_URL`.

The backend must allow the deployed frontend origin through its CORS configuration.

---

## Security and Data Handling

Moneo includes application-level security mechanisms designed to protect user information.

- JWT-based authentication.
- Password hashing dependencies.
- Protected frontend routes.
- Authenticated backend endpoints.
- User-specific financial data access.
- Conversation ownership validation.
- Environment-based credential configuration.
- AI instructions that prevent unsupported financial figures from being presented as verified facts.

For production use, configure strong secrets, HTTPS, restricted database access, and secure handling of uploaded files.

---

## Future Improvements

Potential areas for future development include:

- More advanced financial forecasting.
- Improved personalized budget recommendations.
- Additional bank statement import formats.
- Enhanced receipt extraction and validation.
- More detailed financial goal analytics.
- Improved AI response performance and availability.
- Expanded financial reports and visualizations.

---

<p align="center">

**Moneo – Make every financial decision count.**

</p>
