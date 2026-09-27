require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express'); 
const path = require('path');
const connectDb = require('./config/db');
const cors = require('cors');
const logger = require('./middleware/logger');
const authRouter = require('./router/auth');
const getUserRouter = require('./router/userinfo');
const adminAuth = require('./router/adminAuth');
const adminUserRouter = require('./router/user');
const courseRouter = require('./router/course');
const getCourseROuter = require('./router/getCourse');
const teacherRouter = require('./router/teacher');
const enrollmentRouter = require('./router/enrollment');
const paymentRouter = require('./router/payment');
const assignmentRouter = require('./router/assignment');
const lectureRouter = require('./router/lecture');
const liveClassRouter = require('./router/liveClass');
const logsRouter = require('./router/logs');
const termsRouter = require('./router/terms');
const contactRouter = require('./router/contact');

const app = express(); 

const port = process.env.PORT || 8000; 

// middleware 
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));
app.use(cors()); 
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// request logger
app.use(logger);

// health check
app.get("/api/health", (req, res) => res.json({ status: "ok", message: "UniSkill Backend is active" }));

// router 
app.use("/api/auth" , authRouter); 
app.use("/api/get" , getUserRouter);
app.use("/api" , adminAuth);
app.use("/api" , adminUserRouter);
app.use("/api" , courseRouter); 
app.use("/api" , getCourseROuter); 
app.use("/api" , teacherRouter);
app.use("/api" , enrollmentRouter);
app.use("/api" , paymentRouter);
app.use("/api" , assignmentRouter);
app.use("/api" , lectureRouter);
app.use("/api" , liveClassRouter);
app.use("/api" , logsRouter);
app.use("/api" , termsRouter);
app.use("/api" , contactRouter);

// database 
connectDb();

app.listen(port , ()=> {
    console.log(`server is running on the port : ${port}`);
});