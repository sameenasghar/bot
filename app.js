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
const accountSid = 'ACe77f85b8f179cf98bd64a470014f4dda';
const authToken = '08510bcb1e578bab8a355ac77971f13a';
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

//initialising individual gad7 question scores which will be pushed to openEHR and will be used to calculate the test score
var gad1_score = 0;
var gad2_score = 0;
var gad3_score = 0;
var gad4_score = 0;
var gad5_score = 0;
var gad6_score = 0;
var gad7_score = 0;

//initialising total gad7 score
var gadTotal_score = 0;

//initialising PHQ9 indiviual question scores
var phq9_q1_score = 0;
var phq9_q2_score = 0;
var phq9_q3_score = 0;
var phq9_q4_score = 0;
var phq9_q5_score = 0;
var phq9_q6_score = 0;
var phq9_q7_score = 0;
var phq9_q8_score = 0;
var phq9_q9_score = 0;

//initialising total PHQ9 score
var phq9_total_score = 0;

//storing the date of interaction
var mysqlDate = moment().format('YYYY-MM-DD');
console.log(mysqlDate);

//storing the time of interaction
var mysqlTime = moment().format('h:mm:ss');
console.log(mysqlTime);

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

       
       //storing the dialog node number in a variable
       // this is done to check whether we have reached the end of the GAD7 questionnaire
       //here the score can be calulated by using the context variables stored 
       var dialog_node = response.output.nodes_visited[0];
       console.log("dialog node is" + dialog_node);
       //node for when GAD ends is node_21_1534912241144
       //if (dialog_node === "node_21_1534912241144") {
         //node for when bot asks user about openEHR after GAD7 questionnaire is: node_1_1535060425375
        if (dialog_node === "node_1_1535060425375") {  
         console.log('AT FINAL GAD7 NODE - ABOUT TO PROCESS SCORE');
         gad1_score = calculateScore(response.context.gad_1_entity);
         gad2_score = calculateScore(response.context.gad_2_entity);
         gad3_score = calculateScore(response.context.gad_3_entity);
         gad4_score = calculateScore(response.context.gad_4_entity);
         gad5_score = calculateScore(response.context.gad_5_entity);
         gad6_score = calculateScore(response.context.gad_6_entity);
         gad7_score = calculateScore(response.context.gad_7_entity);
         gadTotal_score = (gad1_score + gad2_score + gad3_score + gad4_score + gad5_score + gad6_score+ gad7_score);
         
         console.log('gad7 question 1 individual score is: ' + gad1_score );
         console.log('gad7 question 2 individual score is: ' + gad2_score );
         console.log('gad7 question 3 individual score is: ' + gad3_score );
         console.log('gad7 question 4 individual score is: ' + gad4_score );
         console.log('gad7 question 5 individual score is: ' + gad5_score );
         console.log('gad7 question 6 individual score is: ' + gad6_score );
         console.log('gad7 question 7 individual score is: ' + gad7_score );
         console.log('gad7 total score is: ' + gadTotal_score);

         //sending total score back to the user 
         client.messages.create({
          from: to,
          to: from,
          body: `Your GAD7 total score is  ${JSON.stringify(gadTotal_score)}`
        }, function(err, message) {
          if(err) {
            console.error(err.message);
          }
        });

        console.log('checking if this will even work:  ' + response.context.data_to_openEHR);
        var dataToOpenEHR = response.context.data_to_openEHR; 

      /*var sql2 = "INSERT INTO userInfo (phoneNumber, dateOfInteraction, dataToOpenEHR, time) VALUES ('" + from + "', '"+mysqlDate+"',  '"+dataToOpenEHR+"','"+mysqlTime+"' )";
      connection.query(sql2, function(err, result){
        if(err) throw err;
        console.log("TIMESTAMP OF USER INTERACTION WITH BOT INSERTED INTO THE DATABASE");
      });*/


      //sending user interaction data to our database
      //the only data being sent to the database in the user phone number, the date and time of interaction, and whether the user decided to push data to openEHR
      sendInteractionTimestampToDB(from, mysqlDate, dataToOpenEHR, mysqlTime);

      //finally, sending user information about the past interactions with the bot
      fetchPastUserInteractionInfo (from, to);

         //checking if the user has agreed to send data to openEHR or not
         if (dataToOpenEHR == "yes"){
  
           console.log('user has agreed to send data to openEHR');
           console.log ('printing var dataToOpenEHR: ' + dataToOpenEHR);
           //ADD OPEN EHR STUFF HERE
         }

         // SQL code to add user interaction timestamp to our database 

         
         //console.log('gq_1 is!!!!!!!!' + response.context.gq_1);

         //contexts.splice(contextIndex,1);
       } //checking if the user is at the last node of the PHQ9 dialogue
       //else if (dialog_node === "node_8_1534908120509"){
      //dialog node for when the user has been asked about sending data to openEHR after going through the PHQ9 questionnaire
        else if (dialog_node === "node_1_1535072171900"){
        

        console.log('AT FINAL PHQ9 NODE - ABOUT TO PROCESS SCORE');
        phq9_q1_score = calculateScore(response.context.phq_1_entity);
        phq9_q2_score = calculateScore(response.context.phq_2_entity);
        phq9_q3_score = calculateScore(response.context.phq_3_entity);
        phq9_q4_score = calculateScore(response.context.phq_4_entity);
        phq9_q5_score = calculateScore(response.context.phq_5_entity);
        phq9_q6_score = calculateScore(response.context.phq_6_entity);
        phq9_q7_score = calculateScore(response.context.phq_7_entity);
        phq9_q8_score = calculateScore(response.context.phq_8_entity);
        phq9_q9_score = calculateScore(response.context.phq_9_entity);
        phq9_total_score = (phq9_q1_score + phq9_q2_score + phq9_q3_score + phq9_q4_score + phq9_q5_score + phq9_q6_score + phq9_q7_score + phq9_q8_score + phq9_q9_score);
         
         console.log('phq9 question 1 individual score is: ' + phq9_q1_score );
         console.log('phq9 question 2 individual score is: ' + phq9_q2_score);
         console.log('phq9 question 3 individual score is: ' + phq9_q3_score );
         console.log('phq9 question 4 individual score is: ' + phq9_q4_score );
         console.log('phq9 question 5 individual score is: ' + phq9_q5_score );
         console.log('phq9 question 6 individual score is: ' + phq9_q6_score );
         console.log('phq9 question 7 individual score is: ' + phq9_q7_score );
         console.log('phq9 question 8 individual score is: ' + phq9_q8_score );
         console.log('phq9 question 9 individual score is: ' + phq9_q9_score );
         console.log('phq9 total score is: ' + phq9_total_score);

         //sending total score back to the user 
         client.messages.create({
          from: to,
          to: from,
          body: `Your PHQ9 total score is  ${JSON.stringify(phq9_total_score)}`
        }, function(err, message) {
          if(err) {
            console.error(err.message);
          }
        });

        console.log('checking if this will even work PLS WORK OR ELSE I AM DONE WITH U FFS' + response.context.data_to_openEHR);
        var dataToOpenEHR = response.context.data_to_openEHR; 
        
        //adding user timestamp to database after PHQ9 score has been generated
        /*var sql2 = "INSERT INTO userInfo (phoneNumber, dateOfInteraction, dataToOpenEHR, time) VALUES ('" + from + "', '"+mysqlDate+"',  '"+dataToOpenEHR+"','"+mysqlTime+"' )";
      connection.query(sql2, function(err, result){
        if(err) throw err;
        console.log("TIMESTAMP OF USER INTERACTION WITH BOT INSERTED INTO THE DATABASE");
      });*/

      //sending user interaction data to our database
      //the only data being sent to the database in the user phone number, the date and time of interaction, and whether the user decided to push data to openEHR
      sendInteractionTimestampToDB(from, mysqlDate, dataToOpenEHR, mysqlTime);

      //finally, sending user information about the past interactions with the bot
      fetchPastUserInteractionInfo (from, to);

         //checking if the user has agreed to send data to openEHR or not
         if (response.context.data_to_openEHR == "yes"){
           var dataToOpenEHR = response.context.data_to_openEHR; 
           console.log('user has agreed to send data to openEHR');
           console.log ('printing var dataToOpenEHR' + dataToOpenEHR);
           //ADD OPENEHR STUFF HERE
         }

       }

       /*var intent = response.intents[0].intent;
       console.log(intent);
       if (intent == "bye") {
         //contexts.splice(contexts.indexOf({'from': from, 'context': response.context}),1);
         contexts.splice(contextIndex,1);
         // Call REST API here 
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



//can make two querries to present the result properly!!!!

//creating a timestamp to store the date and time of the user's interaction
//var mysqlTimestamp = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');

//storing the date of interaction
/*var mysqlDate = moment().format('YYYY-MM-DD');
console.log(mysqlDate);

//storing the time of interaction
var mysqlTime = moment().format('h:mm:ss');
console.log(mysqlTime);*/




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


// this function associate the entities indentified in the gad7/phq9 questionnaire answers to a particular score
function calculateScore(entity){
	// each entity identifies corresponds to a particular score
  // 'not at all' corresponds to a score of 0
  //'several days corresponds to a score of 1
  //'more than half the days' corresponds to a score of 2
  // 'nearly every day' corresponds to a score of 3
    var score = 0;
	switch(entity){
		case 'not at all':
			return 0;
			break;
		case 'several days':
			return 1;
			break;
		case 'more than half the days':
			return 2;
			break;
		case 'nearly every day':
			return 3;
			break;
		default:
			return 20;
	}
}



//this function can be called after the user has completed the entire dialog flow
//it can be used to send the data about the user interaction to the SQL database
//the only data being stored in the database is the user phone number, the date and time of interaction and the user's decision to push data to openEHR or not
function sendInteractionTimestampToDB(userNumber, date, dataToOpenEHR_decision, timeOfInteraction){
  var sql3 = "INSERT INTO userInfo (phoneNumber, dateOfInteraction, dataToOpenEHR, time) VALUES ('" + userNumber + "', '"+date+"',  '"+dataToOpenEHR_decision+"','"+timeOfInteraction+"' )";
      connection.query(sql3, function(err, result){
        if(err) throw err;
        console.log("SUCCESS!! DATA PUSHED TO DATABASE USING FUNCTION sendInteractionTimestampToDB ");
      });
}



//this function is created to fetch past user interactions from the database
//it searches the database using the user's phone number and sends a message to their twilio number to let them know of the past interactions at the end of the chat

function fetchPastUserInteractionInfo (user_phone_number, twilioNumber){

//add code to check if the number who texted us has texted before or not
var sql4 = "SELECT dateOfInteraction, time, dataToOpenEHR FROM userInfo where phoneNumber = " + mysql.escape(user_phone_number);
connection.query(sql4, function(err, result2, fields2){
  if(err) throw err;
  //checking if the person has interacted with the database before
  // if they have, a record of their past interactions is sent to them via text
  //if they have not, a new conversation is initiated
  if (result2.length>0){
  console.log(JSON.stringify(result2));
  client.messages.create({
    to:  `${user_phone_number}`,
    from: `${twilioNumber}`,
    body: `Your past interactions with the bot are as follows + ${JSON.stringify(result2)}`
    })
    //.then(message => console.log(message.sid))
    console.log('function fetchPastUserInteractionInfo has been successful!!');
}
// if no record of this number found in the database

else {
  client.messages.create({
    to: `${user_phone_number}`,
    from:  `${twilioNumber}`,
    body: 'This was your first interaction with the bot'
  })
  //.then(message => console.log(message.sid))
  console.log('function fetchPastUserInteractionInfo has been successful!!');
}

});


}