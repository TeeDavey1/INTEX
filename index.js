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

let session = require("express-session");

const port = process.env.PORT || 5500;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.use(express.urlencoded({extended: true})); // Makes it so the server can get the stuff out of the form //Id is for DOM, Name is for the server
app.use(express.static('public')); // Enabling public folder for css

// Setting up express-session middleware
app.use(session({
    secret: 'denseTeam3-1', // Secret key to sign the session ID cookie
    resave: false, // Avoid resaving the session if it wasn't modified
    saveUninitialized: false, // Don't save uninitialized sessions
    cookie: { secure: false } // Set `true` if using HTTPS; for development, `false` is fine
}));

// Updated Login route for admin
app.post('/admin-login-submit', async (req, res) => {
    const { username, password } = req.body;

    try {
        const employee = await knex('employees').where({ empusername: username }).first();

        if (!employee || password !== employee.emppassword) {
            console.log('Invalid credentials'); // Debug: Log invalid credentials
            return res.status(401).send('Invalid username or password');
        }

        // Store user info in session upon successful login
        req.session.isAuthenticated = true;
        req.session.user = {
            username: employee.empusername,
            role: employee.emppermissions, // Store role based on emppermissions column
        };

        console.log("Session after login:", req.session); // Debug: Log the session after setting it

        req.session.save((err) => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).send("Internal Server Error");
            }

            if (employee.emppermissions == 'admin') {
                res.redirect('/adminLanding');
            } else {
                return res.status(401).send('Invalid permissions');
            }
        });
    } catch (error) {
        console.error('Error executing query:', error);
        return res.status(500).send('Internal Server Error');
    }
});

// Middleware to check if the user is authenticated and has admin privileges
const ensureAdmin = (req, res, next) => {
    console.log("Session data:", req.session); // Debug: Log session data
    if (req.session && req.session.isAuthenticated && req.session.user.role == 'admin') {
        next();
    } else {
        res.redirect('/admin-login');
    }
};

// Protecting the /adminLanding route with admin authentication middleware
app.get('/adminLanding', ensureAdmin, (req, res) => {
    res.render('internalPages/adminLanding', { title: 'Admin Home' });
});

// Routing to pages
app.get('/', (req, res) => {
    res.render('landingPage', {title: 'Turtle Shelter Project'});
});

app.get('/admin-login', (req, res) => {
    res.render('internalPages/admin-login', {title: 'Admin Login'});
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
    // res.render('pages/beVolunteer', { title: 'Be a Volunteer', volunteer: volunteerData });

})

// Logout route to clear the session
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Failed to destroy session:", err);
            return res.status(500).send('Failed to log out');
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.redirect('/');
    });
});

// maintain employees section
app.get('/maintainEmployees', ensureAdmin, async (req, res) => {
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
// // maintain volunteer section
// app.get('/maintainVolunteers', ensureAdmin, async (req, res) => {
//     try {
//         // Fetch all employee data
//         const volunteers = await knex('volunteers').select('*'); // Adjust table name if necessary
        
//         // Render the EJS page and pass the Employees data
//         res.render('internalPages/maintainVolunteers', { title: 'Maintain Volunteer Records', volunteers });
//     } catch (error) {
//         console.error('Error fetching volunteers:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });
// maintain events section
app.get('/maintainEvents', ensureAdmin, async (req, res) => {
    try {
        // Insert event information into events table, including the contact ID
        const Events = await knex('events')
        .leftJoin('eventcontact', 'events.contactid', 'eventcontact.contactid')
        .select('*');
        // Render the EJS page and pass the Events data
        res.render('internalPages/maintainEvents', { title: 'Maintain Event Records', Events });
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).send('Internal Server Error');
    }
});

// maintain contacts
app.get('/maintainContact', ensureAdmin, async (req, res) => {
    try {
        // Query to fetch all contact records from the eventcontact table using knex
        const Contacts = await knex('eventcontact').select('*')
            .orderBy('contactlast', 'contactfirst');

        // Render the maintainContact EJS template with the fetched contacts
        res.render('internalPages/maintainContact', { title: 'Maintain Event Contacts', Contacts });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        res.status(500).send('Internal Server Error');
    }
});


// view employee
app.get('/viewEmployee/:id', ensureAdmin, async (req, res) => {
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
app.get('/viewVolunteer/:id', ensureAdmin, async (req, res) => {
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

// Route to view an event's information
app.get('/viewEvent/:eventid', ensureAdmin, async (req, res) => {
    const { eventid } = req.params;

    try {
        // Fetch event details from the events table
        const event = await knex('events')
            .leftJoin('eventcontact', 'events.contactid', 'eventcontact.contactid')
            .select('*')
            .where('events.eventid', eventid)
            .first();

        if (!event) {
            return res.status(404).send('Event not found');
        }

        // Fetch volunteers associated with the event
        const volunteers = await knex('volunteerevents')
            .leftJoin('volunteers', 'volunteerevents.volid', 'volunteers.volid')
            .select('volunteers.volid', 'volunteers.volfirst', 'volunteers.vollast')
            .where('volunteerevents.eventid', eventid);

        // Render the event details page and pass event details
        res.render('internalPages/viewEvent', { title: 'Event Details', event, volunteers });
    } catch (error) {
        console.error('Error fetching event details:', error);
        res.status(500).send('Internal Server Error');
    }
});


// view event
// app.get('/viewEvent/:eventid', ensureAdmin, async (req, res) => {
//     const eventid = req.params.eventid;
//     try {
//         // Fetch the event's details from the database
//         const eventDetails = await knex('events')
//             .leftJoin('eventcontact', 'events.contactid', 'eventcontact.contactid')
//             .select('*')
//             .where('events.eventid', eventid)
//             .first();        
//             if (!eventDetails) {
//                 return res.status(404).send('Event not found');
//             }
    
//             // Render the event details page and pass event details
//             res.render('internalPages/viewEvent', { title: 'Event Details', event: eventDetails });
//         } catch (error) {
//             console.error('Error fetching event details:', error);
//             res.status(500).send('Internal Server Error');
//         }
//     });
    

app.get('/addVolunteer', ensureAdmin, (req, res) => {
    res.render('internalPages/addVolunteer');
});




app.post('/deleteVolunteer/:id', ensureAdmin, async (req, res) => {
    const volid = req.params.id;
    try {
        const volidDelete = await knex('volunteerevents')
        .where('volid', volid)
        .del();
        const volunteerDelete = await knex('volunteers')
        .where('volid', volid)
        .del(); // Deletes the record with the specified ID
        if (!volunteerDelete) {
            return res.status(404).send('Event not found');
        }
        res.redirect('/maintainVolunteers'); // Change this to match the GET route
    } catch (error) {
            console.error('Error deleting:', error);
            res.status(500).send('Internal Server Error');
        }
});

// app.post('/internalPages/beVolunteer', (req, res) => {
//     // Extract form values from req.body
//     const {
//         volfirst, vollast, volphone, volemail, volgender, volbirthday,
//         volshirtsize, volusername, volpassword, volstreetaddress, volcity, volstate, 
//         volzipcode, lead, volnumhourspermonth, volstartdate, volstatus, 
//         volsewinglevel, voldiscovery
//     } = req.body;

//     // Insert the new record into the database
//     knex('volunteers')
//         .insert({
//             volfirst,
//             vollast,
//             volphone,
//             volemail,
//             volgender,
//             volbirthday,
//             volshirtsize,
//             volusername,
//             volpassword,
//             volstreetaddress,
//             volcity,
//             volstate,
//             volzipcode,
//             lead: lead === 'on', // Checkbox returns "on" if checked
//             volnumhourspermonth,
//             volstartdate,
//             volstatus,
//             volsewinglevel,
//             voldiscovery
//         })
//         .then(() => {
//             res.redirect('/'); // Redirect after adding
//         })
//         .catch(error => {
//             console.error('Error adding record:', error);
//             res.status(500).send('Internal Server Error');
//         });
// });

app.post('/beVolunteer', (req, res) => {
    // Extract form values from req.body
    const {
        volfirst, vollast, volphone, volemail, newsletter, volgender, volbirthday,
        volshirtsize, volstreetaddress, volcity, volstate, 
        volzipcode, lead, volnumhourspermonth, volstartdate, volstatus, 
        volsewinglevel, voldiscovery, volavailabilitynotes
    } = req.body;

    // Insert the new record into the database
    knex('volunteers')
        .insert({
            volfirst: volfirst,
            vollast: vollast,
            volphone: volphone,
            volemail: volemail,
            newsletter: newsletter === 'on',
            volgender: volgender,
            volbirthday: volbirthday,
            volshirtsize: volshirtsize,
            volstreetaddress: volstreetaddress,
            volcity: volcity,
            volstate: volstate,
            volzipcode: volzipcode,
            lead: lead === 'on', // Checkbox returns "on" if checked
            volnumhourspermonth: volnumhourspermonth,
            volstartdate: volstartdate,
            volstatus: volstatus,
            volsewinglevel: volsewinglevel,
            voldiscovery: voldiscovery,
            volavailabilitynotes: volavailabilitynotes
        })
        .then(() => {
            res.redirect('/'); // Redirect after adding
        })
        .catch(error => {
            console.error('Error adding record:', error);
            res.status(500).send('Internal Server Error');
        });
});

app.post('/addVolunteer', (req, res) => {
    // Extract form values from req.body
    const {
        volfirst, vollast, volphone, volemail, newsletter, volgender, volbirthday,
        volshirtsize, volstreetaddress, volcity, volstate, 
        volzipcode, lead, volnumhourspermonth, volstartdate, volstatus, 
        volsewinglevel, voldiscovery, volavailabilitynotes
    } = req.body;

    // Insert the new record into the database
    knex('volunteers')
        .insert({
            volfirst: volfirst,
            vollast: vollast,
            volphone: volphone,
            volemail: volemail,
            newsletter: newsletter === 'on',
            volgender: volgender,
            volbirthday: volbirthday,
            volshirtsize: volshirtsize,
            volstreetaddress: volstreetaddress,
            volcity: volcity,
            volstate: volstate,
            volzipcode: volzipcode,
            lead: lead === 'on', // Checkbox returns "on" if checked
            volnumhourspermonth: volnumhourspermonth,
            volstartdate: volstartdate,
            volstatus: volstatus,
            volsewinglevel: volsewinglevel,
            voldiscovery: voldiscovery,
            volavailabilitynotes: volavailabilitynotes
        })
        .then(() => {
            res.redirect('/maintainVolunteers');
        })
        .catch(error => {
            console.error('Error adding record:', error);
            res.status(500).send('Internal Server Error');
        });
});

// Route to add a new volunteer
// app.post('/addVolunteer', ensureAdmin, async (req, res) => {
//     try {
//         // Convert all form data to lowercase
//         const formData = Object.fromEntries(
//             Object.entries(req.body).map(([key, value]) => [key, value.toLowerCase()])
//         );
//         await knex('volunteers').insert(formData); // Ensure data validation here
//         res.redirect('/maintainVolunteers');
//     } catch (error) {
//         console.error('Error adding volunteer:', error);
//         res.status(500).send('Internal Server Errors');
//     }
// });

// app.post('/internalPages/addVolunteer', ensureAdmin, async (req, res) => {
//     const { volfirst, vollast, volphone, volemail, volgender, volbirthday, volshirtsize, 
//             volusername, volpassword, volstreetaddress, volcity, volstate, volzipcode, 
//             lead, volnumhourspermonth, volstartdate, volstatus, volsewinglevel } = req.body;

//     try {
//         // Insert the new volunteer into the database
//         await knex('volunteers').insert({
//             volfirst,
//             vollast,
//             volphone,
//             volemail,
//             volgender,
//             volbirthday,
//             volshirtsize,
//             volusername,
//             volpassword,
//             volstreetaddress,
//             volcity,
//             volstate,
//             volzipcode,
//             lead: lead ? true : false, // Converts checkbox to a boolean
//             volnumhourspermonth,
//             volstartdate,
//             volstatus,
//             volsewinglevel
//         });

//         // Redirect to the volunteer management page after adding the new volunteer
//         res.redirect('internalPages/maintainVolunteers');
//     } catch (error) {
//         console.error('Error adding volunteer:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });



// GET route to display the Add Contact form
app.get('/addContact', (req, res) => {
    res.render('internalPages/addContact', { title: 'Add Contact', contact: {} });
});

// POST route to handle form submission and add contact to the database
app.post('/addContact', ensureAdmin, async (req, res) => {
    const { contactFirstName, contactLastName, contactPhone, contactEmail } = req.body;

    // Insert contact data into PostgreSQL using Knex
    try {
        await knex('contacts').insert({
            contactFirstName,
            contactLastName,
            contactPhone,
            contactEmail
        });
        res.send('Contact added successfully!');
    } catch (err) {
        console.error('Error inserting contact into database:', err);
        res.send('Error adding contact.');
    }
});


app.get('/addEmployee', (req, res) => {
    // This will pass an empty employee object to the page
    res.render('internalPages/addEmployee', { title: 'Add Employee', employee: {} });
});

// Route to add a new employee
app.post('/addEmployee', ensureAdmin, async (req, res) => {
    try {
        // Convert all form data to lowercase
        const formData = Object.fromEntries(
            Object.entries(req.body).map(([key, value]) => [key, value.toLowerCase()])
        );
        await knex('employees').insert(formData); // Ensure data validation here
        res.redirect('/maintainEmployees');
    } catch (error) {
        console.error('Error adding employee:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to render the Add Event form
app.get('/addEvent', (req, res) => {
    res.render('internalPages/addEvent', { title: 'Add Event', event: {} });
});

// app.post('/addEvent', async (req, res) => {
//     try {
//         await knex('events').insert(req.body); // Ensure data validation here
//         res.redirect('/maintainEvent');
//     } catch (error) {
//         console.error('Error adding event:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });


app.get('/editEmployee/:id', ensureAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const employee = await knex('employees').where('empid', id).first();
        res.render('internalPages/editEmployee', { title: 'Edit Employee', employee });
    } catch (error) {
        console.error('Error fetching employee:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/editVolunteer/:id', ensureAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const volunteer = await knex('volunteers').where('volid', id).first();
        res.render('internalPages/editVolunteer', { title: 'Edit Volunteer', volunteer });
    } catch (error) {
        console.error('Error fetching volunteer:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/editEvent/:eventId', ensureAdmin, async (req, res) => {
    const { eventId } = req.params;
    try {
        const event = await knex('events')
            .leftJoin('eventcontact', 'events.contactid', 'eventcontact.contactid')
            .select('*')
            .where('events.eventid', eventId)
            .first();

        const volunteers = await knex('volunteers').select('volid', 'volfirst', 'vollast').orderBy('volfirst','vollast');
        
        res.render('internalPages/editEvent', { title: 'Edit Event', event, volunteers });
    } catch (error) {
        console.error('Error fetching event:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to update an event's information
app.post('/editEvent/:eventid', ensureAdmin, async (req, res) => {
    const { eventid } = req.params;
    const updatedData = req.body;

    console.log('Updated data:', updatedData); // Log the updated data for debugging

    try {
        // Update the event data in the events table
        const validEventColumns = [
            'daterequestsent', 'timerequestsent', 'eventprefdate', 'eventpossdate', 'preftime', 'prefduration', 'servicetype',
            'streetaddress', 'city', 'state', 'zipcode', 'basicsewing',
            'advsewing', 'sewingmachines', 'sergers', 'participants', 'child', 'teen',
            'adult', 'sizeofarea', 'organizationname', 'story', 'willingtodonate',
            'eventstatus', 'actualdate', 'actualduration', 'actualeventtime', 'actualparticipants'
        ];

        const eventUpdateData = Object.keys(updatedData)
            .filter(key => validEventColumns.includes(key))
            .reduce((obj, key) => {
                // Handle empty strings for date and time fields
                if (updatedData[key] === '') {
                    obj[key] = null;
                } else {
                    obj[key] = updatedData[key];
                }
                return obj;
            }, {});

        // Ensure eventid is an integer
        const parsedEventId = parseInt(eventid);
        if (isNaN(parsedEventId)) {
            throw new Error('Invalid event ID');
        }

        // Update event information in the events table
        await knex('events').where({ eventid: parsedEventId }).update(eventUpdateData);

        // Update the contact information in the eventcontact table
        if (updatedData.contactfirst && updatedData.contactlast && updatedData.contactphone && updatedData.contactemail) {
            const contactUpdateData = {
                contactfirst: updatedData.contactfirst,
                contactlast: updatedData.contactlast,
                contactphone: updatedData.contactphone,
                contactemail: updatedData.contactemail
            };

            if (!updatedData.contactid) {
                // Fetch the contact ID associated with the event
                const contact = await knex('events').select('contactid').where({ eventid: parsedEventId }).first();
                if (!contact) {
                    throw new Error('Contact ID is missing and could not be retrieved');
                }
                updatedData.contactid = contact.contactid;
            }

            await knex('eventcontact').where({ contactid: updatedData.contactid }).update(contactUpdateData);
        }

        // Update the volunteer-event relationships in volunteerevents table
        if (updatedData.volunteers && Array.isArray(updatedData.volunteers)) {
            // Remove existing volunteer-event relationships for the event
            await knex('volunteerevents').where({ eventid: parsedEventId }).del();

            // Insert new volunteer-event relationships
            const volunteerEntries = updatedData.volunteers.map(volid => {
                const parsedVolId = parseInt(volid);
                if (isNaN(parsedVolId)) {
                    throw new Error('Invalid volunteer ID');
                }
                return {
                    volid: parsedVolId,
                    eventid: parsedEventId
                };
            });
            await knex('volunteerevents').insert(volunteerEntries);
        }

        // Redirect to the event view page
        res.redirect(`/viewEvent/${eventid}`);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).send('Internal Server Error');
    }
});





// // Route to update an event's information 
// app.post('/editEvent/:eventid', ensureAdmin, async (req, res) => {
//     const { eventid } = req.params;
//     const updatedData = req.body;

//     console.log('Updated data:', updatedData); // Log the updated data for debugging

//     try {
//         const event = await knex('events')
//             .leftJoin('eventcontact', 'events.contactid', 'eventcontact.contactid')
//             .select('*')
//             .where('events.eventid', eventid)
//             .first();
//         // Redirect to the event view or maintainEvents page
//         res.redirect(`/viewEvent/${eventid}`);
//     } catch (error) {
//         console.error('Error updating event:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });

app.post('/editEmployee/:id', ensureAdmin, async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body; // Add validation here
    try {
        await knex('employees').where('empid', id).update(updatedData);
        res.redirect(`/viewEmployee/${id}`);
    } catch (error) {
        console.error('Error updating event:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/editVolunteer/:id', ensureAdmin, async (req, res) => {
    const { id } = req.params;
    const updatedData = req.body; // Add validation here
    try {
        // Update the volunteer data in the database
        await knex('volunteers').where('volid', id).update(updatedData);
        
        // Redirect to the volunteer view or maintainVolunteers page
        res.redirect(`/viewVolunteer/${id}`);
    } catch (error) {
        console.error('Error updating volunteer:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/deleteEvent/:eventid', ensureAdmin, async (req, res) => {
    const eventid = req.params.eventid;
    try {
        const eventProductsDelete = await knex('eventproducts')
        .where('eventid', eventid).del();
        const eventDelete = await knex('events')
        .where('eventid', eventid).del();
        if (!eventDelete) {
            return res.status(404).send('Event not found');
        }

        // Render the event details page and pass event details
        res.redirect('/maintainEvents');
    } catch (error) {
        console.error('Error deleting event:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.post('/deleteEmployee/:id', ensureAdmin, async (req, res) => {
    const  id  = req.params.id;
    try {
        const employeeDelete = await knex('employees')
        .where('empid', id).del();
        if (!employeeDelete) {
            return res.status(404).send('Event not found');
        }
        res.redirect('/maintainEmployees');
    } catch (error) {
        console.error('Error deleting employee:', error);
        res.status(500).send('Internal Server Error');
    }
});

// maintain volunteers section
app.get('/maintainVolunteers', ensureAdmin, async (req, res) => {
    try {
        // Fetch all employee data
        const volunteers = await knex('volunteers').select('*'); // Adjust table name if necessary
        
        // Render the EJS page and pass the Volunteers data
        res.render('internalPages/maintainVolunteers', { title: 'Maintain Volunteer Records', volunteers });
    } catch (error) {
        console.error('Error fetching volunteers:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route to handle event form submission
app.post('/submit-event', async (req, res) => {
    const {
        ContactFirstName,
        ContactLastName,
        ContactPhone,
        ContactEmail,
        OrganizationName,
        Child,
        Teen,
        Adult,
        EventPreferredDate,
        EventPreferredTime,
        EventPossibleDate,
        EventPreferredDuration,
        SizeOfArea,
        service_type,
        BasicSewing,
        AdvancedSewing,
        SewingMachines,
        Sergers,
        StreetAddress,
        City,
        State,
        Zipcode,
        Story,
        willingToDonate
    } = req.body;

    const currentDate = new Date();
    const daterequestsent = currentDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const timerequestsent = currentDate.toTimeString().split(' ')[0]; // Format: HH:MM:SS

    try {
        const contact = await knex('eventcontact').insert({
            contactfirst: ContactFirstName,
            contactlast: ContactLastName,
            contactphone: ContactPhone,
            contactemail: ContactEmail
        }).returning('contactid');
        const contactid = contact[0].contactid;

        await knex('events').insert({
            daterequestsent,
            timerequestsent,
            eventprefdate: EventPreferredDate,
            eventpossdate: EventPossibleDate,
            participants: parseInt(Child) + parseInt(Teen) + parseInt(Adult),
            child: parseInt(Child),
            teen: parseInt(Teen),
            adult: parseInt(Adult),
            servicetype: service_type,
            basicsewing: BasicSewing || 0,
            advsewing: AdvancedSewing || 0,
            sewingmachines: SewingMachines || 0,
            sergers: Sergers || 0,
            streetaddress: StreetAddress,
            city: City,
            state: State,
            zipcode: Zipcode,
            sizeofarea: SizeOfArea, // Assuming this is left empty for now
            preftime: EventPreferredTime, // Assuming no preferred time given
            prefduration: EventPreferredDuration, // Assuming no preferred duration given
            organizationname: OrganizationName,
            story: Story,
            willingtodonate: willingToDonate === 'yes',
            eventstatus: 'Pending', // Default status for a new event request
            contactid
        });

        res.redirect('/'); // Redirect to a thank you page after successful submission
    } catch (error) {
        console.error('Error inserting event:', error);
        res.status(500).send('Internal Server Error');
    }
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


// app.post('/addEvent', ensureAdmin, async (req, res) => {
//     try {
//         // Ensure all form data is sanitized and converted as necessary
//         const formData = Object.fromEntries(
//             Object.entries(req.body).map(([key, value]) => [
//                 key,
//                 value === null || value === undefined ? null : value.toString().trim(),
//             ])
//         );

//         // Insert the data directly into the `events` table
//         await knex('events').insert(formData); // Ensure table columns align with keys in `req.body`

//         res.redirect('/maintainEvents'); // Adjust redirection as needed
//     } catch (error) {
//         console.error('Error inserting event data:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });


// Handle form submission
app.post('/addEvent', ensureAdmin, async (req, res) => {
    try {
        // Extract contact and event data from form
        const {
            contactfirst, contactlast, contactemail, contactphone, daterequestsent, timerequestsent,
            eventprefdate, eventpossdate, participants, child, teen, adult, servicetype, basicsewing,
            advsewing, sewingmachines, sergers, streetaddress, city, state, zipcode, sizeofarea,
            preftime, prefduration, organizationname, story, willingtodonate, eventstatus,
            actualdate, actualduration, actualeventtime, actualparticipants
        } = req.body;

        // Insert contact information into eventcontact table and get the contact ID
        const [insertedContact] = await knex('eventcontact').insert({
            contactfirst,
            contactlast,
            contactemail,
            contactphone
        }).returning('*');

        const contactId = insertedContact.contactid;

        // Insert event information into events table, including the contact ID
        await knex('events').insert({
            contactid: contactId,
            daterequestsent: daterequestsent || null,
            timerequestsent: timerequestsent || null,
            eventprefdate: eventprefdate || null,
            eventpossdate,
            participants: parseInt(participants) || 0,
            child: parseInt(child) || 0,
            teen: parseInt(teen) || 0,
            adult: parseInt(adult) || 0,
            servicetype,
            basicsewing: parseInt(basicsewing) || 0,
            advsewing: parseInt(advsewing) || 0,
            sewingmachines: parseInt(sewingmachines) || 0,
            sergers: parseInt(sergers) || 0,
            streetaddress,
            city,
            state,
            zipcode,
            sizeofarea,
            preftime: preftime || null,
            prefduration: parseFloat(prefduration) || null,
            organizationname,
            story,
            willingtodonate: willingtodonate === 'yes',
            eventstatus,
            actualdate: actualdate || null,
            actualduration: parseFloat(actualduration) || null,
            actualeventtime: actualeventtime || null,
            actualparticipants: parseInt(actualparticipants) || null,
        });

        res.redirect('/maintainEvents');
    } catch (error) {
        console.error('Error inserting data:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.get('/testingPage', async (req, res) => {
    try {
        // Query the database to get the sums grouped by 'component'
        const result = await knex('eventproducts')
            .select('component')
            .sum('started as started')
            .sum('continued as continued')
            .sum('finished as finished')
            .groupBy('component');

        // Sum totals across all components for the final row
        let totalStarted = 0;
        let totalContinued = 0;
        let totalFinished = 0;

        result.forEach(row => {
            totalStarted += parseInt(row.started, 10);
            totalContinued += parseInt(row.continued, 10);
            totalFinished += parseInt(row.finished, 10);
        });

        // Pass the result and totals to the EJS view
        res.render('internalPages/testingPage', {
            eventProducts: result,
            totalStarted: totalStarted,
            totalContinued: totalContinued,
            totalFinished: totalFinished
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving data from the database');
    }
});

  
  



// Start the server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}\nListening...`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please choose a different port.`);
        process.exit(1);
    } else {
        console.error('Unhandled error:', err);
        process.exit(1);
    }
});