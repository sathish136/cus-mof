# Ministry of Finance Sri Lanka HR Attendance Management System

## Overview
This project is a comprehensive HR Attendance Management System for the Ministry of Finance, Sri Lanka. It automates employee attendance tracking using ZK biometric devices and applies government-specific policies for attendance calculation. The system provides a modern web interface for managing employees, attendance, leave, overtime, and generating various reports. Its core purpose is to streamline HR processes, ensure accurate attendance records, and facilitate policy-based salary calculations for government employees.

## User Preferences
Preferred communication style: Simple, everyday language.
Excel Report Formatting: Extreme compact A4 landscape design for monthly attendance reports. Requires minimal column widths (3.2 characters per day), ultra-tight spacing, extremely tiny fonts (4pt for headers, 3pt for data), nearly invisible grid borders (F8F8F8 color), and extreme compression (55% scale) layout. User specifically requested "still text is big need more small" and design matching reference image with ultra-compact appearance for professional printing.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI components with shadcn/ui
- **Styling**: Tailwind CSS with custom government theme colors
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Form Handling**: React Hook Form with Zod validation

### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (ES modules)
- **Database**: PostgreSQL with Drizzle ORM
- **API Design**: RESTful API
- **Session Management**: express-session

### Core Features & Design
- **Attendance Tracking**: Integration with ZK biometric devices for automated attendance capture, processing, and policy-based calculation (including grace periods, half-days, short leaves, and overtime).
- **Employee Management**: CRUD operations for employee records, including bulk operations and name import functionality to correct corrupted biometric device names.
- **Leave Management**: Workflow for leave requests and approvals.
- **Overtime Management**: Automated overtime calculation based on group-specific policies (Group A & B shifts) with automatic approval for all overtime hours, including full OT for weekend work.
- **Reporting**: Comprehensive reports including:
    - Individual 1/4 Offer Report (Treasury format)
    - Monthly Attendance Report (detailed & summary)
    - Employee Punch Times Report
    - Individual Employee Monthly Report
    - Monthly Absence Report
    - Export functionality for all reports (Excel and PDF).
- **Policy Implementation**: Strict adherence to Ministry-specific attendance rules for Group A and Group B employees, including specific shift timings, grace periods, short leave limits, and holiday management (annual/special holidays).
- **System Management**: Configurable settings for company details, biometric devices, database management, email notifications (SMTP), and license management.
- **Security**: Authentication system with session management and multi-tier enterprise licensing to control access and features.
- **UI/UX**: Modern, professional design with gradient backgrounds, clear visual hierarchy, and intuitive workflows. Color schemes align with government themes.

## External Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection.
- **drizzle-orm**: Type-safe database ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/react-***: Headless UI components.
- **zod**: Runtime type validation.
- **tailwindcss**: CSS framework.
- **Vite**: Frontend build tool.
- **TypeScript**: Programming language.
- **esbuild**: Backend bundler.
- **multer**: For file uploads (e.g., employee name import).
- **xlsx**: For Excel file generation.