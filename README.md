# Timetable Generator

A MERN stack application for generating class timetables from faculty workload Excel files.

## Features

- Upload faculty workload Excel files
- Automatically generate timetables based on constraints
- View generated timetables in a clean, organized format
- Download timetables as JSON files
- Responsive design

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd timetable-generator
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../frontend
npm install
```

## Configuration

1. Create a `.env` file in the backend directory:
```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/timetable
```

## Running the Application

1. Start MongoDB:
```bash
mongod
```

2. Start the backend server:
```bash
cd backend
npm start
```

3. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at http://localhost:3000

## Input File Format

The Excel file should contain two sheets:

1. Faculty Load:
   - Subject Code
   - Subject Name
   - Faculty Name
   - Hours per Week
   - Room (optional)

2. Time Constraints:
   - Faculty Name
   - Day
   - Unavailable Time Slots

## Usage

1. Click "Choose Excel File" to select your faculty workload Excel file
2. Click "Generate Timetable" to process the file
3. View the generated timetable
4. Click "Download Timetable" to save the timetable as a JSON file

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 