const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/timetable', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Helper function to process faculty workload data
function processFacultyWorkload(workbook) {
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(sheet, { range: 5 }); // Skip header rows
    
    const subjects = [];
    data.forEach(row => {
        if (row['Faculty Name'] && row['Subject'] && row['Sub Code']) {
            const subject = {
                code: row['Sub Code'],
                name: row['Subject'],
                faculty: row['Faculty Name'],
                year: row['Year'] || '',
                section: row['Sec'] || '',
                lectureHours: parseInt(row['L']) || 0,
                practicalHours: parseInt(row['P']) || 0,
                isLab: row['Subject'].toLowerCase().includes('lab'),
                totalLoad: parseInt(row['Load (L+P)']) || 0
            };
            subjects.push(subject);
        }
    });
    return subjects;
}

// Helper function to generate timetable
function generateTimetable(subjects) {
    const timeSlots = [
        '8:30-9:20', '9:20-10:10', '10:10-11:00', '11:00-11:50',
        '11:50-12:40', '12:40-1:30', '1:30-2:20', '2:20-3:10', '3:10-4:00'
    ];
    const days = ['Mon', 'Tue', 'Wed', 'Thurs', 'Fri'];
    
    // Initialize empty timetable
    const schedule = {};
    days.forEach(day => {
        schedule[day] = Array(timeSlots.length).fill(null);
    });

    // Add breaks first
    days.forEach(day => {
        schedule[day][2] = { subject: 'Break', faculty: '-', code: '-', room: '-' };
        schedule[day][5] = { subject: 'LUNCH', faculty: '-', code: '-', room: '-' };
    });

    // Sort subjects - labs first, then theory
    subjects.sort((a, b) => {
        if (a.isLab && !b.isLab) return -1;
        if (!a.isLab && b.isLab) return 1;
        return b.totalLoad - a.totalLoad; // Higher load gets priority
    });

    // Helper function to check if slot is available
    const isSlotAvailable = (day, slot, faculty, section) => {
        // Check if slot is empty
        if (schedule[day][slot]) return false;
        
        // Check faculty and section availability
        for (const d of days) {
            if (schedule[d][slot] && 
                (schedule[d][slot].faculty === faculty || 
                 schedule[d][slot].section === section)) {
                return false;
            }
        }
        return true;
    };

    // Assign subjects to slots
    subjects.forEach(subject => {
        const hoursNeeded = subject.isLab ? subject.practicalHours : subject.lectureHours;
        let hoursAssigned = 0;

        if (subject.isLab) {
            // For labs, try to assign consecutive slots
            for (let day of days) {
                if (hoursAssigned >= hoursNeeded) break;
                
                for (let slot = 0; slot < timeSlots.length - 2; slot++) {
                    if (hoursAssigned >= hoursNeeded) break;

                    if (isSlotAvailable(day, slot, subject.faculty, subject.section) &&
                        isSlotAvailable(day, slot + 1, subject.faculty, subject.section)) {
                        
                        const labSession = {
                            subject: subject.name,
                            faculty: subject.faculty,
                            code: subject.code,
                            section: subject.section,
                            room: `CSE LAB ${Math.floor(Math.random() * 5) + 1}`
                        };

                        schedule[day][slot] = labSession;
                        schedule[day][slot + 1] = labSession;
                        hoursAssigned += 2;
                    }
                }
            }
        } else {
            // For theory subjects
            for (let day of days) {
                if (hoursAssigned >= hoursNeeded) break;
                
                for (let slot = 0; slot < timeSlots.length; slot++) {
                    if (hoursAssigned >= hoursNeeded) break;
                    
                    if (isSlotAvailable(day, slot, subject.faculty, subject.section) &&
                        !schedule[day][slot]) {
                        
                        schedule[day][slot] = {
                            subject: subject.name,
                            faculty: subject.faculty,
                            code: subject.code,
                            section: subject.section,
                            room: 'LT-16'
                        };
                        hoursAssigned++;
                    }
                }
            }
        }
    });

    return {
        schedule,
        subjects: subjects.map(s => ({
            code: s.code,
            name: s.name,
            faculty: s.faculty,
            section: s.section,
            type: s.isLab ? 'Lab' : 'Theory'
        }))
    };
}

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('Processing file:', req.file.path);
        const workbook = xlsx.readFile(req.file.path);
        console.log('Workbook sheets:', workbook.SheetNames);
        
        const subjects = processFacultyWorkload(workbook);
        console.log('Processed subjects:', subjects.length);
        
        const timetable = generateTimetable(subjects);
        console.log('Timetable generated');

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            message: 'Timetable generated successfully',
            timetable
        });
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ message: 'Error processing file: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 