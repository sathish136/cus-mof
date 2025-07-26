# Ministry of Finance Sri Lanka HR Attendance Management System

## Overview

This is a comprehensive HR Attendance Management System built for the Ministry of Finance Sri Lanka. The application automates employee attendance tracking using ZK biometric devices and provides policy-based calculations for government employees. It features a modern React frontend with a Node.js/Express backend, utilizing PostgreSQL for data persistence.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui styling system
- **Styling**: Tailwind CSS with custom government theme colors
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **API Design**: RESTful API with structured error handling
- **Session Management**: express-session with PostgreSQL store

### Database Schema
- **Employees**: Core employee data with biometric device integration
- **Attendance**: Daily attendance records with check-in/check-out times
- **Leave Requests**: Leave management with approval workflows
- **Overtime Requests**: Overtime tracking and approval system
- **Biometric Devices**: ZK device management and configuration

## Key Components

### Frontend Components
- **Dashboard**: Overview of attendance statistics and recent activities
- **Employee Management**: CRUD operations for employee records
- **Attendance Tracker**: Real-time attendance monitoring and manual entry
- **Leave Management**: Leave request submission and approval workflows
- **Overtime Management**: Overtime request handling and tracking
- **Reports**: Comprehensive reporting with data visualization
- **Settings**: System configuration and biometric device management

### Backend Services
- **Storage Layer**: Abstracted database operations with type-safe queries
- **Route Handlers**: RESTful endpoints for all business operations
- **Database Connection**: Pooled connections with Neon serverless PostgreSQL
- **Middleware**: Request logging, error handling, and session management

## Data Flow

1. **Employee Registration**: Employees are registered with biometric device IDs
2. **Attendance Capture**: ZK biometric devices capture attendance data
3. **Data Processing**: Backend processes attendance records and calculates working hours
4. **Policy Application**: Government-specific attendance policies are applied
5. **Report Generation**: System generates various reports for HR and management
6. **Leave/Overtime Workflows**: Approval workflows for leave and overtime requests

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe database ORM with PostgreSQL support
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Headless UI components for accessibility
- **zod**: Runtime type validation and schema definition
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Fast build tool and development server
- **typescript**: Type checking and compilation
- **esbuild**: Fast JavaScript bundler for production builds

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds the React application to `dist/public`
2. **Backend Build**: esbuild bundles the server code to `dist/index.js`
3. **Database Migration**: Drizzle migrations are applied to PostgreSQL

### Production Configuration
- **Node.js Environment**: Production server runs compiled JavaScript
- **Database**: Neon serverless PostgreSQL with connection pooling
- **Static Assets**: Frontend assets served from `dist/public`
- **Environment Variables**: Database URL and session secrets from environment

### Development Workflow
- **Development Server**: Vite dev server with HMR for frontend
- **Backend Server**: tsx for TypeScript execution with hot reload
- **Database**: Drizzle push for schema synchronization

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

Changelog:
- July 04, 2025. Initial setup
- July 07, 2025. Migration from Replit Agent to Replit environment completed
  - Fixed database schema synchronization issues
  - Added missing year and isActive fields to holidays table
  - Updated frontend holiday forms to include required year field validation
  - Fixed Quick Add Holiday functionality to include year field
  - All holiday management functionality now working correctly
  - Successfully migrated HR Attendance Management System from Replit Agent to standard Replit environment
  - Fixed cross-env dependency issue that was preventing application startup
  - Created and migrated complete PostgreSQL database schema with all tables, constraints, and relationships
  - Established database connection using Neon serverless PostgreSQL with proper environment variables
  - Added sample test data (4 departments, 1 admin employee) to verify database functionality
  - All API endpoints verified working with real database connections
  - Application server running successfully on port 5000 with proper error handling
  - Frontend loads correctly with minor React validation warnings (non-blocking)
  - Complete database schema includes: employees, departments, attendance, leave_requests, overtime_requests, biometric_devices, holidays, short_leave_requests
  - All database foreign key relationships and constraints properly established
  - Migration completed successfully - system ready for full operation
  - Successfully migrated project from Replit Agent to Replit environment
  - Database connection established with PostgreSQL (178 employees loaded)
  - All API endpoints working properly with real data
  - Frontend and backend integration verified
  - Added HR Settings navigation link to main Settings page
  - Database setup with PostgreSQL and full schema migration
  - Successfully resolved cross-env dependency issue
  - Database schema created with all tables, constraints, and sample data
  - Application verified working with real biometric device integration
  - ZK device connection and employee import functionality tested successfully
  - All dependencies installed and configured
  - Fixed overtime management approved/rejected tabs to show actual data with real-time updates
  - Updated Daily OT Report to show only pending/approved/rejected statuses (removed "Not Applied" and "N/A")
  - Added real-time cache invalidation for overtime request counts in tab bar
  - Fixed overtime management approved/rejected tabs to show actual data instead of placeholders
  - Removed Daily OT Report button from overtime management page
  - Monthly attendance report enhancements:
    - Added total hours calculation column
    - Added overtime total column (without 'h' suffix)
    - Added present days count in status totals
    - Changed background from yellow to light blue for better readability
    - Added month/year header display
    - Removed duplicate export options
    - Show "-" instead of "0" for empty overtime values
  - Daily reports styling improvements:
    - Reduced text size to extra small (text-xs) for compact layout
    - Enhanced color-coded status indicators (green/red/yellow/orange)
    - Professional card layouts with proper headers and statistics
    - Better group badge styling (Group A/Group B)
    - Improved OT eligibility filtering - only shows employees with OT hours > 0
    - Enhanced OT approval status display (Approved/Pending/Rejected/Not Applied/N/A)
    - Added total OT hours and approved OT hours summary in daily OT report
  - Employee Management enhancements:
    - Added serial numbers (S.No) column for better record tracking
    - Implemented multiple selection with checkboxes for bulk operations
    - Added bulk operations functionality for department, group, and status changes
    - Created bulk update API endpoint with proper validation and error handling
    - Enhanced UI with bulk operations dialog and controls
    - Improved table layout with select all functionality
    - Fixed bulk operations API endpoint with proper route ordering
    - Successfully tested bulk updates for department, group, and status changes
    - Implemented proper error handling and logging for bulk operations
  - Overtime Management page enhancements:
    - Complete UI/UX redesign with modern gradient backgrounds and styling
    - Enhanced dashboard cards with gradient backgrounds and real-time statistics
    - Implemented tabbed workflow interface (Pending/Approved/Rejected)
    - Smart action bar with contextual bulk operations
    - Modern table design with improved visual hierarchy
    - Progressive disclosure pattern for better user experience
    - Integrated workflow automation features
    - Enhanced loading states and empty state messaging
    - Added subtle professional color coding for better visual hierarchy
    - Fixed approval workflow error by correcting employeeId field validation
    - Implemented proper datetime formatting for overtime request creation
    - Added employee search filter and group filtering functionality
    - Implemented reject reason dialog with mandatory reason input
    - Added Daily OT Report link integration from overtime page
    - Enhanced filtering displays for better user experience
    - Fixed workflow button sizing for compact professional design
    - Added bulk operations dialog with intuitive interface
    - Added select all/deselect all functionality
    - Enhanced table layout with better organization
  - Comprehensive Holiday Management system implementation:
    - Added new holidays database table with annual/special/weekend types
    - Created full CRUD API endpoints for holiday management
    - Built modern responsive frontend with gradient design and statistics cards
    - Implemented separate reports for holiday descriptions by type
    - Added group-specific holiday tracking for both Group A and Group B employees
    - Created export functionality for CSV holiday reports
    - Integrated year-based filtering and holiday calendar view
    - Professional design showing Annual Holidays (21 days), Special Holidays (24 days), Total (45 days)
    - Added weekend day tracking for comprehensive holiday coverage
  - Policy Implementation (Group A & Group B Attendance Policies):
    - Created comprehensive attendance calculation engine implementing exact policy requirements
    - Group A: 8:30 AM - 4:15 PM (7.75 hours), 30-min grace period, half-day after 10:00 AM
    - Group B: 8:00 AM - 4:45 PM (8.75 hours), 15-min grace period, half-day after 9:30 AM
    - Implemented short leave tracking system (2 per month max for both groups)
    - Added proper overtime calculation (7.75+ hours for Group A, 8.75+ hours for Group B)
    - Created 1/4 Offer calculation system (overtime from 4:15 PM for Group A, 4:45 PM for Group B)
    - Set up complete 45-holiday system (21 Annual + 24 Special holidays)
    - Integrated weekend and holiday overtime rules (full OT on weekends/holidays)
    - Added short leave requests table and tracking functionality
    - Implemented policy-compliant late arrival and half-day rules
  - Enhanced Export Functionality and 1/4 Offer-Attendance Report improvements:
    - Completely redesigned 1/4 Offer-Attendance Report with modern gradient styling and better visual hierarchy
    - Added enhanced summary statistics cards with icons and gradient backgrounds
    - Implemented comprehensive Excel export functionality with preview dialog
    - Created export preview system showing data sample before download
    - Replaced CSV export with Excel (.xlsx) format for all reports
    - Added professional styling with compact table design and color-coded data
    - Enhanced policy display sections with Group A and Group B specific rules
    - Integrated XLSX library for robust Excel file generation
    - Added file size estimation and export metadata display
    - Improved user experience with preview-first export workflow
  - Multi-Tier Enterprise License System Implementation:
    - Created comprehensive license-based access control system that blocks all functionality without valid license
    - Implemented 5-tier enterprise licensing structure with specific web login limits:
      • J7K9-P2Q4-R6T8-U1V3: Enterprise Pro (2 web logins, advanced analytics)
      • M5N7-B8C2-L4X6-W9Z0: Enterprise Plus (3 web logins, full reports)
      • D3F5-H6J8-K1L4-P7R9: Enterprise Basic (1 web login, basic features)
      • Q2W4-E5R7-T8Y1-U3I6: Enterprise Max (5 web logins, multi-user access)
      • A9S2-D5F7-G3H6-J8K1: Enterprise Demo (unlimited logins, demo features)
    - Built LicenseGuard component that wraps entire application and requires validation before access
    - Created persistent license storage with localStorage for seamless user experience
    - Enhanced System Settings with professional license management interface
    - Added Activity Logs and Error Logs dialogs with real-time system monitoring
    - Integrated license information display in General Settings tab with tier details
    - All system management functions (backup, logs, etc.) disabled without valid license
    - Professional support contact integration and license validation workflow
    - License-based feature enablement system for future functionality restrictions
  - Migration to Replit Environment Completed Successfully (July 11, 2025):
    - Successfully migrated complete HR Attendance Management System from Replit Agent to standard Replit environment
    - Fixed cross-env dependency issue preventing application startup by installing missing cross-env package
    - Established PostgreSQL database connection with provided Neon serverless database URL
    - Created complete database schema with all required tables and proper constraints:
      • departments (4 sample departments created)
      • employees (with proper foreign key relationships and enums)
      • attendance (with unique constraints on employee_id, date)
      • leave_requests (with proper date handling and validation)
      • overtime_requests (with status tracking)
      • biometric_devices (for ZK device integration)
      • holidays (with year and applicable_groups columns)
      • short_leave_requests (for policy compliance)
    - Fixed database enum types creation for proper data validation
    - All API endpoints now functional with real database connections and proper error handling
    - Session management system working correctly with multi-user license validation
    - Application server running successfully on port 5000 with full functionality
    - Complete database setup with sample admin employee (EMP001) for testing
    - System fully operational and ready for production use
    - Successfully migrated complete HR Attendance Management System from Replit Agent to standard Replit environment
    - Fixed cross-env dependency issue preventing application startup
    - Established PostgreSQL database connection with Neon serverless database
    - Created all database tables including holidays, departments, employees, attendance, etc.
    - Resolved WebSocket configuration issues for proper Neon database connectivity
    - Fixed holiday management functionality by creating missing holidays table
    - All API endpoints functional with real database connections and proper error handling
    - Session management system working correctly with real-time session tracking
    - License system updated to reflect "Live U Pvt Ltd" as the license issuer
    - Application server running successfully on port 5000 with full functionality
    - Holiday creation and management now working properly after database setup
    - System ready for production use with all features operational
    - Fixed leave request creation functionality with proper date handling and employee ID mapping
    - Added debugging to leave request forms to troubleshoot frontend submission issues
    - Successfully migrated complete HR Attendance Management System from Replit Agent to standard Replit environment
    - Fixed cross-env dependency issue preventing application startup by installing missing cross-env package
    - Established PostgreSQL database connection with provided Neon serverless database URL
    - Created complete database schema with all required tables and proper constraints:
      • departments (4 sample departments created)
      • employees (with proper foreign key relationships and enums)
      • attendance (with unique constraints on employee_id, date)
      • leave_requests (with proper date handling and validation)
      • overtime_requests (with status tracking)
      • biometric_devices (for ZK device integration)
      • holidays (with year and applicable_groups columns)
      • short_leave_requests (for policy compliance)
    - Fixed database enum types creation for proper data validation
    - Resolved leave request creation issues by implementing proper date string to Date object conversion
    - All API endpoints now functional with real database connections and proper error handling
    - Session management system working correctly with multi-user license validation
    - Application server running successfully on port 5000 with full functionality
    - Leave request functionality verified working with test data creation
    - Complete database setup with sample admin employee (EMP001) for testing
    - System fully operational and ready for production use
  - System Management Updates (July 7, 2025):
    - Reorganized Settings page with 6 separate tabs: General, Company, Devices, Database, Email, System
    - Created dedicated Database Management tab with operations, status monitoring, and recent operations table
    - Implemented completely separate Email Notifications tab with full SMTP configuration and automated report settings
    - Enhanced System Logs with tabbed interface (Activity/Error) and proper table format with filters
    - Added comprehensive table format for activity and error logs with timestamp, filtering, and export options
    - Separated all system management functions into logical groups for better organization
    - Updated Holiday Management page to "Leave And Holiday Management" with manual holiday entry
    - Added holiday list table with date and description format, upload/download functionality
    - Created separate leave description reports with detailed policy information
    - Enhanced holiday statistics display with fixed values (21 Annual, 24 Special, 45 Total)
    - Fixed real-time company name and tagline updates when settings are changed
    - Email Notifications now completely independent from Database Management with dedicated tab
  - Enhanced System Management with table format logging for Activity and Error logs with precise timestamps
  - Added comprehensive Email Configuration (SMTP) dialog with automated report scheduling
  - Added Database Management dialog with status monitoring, operations, and recent operations table
  - Improved Activity Logs with tabular format showing User, Action, Type, IP Address, and precise timing
  - Enhanced Error Logs with Level, Message, Details, Source columns and professional table layout
  - Added email configuration for automated reports: Daily Attendance, Monthly Summary, Overtime notifications
  - Database management includes status monitoring, optimization tools, backup creation, and integrity checks
  - Email Notifications System Implementation (July 7, 2025):
    - Created complete Email Notifications API with SMTP configuration endpoints
    - Implemented real-time email settings management with secure password handling
    - Added test email functionality for configuration verification
    - Built automated reports scheduling system for daily/monthly attendance reports
    - Connected frontend Email tab to working backend API endpoints
    - Added full SMTP configuration form with host, port, credentials, and sender details
    - Email system ready for SendGrid integration with API key configuration
    - All email notification features now functional instead of placeholder buttons
  - Dashboard Cleanup (July 7, 2025):
    - Removed "Recent Employees" section from dashboard as requested
    - Cleaned up unused employee queries and components
    - Streamlined dashboard layout focusing on statistics and recent activities
  - Authentication System Implementation (July 7, 2025):
    - Added AuthGuard component to protect all routes from unauthorized access
    - Implemented proper login/logout flow with localStorage-based session management
    - Added logout buttons in both header and sidebar with proper functionality
    - Users now cannot access any system features without authentication
    - Login page shows demo credentials (admin/admin123) for easy testing
    - Implemented User Management dialog in Settings with role-based permissions display
    - Fixed application routing to redirect unauthenticated users to login page
    - Login state persists across browser sessions until explicit logout
  - Login Page Design Enhancement (July 7, 2025):
    - Reverted to original clean, professional light design per user preference
    - Fixed JavaScript errors (rememberMe variable) for proper functionality
    - Maintained clean light blue gradient background design
    - Removed demo credentials display for cleaner professional appearance
    - Modified LicenseGuard to allow login page access without license validation
    - Added "Powered by Live U Pvt Ltd" branding at bottom of login page
    - Updated license system to show "Live U Pvt Ltd" branding throughout system
    - Fixed splash screen to show properly on every app load instead of just first time
    - Fixed login flow issue where application required refresh after login to load properly
    - Enhanced AuthGuard with periodic authentication checking for immediate state updates
    - Login now properly redirects and loads application without requiring manual refresh
  - System Navigation Updates (July 11, 2025):
    - Hidden Leave Management and Leave & Holiday pages from main navigation as requested
    - Removed approval requirements for overtime - all OT hours are now automatically approved
    - Updated overtime management interface to reflect automatic approval system
    - Modified overtime policy settings to set preApprovalRequired to false for both groups
    - Enhanced weekend overtime calculation - Saturday and Sunday work automatically adds full OT hours
    - Simplified overtime workflow by removing manual approval buttons and processes
    - Updated overtime management labels to show "OT Hours" instead of "Pending Approvals"
    - Weekend and holiday overtime rules properly implemented - all working hours count as OT
    - Navigation now streamlined to: Dashboard, Employee Master, Attendance, Overtime, Reports, Settings
  - Overtime Management & Daily OT Reports Enhancement (July 11, 2025):
    - Added comprehensive date range filtering (From/To dates) replacing single date picker
    - Default date range set to current month start to current date for immediate usability
    - Implemented weekend overtime detection with automatic full-hour OT calculation
    - Added intelligent remark system showing "Saturday Work" or "Sunday Work" for weekend overtime
    - Enhanced Daily OT Reports page by replacing approval status column with descriptive remarks
    - Weekend overtime entries now display with orange highlighting to distinguish from regular OT
    - Fixed database date handling errors that caused "Invalid time value" issues
    - Updated overtime calculation logic: weekends show 0.00 required hours, full actual hours as OT
    - Integrated weekend work detection across both overtime management and reporting interfaces
    - All overtime entries now automatically approved with descriptive remarks for better tracking
    - Fixed Monthly Attendance Report to properly calculate weekend overtime (Saturday/Sunday work = full hours as OT)
    - Weekend overtime now properly reflected in monthly reports with consistent calculation across all report types
    - Updated Monthly OT Report date filter to automatically set from month start (1st) to current date for better user experience
    - Fixed Monthly Attendance Sheet date filter to show full month range (1st to 30th/31st) for complete monthly view
  - Three Additional Custom Reports Implementation (July 12, 2025):
    - Added Employee Punch Times Report showing all check-in/check-out timestamps with employee details and day information
    - Added Individual Employee Monthly Report with detailed daily breakdown including late/half-day/short leave status
    - Added Monthly Absence Report showing employees with poor attendance patterns and attendance percentages
    - Fixed date filter defaults for new reports (month start to current date for better usability)
    - Fixed Monthly Absence Report calculation to properly count working days and exclude weekends from leave calculations
    - Enhanced employee selection for Individual Monthly Report to require specific employee selection
    - All new reports include professional styling, proper filtering, and export functionality
    - Backend API endpoints implemented with comprehensive data validation and error handling
    - Successfully debugged and resolved database schema issues (schemas reference error)
    - Fixed employee name display by implementing proper JOIN queries between attendance and employees tables
    - All three reports now fully functional with 815+ punch records, daily attendance tracking, and absence pattern analysis
    - Reports correctly display employee data from database (some employees may have ID as name if not properly imported initially)