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

// Use express.json() middleware to parse JSON requests(transform the JSON to Javascript object)
app.use(express.json());

// Middleware to parse JSON requests
app.use(bodyParser.json());

//commonly used for parsing data from HTML forms
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



//Starting the Express server on port 3000.
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
