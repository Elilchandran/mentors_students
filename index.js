const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Connecting to MongoDB Atlas
const mongoURI = 'mongodb+srv://elilarasi:elilarasi@cluster0.0ley2q5.mongodb.net/mentor&student_db?retryWrites=true&w=majority';
mongoose.connect(mongoURI);

const db = mongoose.connection;

db.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
});

db.on('connected', () => {
    console.log('Connected to MongoDB');
});

db.on('disconnected', () => {
    console.log('Disconnected from MongoDB');
});

process.on('SIGINT', () => {
    db.close(() => {
        console.log('MongoDB connection closed due to application termination');
        process.exit(0);
    });
});

// Enable CORS
app.use(cors());

// Use express.json() middleware to parse JSON requests
app.use(express.json());

// Middleware to parse JSON requests
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Defining MongoDB schemas
const mentorSchema = new mongoose.Schema({
    name: String,
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }]
});

const studentSchema = new mongoose.Schema({
    name: String,
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'Mentor' }
});

const Mentor = mongoose.model('Mentor', mentorSchema);
const Student = mongoose.model('Student', studentSchema);

//get
app.get('/', async (req, res) => {
    res.send("Welcome to the API!");
});

// create a mentor
app.post('/api/mentors', async (req, res) => {
    const mentor = new Mentor({
        name: req.body.name,
        students: []
    });

    await mentor.save();
    res.json(mentor);
});

// create a student
app.post('/api/students', async (req, res) => {
    const student = new Student({
        name: req.body.name,
        mentor: null
    });

    await student.save();
    res.json(student);
});

// Assigning a student to a mentor
// Assigning a student to a mentor
app.put('/api/assign', async (req, res) => {
    try {
        const mentorId = req.body.mentorId;
        const studentId = req.body.studentId;

        const mentor = await Mentor.findById(mentorId);
        const student = await Student.findById(studentId);

        mentor.students.push(student._id);
        student.mentor = mentor._id;

        await mentor.save();
        await student.save();

        res.json({ mentor, student });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


//Showing students for a particular mentor
app.get('/api/mentors/:mentorId/students', async (req, res) => {
    try {
        const mentor = await Mentor.findById(req.params.mentorId).populate('students');
        res.json(mentor.students);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Showing all unassigned students
app.get('/api/students/unassigned', async (req, res) => {
    try {
        const unassignedStudents = await Student.find({ mentor: null });
        res.json(unassignedStudents);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



// Adding  multiple students to one mentor
app.put('/api/mentors/:mentorId/addStudents', async (req, res) => {
    try {
        const mentorId = req.params.mentorId;
        let studentIds = req.body.studentIds;

        // Remove duplicate student IDs
        studentIds = Array.from(new Set(studentIds));

        const mentor = await Mentor.findById(mentorId);
        const students = await Student.find({ _id: { $in: studentIds } });

        students.forEach(student => {
            mentor.students.push(student._id);
            student.mentor = mentor._id;
        });

        await mentor.save();
        await Student.updateMany({ _id: { $in: studentIds } }, { mentor: mentor._id });

        res.json({ mentor, students });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Assigning or changing  mentor for a particular student
app.put('/api/students/:studentId/assignMentor', async (req, res) => {
    try {
        const studentId = req.params.studentId;
        const mentorId = req.body.mentorId;

        const student = await Student.findById(studentId);
        const mentor = await Mentor.findById(mentorId);

        if (student) {
        // Remove student from current mentor's list
            if (student.mentor) {
                const currentMentor = await Mentor.findById(student.mentor);
                currentMentor.students.pull(student._id);
                await currentMentor.save();
            }
        // Assign to the new mentor
                mentor.students.push(student._id);
                student.mentor = mentor._id;

                await mentor.save();
                await student.save();

                res.json({ mentor, student });
            } else {
                res.status(404).json({ error: 'Student not found' });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Internal server error' });
        }
        });



// Showing  assigned mentor for a particular student
app.get('/api/students/:studentId/sMentor', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        if (student.mentor) {
            const sMentor = await Mentor.findById(student.mentor);

            if (sMentor) {
                res.json(sMentor);
            } else {
                res.status(404).json({ error: 'mentor not found' });
            }
        } else {
            res.status(404).json({ error: 'No mentor assigned' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
