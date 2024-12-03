let express = require("express");
// test
let app = express();

let path = require("path");

let security = false;

const port = process.env.PORT || 5500;

app.set("view engine", "ejs");

app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({extended: true})); // Makes it so the server can get the stuff out of the form //Id is for DOM, Name is for the server

app.use(express.static('public')); // Enabling public folder for css

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

app.get('/login-page', (req, res) => {
    res.render('pages/login-page', {title : 'Our Sponsors'})
})

app.get('/requestEvent', (req, res) => {
    res.render('pages/requestEvent', {title : 'Request Event'})
})


// Shows server is listening on start up
app.listen(port, () => console.log("Listening..."));
