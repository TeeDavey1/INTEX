let express = require("express");
let app = express();
let path = require("path");

const knex = require('knex')({
    client: 'pg',
    connection: {
        host: 'awseb-e-wkpcibnp9x-stack-awsebrdsdatabase-xknynwspgdvf.c3kig2yiipwf.us-east-1.rds.amazonaws.com',
        user: 'ebroot',
        password: 'denseTeam3-1',
        database: 'ebdb',
        port: 5432,
        ssl: { rejectUnauthorized: false } // Enables SSL for secure connection
    },
});

const jwt = require('jsonwebtoken');

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

app.get('/admin-login', (req, res) => {
    res.render('internalPages/admin-login', {title: 'Admin Login'})
})

app.get('/requestEvent', (req, res) => {
    res.render('pages/requestEvent', {title : 'Request Event'})
})

app.get('/beVolunteer', (req, res) => {
    res.render('pages/beVolunteer', {title : 'Be a Volunteer'})
})

// maintain employees section
app.get('/maintainEmployees', async (req, res) => {
    try {
        // Fetch all employee data
        const Employees = await knex('employees').select('*'); // Adjust table name if necessary
        
        // Render the EJS page and pass the Employees data
        res.render('internalPages/maintainEmployees', { title: 'Maintain Employee Records', Employees });
    } catch (error) {
        console.error('Error fetching employees:', error);
        res.status(500).send('Internal Server Error');
    }
});
// maintain volunteer section
app.get('/maintainVolunteers', async (req, res) => {
    try {
        // Fetch all employee data
        const volunteers = await knex('volunteers').select('*'); // Adjust table name if necessary
        
        // Render the EJS page and pass the Employees data
        res.render('internalPages/maintainVolunteers', { title: 'Maintain Volunteer Records', volunteers });
    } catch (error) {
        console.error('Error fetching volunteers:', error);
        res.status(500).send('Internal Server Error');
    }
});


// view employee
app.get('/viewEmployee/:id', async (req, res) => {
    const employeeId = req.params.id;

    try {
        // Fetch the employee's details from the database
        const employee = await knex('employees')
            .where({ empid: employeeId })
            .first(); // Fetch a single employee
        
        if (employee) {
            res.render('internalPages/viewEmployee', { title: 'View Employee', employee });
        } else {
            res.status(404).send('Employee not found');
        }
    } catch (error) {
        console.error('Error fetching employee details:', error);
        res.status(500).send('Internal Server Error');
    }
});

// view volunteer
app.get('/viewVolunteer/:id', async (req, res) => {
    const volunteerId = req.params.id;

    try {
        // Fetch the employee's details from the database
        const volunteer = await knex('volunteers')
            .where({ volid: volunteerId })
            .first(); // Fetch a single employee
        
        if (volunteer) {
            res.render('internalPages/viewVolunteer', { title: 'View Volunteer', volunteer });
        } else {
            res.status(404).send('Volunteer not found');
        }
    } catch (error) {
        console.error('Error fetching volunteer details:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/addEmployee', (req, res) => {
    // This will pass an empty employee object to the page
    res.render('internalPages/addEmployee', { title: 'Add Employee', employee: {} });
});

// Route to add a new employee
app.post('/addEmployee', async (req, res) => {
    try {
        await knex('employees').insert(req.body); // Ensure data validation here
        res.redirect('/maintainEmployees');
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/editEmployee/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const employee = await knex('employees').where('empid', id).first();
        res.render('internalPages/editEmployee', { title: 'Edit Employee', employee });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to update an employee's information
app.post('/editEmployee/:id', async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body; // Add validation here
    try {
        // Update the employee data in the database
        await knex('employees').where('empid', id).update(updatedData);
        
        // Redirect to the employee view or maintainEmployees page
        res.redirect(`/viewEmployee/${id}`);
    } catch (error) {
        console.error('Error updating employee:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/deleteEmployee/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await knex('employees').where('empid', id).del();
        res.redirect('/maintainEmployees');
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).send('Internal Server Error');
    }
});

// maintain volunteers section
app.get('/maintainVolunteers', async (req, res) => {
    try {
        // Fetch all employee data
        const Employees = await knex('volunteers').select('*'); // Adjust table name if necessary
        
        // Render the EJS page and pass the Volunteers data
        res.render('internalPages/maintainVolunteers', { title: 'Maintain Volunteer Records', Employees });
    } catch (error) {
        console.error('Error fetching volunteers:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Login route - Handle login request
app.post('/admin-login-submit', (req, res) => {
    const { username, password } = req.body;

    // Query to find the employee in the database
    knex('employees').where({ empusername: username }).first()
        .then(employee => {
            if (!employee) {
                return res.status(401).send('Invalid username or password');
            }

            // Compare passwords directly (encryption to be added later)
            if (password === employee.emppassword) {
                return res.render('internalPages/adminLanding');
            } else {
                return res.status(401).send('Invalid username or password');
            }
        })
        .catch(err => {
            console.error('Error executing query:', err);
            return res.status(500).send('Internal Server Error');
        });
});

// Login Page
app.post('/login-submit', (req, res) => {
    const { username, password } = req.body;

    // Query to find the employee in the database
    knex('volunteers').where({ volusername: username }).first()
        .then(volunteer => {
            if (!volunteer) {
                return res.status(401).send('Invalid username or password');
            }

            // Compare passwords directly (encryption to be added later)
            if (password === volunteer.volpassword) {
                return res.redirect('/');
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
