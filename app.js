// importing all dependencies for the application
const express = require ('express');
var mysql = require("mysql");
const bodyParser = require ('body-parser');
var AssistantV1 = require('watson-developer-cloud/assistant/v1');

// to note down the current timestamp
var moment = require('moment');
moment().format();

// an array that stores the context variables along with the phone number they are attached to 
var contexts = [];

//creating a new express app
const app = express();

//setting up Twilio client for sms
//obtained Twilio credentials from the dashboard
//client variable can now be used to make message requests
const twilio = require ('twilio');
const accountSid = 'ACf3e190410067a45bd2bd40bd0f597299';
const authToken = '2a2ffddf2b9584f6acb1fcb45fba1198';
const client = new twilio(accountSid, authToken);

//setting up the Node.js body parsing middleware
app.use(bodyParser.urlencoded({extended: false}))

//connect to sql database
var connection = mysql.createConnection({
  host     : "localhost",
  port     : "8889",
  user     : "root",
  password : "root",
  database : "mentalHealthBot"
});

connection.connect(function(err){
if(!err) {
    console.log("Database is connected ... nn");
    //var sql = "INSERT INTO userInfo (phoneNumber, timestamp, dataToOpenEHR) VALUES ('+123456789012', '2018-01-01 00:00:01',  'yes')";
  //  connection.query(sql, function(err, result){
    //  if(err) throw err;
    //  console.log("1 record inserted!");
    //});
} else {
    console.log("Error connecting database ... nn");
}
});


//setting up root with express
app.get('/', (req, res) => {
  res.end();
})


// setting up end point for POST request
//the incoming message is split up here into different parts to identify
//who the message was from, what number was it sent to (which is our twilio number)
//and the message body
//this endpoint will be contacted by Twilio whenever the user sends a message to the twilio number
app.post('/inbound', (req, res) => {
  //user phone number
  let from = req.body.From;

  //our Twilio phone number
  let to = req.body.To;

  //incoming message from user
  let body = req.body.Body;



  //console.log(body);
  //console.log("message from" + from);

//entering context logic
// firstly the app assumes the context is null
// next, the app checks whether a phone number has contacted us before and has a context variable in context []
// if it has contacted us before, the app will set the context variable to context[] array
// if it doesn't exist, context will remain null and will not be sent to IBM Watson

var context = null;
var index = 0;
var contextIndex = 0;
contexts.forEach(function(value) {
  console.log(value.from);
  if (value.from == from) {
    context = value.context;
    contextIndex = index;
  }
  index = index + 1;
});

console.log('Recieved message from ' + from + ' saying \'' + body  + '\'');

//initialising a new watson assistant variable
//using Watson Assistant credentials to establish a connection 

var assistant = new AssistantV1({
  username: 'bff905e5-1724-42df-b6ee-e342459fc3a0',
  password: 'h5aCPLsAdIAL',
  url: 'https://gateway.watsonplatform.net/assistant/api/',
  version: '2018-07-10'
});

//printing out the context
console.log(JSON.stringify(context));

//printing out the number of context variables 
console.log(contexts.length);


assistant.message({
  input: { text: body },
  workspace_id: 'b1fcf319-8095-4cf5-83f0-f7c79cfd87d2',
  context: context
 }, function(err, response) {
     if (err) {
       console.error(err);
     } else {
       console.log(response.output.text[0]);
       if (context == null) {
         contexts.push({'from': from, 'context': response.context});
       } else {
         contexts[contextIndex].context = response.context;
       }

       /*var intent = response.intents[0].intent;
       console.log(intent);
       if (intent == "bye") {
         //contexts.splice(contexts.indexOf({'from': from, 'context': response.context}),1);
         contexts.splice(contextIndex,1);
         // Call REST API here (order pizza, etc.)
       }*/

  

       client.messages.create({
         from: to,
         to: from,
         body: response.output.text[0]
       }, function(err, message) {
         if(err) {
           console.error(err.message);
         }
       });
     }
});


/*

//add code to check if the number who texted us has texted before or not
var sql3 = "SELECT dateOfInteraction, time, dataToOpenEHR FROM userInfo where phoneNumber = " + mysql.escape(from);
connection.query(sql3, function(err, result2, fields2){
  if(err) throw err;
  //checking if the person has interacted with the database before
  // if they have, a record of their past interactions is sent to them via text
  //if they have not, a new conversation is initiated
  if (result2.length>0){
  console.log(JSON.stringify(result2));
  client.messages.create({
    to:  `${from}`,
    from: `${to}`,
    body: `Hi! Welcome back to the Mental Health Chatbot! Your past interactions with the bot are as follows + ${JSON.stringify(result2)}`
    })
    .then(message => console.log(message.sid))
}
// no record of this number found in the database
//new conversation is initiated
else {
  client.messages.create({
    to: `${from}`,
    from:  `${to}`,
    body: 'Hi! Welcome to the Mental Health Chatbot!'
  })
  .then(message => console.log(message.sid))
}

});

*/
//can make two querries to present the result properly!!!!

//creating a timestamp to store the date and time of the user's interaction
//var mysqlTimestamp = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');

//storing the date of interaction
var mysqlDate = moment().format('YYYY-MM-DD');
console.log(mysqlDate);

//storing the time of interaction
var mysqlTime = moment().format('h:mm:ss');
console.log(mysqlTime);

//just adding who texted the twilio number into the db
      var sql2 = "INSERT INTO userInfo (phoneNumber, dateOfInteraction, dataToOpenEHR, time) VALUES ('" + from + "', '"+mysqlDate+"',  'yes','"+mysqlTime+"' )";
      connection.query(sql2, function(err, result){
        if(err) throw err;
        console.log("second record inserted!");
      });


  //ending the response
  res.end();
})
//setting up the server
// listening in on port 3000
// when successfully connnected console log the following
//whenever the command npm start is run, it is going to read this file and then
//connect to the database and then our server

app.listen(3000, () => {
  console.log('server connected');
})
