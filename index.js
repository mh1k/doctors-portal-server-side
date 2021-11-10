const express = require('express')
const { MongoClient } = require('mongodb');
const app = express()
const cors = require('cors')
require('dotenv').config();
const admin = require("firebase-admin");
const port = process.env.PORT || 5000

app.use(cors());
app.use(express.json());

// ph-doctor-point-firebase-adminsdk.json

const serviceAccount = require('./ph-doctor-point-firebase-adminsdk.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ippt8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {

        await client.connect();
        console.log("database connect successfully");

        const database = client.db("doctorPortal");
        const appointmentCollection = database.collection("appointments");
        const usersCollection = database.collection("users");


        //Get Appointment user appointment
        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = req.query.date;
            console.log(date);
            const query = { userEmail: email, date: date }
            console.log(query);
            const cursor = appointmentCollection.find(query)
            const appointments = await cursor.toArray()
            res.send(appointments)
        })


        //Get Appointment
        app.get('/appointments', async (req, res) => {
            const cursor = appointmentCollection.find({})
            const appointments = await cursor.toArray()
            res.send(appointments)
        })



        //Appointment post
        app.post('/appointments', async (req, res) => {

            const newAppointment = req.body;
            const result = await appointmentCollection.insertOne(newAppointment);
            console.log("got new user", req.body);
            console.log("added user", result);
            res.json(result)

        })

        //users put
        app.put('/users', async (req, res) => {

            const user = req.body;
            const filter = { email: user.email }
            const options = { upsert: true }
            const updateDoc = { $set: user }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            console.log("got new user", req.body);
            console.log("added user", result);
            res.json(result)

        })


        app.put('/users/admin', verifyToken, async (req, res) => {

            const user = req.body;
            // console.log('put', req.decodedEmail); 
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email }
                    const updateDoc = { $set: { role: 'admin' } }
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    console.log("added user", result);
                    res.json(result)
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }


        })
        // app.put('/users/admin', verifyToken, async (req, res) => {

        //     const user = req.body;
        //     console.log('put', req.decodedEmail); 
        //     const filter = { email: user.email }
        //     // console.log("put", req.decodedEmail);
        //     // console.log("put", req.headers.authorization);

        //     const updateDoc = { $set: { role: 'admin' } }
        //     const result = await usersCollection.updateOne(filter, updateDoc);
        //     console.log("added user", result);
        //     res.json(result)
        //     /* const token = req.headers?.authorization.split(' ')[1];
        //     const decodedUser = await admin.auth().verifyIdToken(token);
        //     req.decodedEmail = decodedUser.email;
        //     console.log(req.decodedEmail); */

        // })

        app.get('/users/:email', async (req, res) => {

            const email = req.params.email;
            const query = { email: email }

            const user = await usersCollection.findOne(query);
            let isAdmin = false
            if (user?.role === 'admin') {
                isAdmin = true
            }
            res.json({ admin: isAdmin })

        })

        //users post
        app.post('/users', async (req, res) => {

            const newUsers = req.body;
            const result = await usersCollection.insertOne(newUsers);
            console.log("got new user", req.body);
            console.log("added user", result);
            res.json(result)

        })

    }

    finally {

        // await client.close()

    }

}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Welcome to doctor portal')
})

app.listen(port, () => {
    console.log(`listening at ${port}`)
})