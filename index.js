let express = require("express");
let app = express();
let path = require("path");
const knex = require('knex')({
    client: 'pg',
    connection: {
        host: process.env.RDS_HOSTNAME || 'localhost',
        user: process.env.RDS_USERNAME || 'postgres',
        password: process.env.RDS_PASSWORD || 'denseTeam3-1',
        database: process.env.RDS_DB_NAME || 'intex',
        port: process.env.RDS_PORT || 5432,
        ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
    },
});

let security = false;

const port = process.env.PORT || 5500;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({extended: true})); // Makes it so the server can get the stuff out of the form //Id is for DOM, Name is for the server
app.use(express.static('public')); // Enabling public folder for css

// Routing to pages
app.get('/', (req, res) => {
    res.render('landingPage', {title: 'Turtle Shelter Project'});
});

app.get('/about', (req, res) => {
    res.render('pages/about', {title : 'About'})
})

app.get('/how-you-can-help', (req, res) => {
    res.render('pages/how-you-can-help', {title : 'How You Can Help'})
})

app.get('/sponsors', (req, res) => {
    res.render('pages/sponsors', {title : 'Our Sponsors'})
})

app.get('/login', (req, res) => {
    res.render('pages/login', {title : 'Login'})
})

app.get('/requestEvent', (req, res) => {
    res.render('pages/requestEvent', {title : 'Request Event'})
})

app.get('/beVolunteer', (req, res) => {
    res.render('pages/beVolunteer', {title : 'Be a Volunteer'})
})

app.get('/maintainEmployees', async (req, res) => {
    try {
        // Fetch employees data from the database
        const Employees = await knex('employees').select('*'); // Adjust table name to your schema

        // Render the EJS page and pass the Employees data
        res.render('internalPages/maintainEmployees', { title: 'Maintain Employee Records', Employees });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Login route - Handle login request
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Query to find the user in the database
    knex('users').where({ username }).first()
        .then(user => {
            if (!user) {
                return res.status(401).send('Invalid username or password');
            }

            // Compare passwords directly (encryption to be added later)
            if (password === user.password) {
                return res.send('Login successful');
            } else {
                return res.status(401).send('Invalid username or password');
            }
        })
        .catch(err => {
            console.error('Error executing query:', err);
            return res.status(500).send('Internal Server Error');
        });
});

// Handle event request submissions
app.post('/submit-event', (req, res) => {
    const {
        DateRequestSent, 
        TimeRequestSent, 
        EventPreferredDate, 
        EventPossibleDate,
        Participants, 
        Child, 
        Teen, 
        Adult, 
        service_type, 
        BasicSewing, 
        AdvancedSewing, 
        SewingMachines, 
        Sergers, 
        StreetAddress, 
        City, 
        State, 
        Zipcode, 
        SizeOfArea,
        PreferredTime, 
        PreferredDuration, 
        ContactFirstName, 
        ContactLastName, 
        ContactPhone, 
        ContactEmail, 
        OrganizationName, 
        Story, 
        willingToDonate
    } = req.body;

    // Insert the data into your database
    knex('events') // Replace 'events' with your actual table name
        .insert({
            date_request_sent: DateRequestSent,
            time_request_sent: TimeRequestSent,
            event_preferred_date: EventPreferredDate,
            event_possible_date: EventPossibleDate,
            participants: Participants,
            child: Child,
            teen: Teen,
            adult: Adult,
            service_type,
            basic_sewing: BasicSewing,
            advanced_sewing: AdvancedSewing,
            sewing_machines: SewingMachines,
            sergers: Sergers,
            street_address: StreetAddress,
            city: City,
            state: State,
            zipcode: Zipcode,
            size_of_area: SizeOfArea,
            preferred_time: PreferredTime,
            preferred_duration: PreferredDuration,
            contact_first_name: ContactFirstName,
            contact_last_name: ContactLastName,
            contact_phone: ContactPhone,
            contact_email: ContactEmail,
            organization_name: OrganizationName,
            story: Story,
            willing_to_donate: willingToDonate === 'true' // Convert to boolean
        })
        .then(() => {
            res.status(200).send('Event request submitted successfully');
        })
        .catch(err => {
            console.error('Error inserting data:', err);
            res.status(500).send('Internal Server Error');
        });
});


// Shows server is listening on start up
app.listen(port, () => console.log("Listening..."));
