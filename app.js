// importing all dependencies for the application
const express = require ('express');
var mysql = require("mysql");
const bodyParser = require ('body-parser');
var AssistantV1 = require('watson-developer-cloud/assistant/v1');
var axios = require ('axios');
var request = require ('request');

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
const accountSid = 'ACb5eb967c5ccebb6aa05c5f91f1790268';
const authToken = '3b32f5c5694321dc7c76f3203ee7ca15';
const client = new twilio(accountSid, authToken);

//setting up the Node.js body parsing middleware
app.use(bodyParser.urlencoded({extended: false}))

app.use(bodyParser.json()); // support json encoded bodies

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

//declaring variables to store the GAD7 international codes that will get sent to the open health records (OpenEHR) clinical data repository
var gad7_1_code;
var gad7_2_code;
var gad7_3_code;
var gad7_4_code;
var gad7_5_code;
var gad7_6_code;
var gad7_7_code;



//declaring variables to store the GPHQ9 international codes that will get sent to the open health records (OpenEHR) clinical data repository
var phq9_1_code;
var phq9_2_code;
var phq9_3_code;
var phq9_4_code;
var phq9_5_code;
var phq9_6_code;
var phq9_7_code;
var phq9_8_code;
var phq9_9_code;


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

           console.log('generating codes for GAD7 scores for openEHR');
           gad7_1_code = mapScoresToOpenEHRcodes(response.context.gad_1_entity);
           gad7_2_code = mapScoresToOpenEHRcodes(response.context.gad_2_entity);
           gad7_3_code = mapScoresToOpenEHRcodes(response.context.gad_3_entity);
           gad7_4_code = mapScoresToOpenEHRcodes(response.context.gad_4_entity);
           gad7_5_code = mapScoresToOpenEHRcodes(response.context.gad_5_entity);
           gad7_6_code = mapScoresToOpenEHRcodes(response.context.gad_6_entity);
           gad7_7_code = mapScoresToOpenEHRcodes(response.context.gad_7_entity);


          console.log('gad7 question 1 code for openEHR is: ' + gad7_1_code);
          console.log('gad7 question 2 code for openEHR is: ' + gad7_2_code);
          console.log('gad7 question 3 code for openEHR is: ' + gad7_3_code);
          console.log('gad7 question 4 code for openEHR is: ' + gad7_4_code);
          console.log('gad7 question 5 code for openEHR is: ' + gad7_5_code);
          console.log('gad7 question 6 code for openEHR is: ' + gad7_6_code);
          console.log('gad7 question 7 code for openEHR is: ' + gad7_7_code);
        


           
           console.log('SENDING GAD7 DATA TO OPENEHR!!!!!!!!');
           console.log('gq1 is' + response.context.gq_1 );
           console.log('gad7 1 code  is' + gad7_1_code);
           //sendGad7DataToOpenEHR(JSON.stringify(response.context.gq_1), JSON.stringify(response.context.gq_2), JSON.stringify(response.context.gq_3), JSON.stringify(gad7_1_code), JSON.stringify(gad7_2_code), JSON.stringify(gad7_3_code), JSON.stringify(gad7_4_code), JSON.stringify(gad7_5_code), JSON.stringify(gad7_6_code), JSON.stringify(gad7_7_code), JSON.stringify(gadTotal_score));
           sendGad7DataToOpenEHR(response.context.gq_1, response.context.gq_2, response.context.gq_3, gad7_1_code, gad7_2_code, gad7_3_code, gad7_4_code, gad7_5_code, gad7_6_code, gad7_7_code, gadTotal_score);
           console.log('GETTING DATA BACK FROM OPENEHR!!!!!!!!!');
           //getDataFromOpenEHR ();
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

           console.log('generating codes for PHQ9 scores for openEHR');
           phq9_1_code = mapScoresToOpenEHRcodes(response.context.phq_1_entity);
           phq9_2_code = mapScoresToOpenEHRcodes(response.context.phq_2_entity);
           phq9_3_code = mapScoresToOpenEHRcodes(response.context.phq_3_entity);
           phq9_4_code = mapScoresToOpenEHRcodes(response.context.phq_4_entity);
           phq9_5_code = mapScoresToOpenEHRcodes(response.context.phq_5_entity);
           phq9_6_code = mapScoresToOpenEHRcodes(response.context.phq_6_entity);
           phq9_7_code = mapScoresToOpenEHRcodes(response.context.phq_7_entity);
           phq9_8_code = mapScoresToOpenEHRcodes(response.context.phq_8_entity);
           phq9_9_code = mapScoresToOpenEHRcodes(response.context.phq_9_entity);

          console.log('PHQ9 question 1 code for openEHR is: ' + phq9_1_code);
          console.log('PHQ9 question 2 code for openEHR is: ' + phq9_2_code);
          console.log('PHQ9 question 3 code for openEHR is: ' + phq9_3_code);
          console.log('PHQ9 question 4 code for openEHR is: ' + phq9_4_code);
          console.log('PHQ9 question 5 code for openEHR is: ' + phq9_5_code);
          console.log('PHQ9 question 6 code for openEHR is: ' + phq9_6_code);
          console.log('PHQ9 question 7 code for openEHR is: ' + phq9_7_code);
          console.log('PHQ9 question 8 code for openEHR is: ' + phq9_8_code);
          console.log('PHQ9 question 9 code for openEHR is: ' + phq9_9_code);

           console.log('SENDING PHQ 9 DATA TO OPENEHR!!!!!!!!');
           sendPhq9DataToOpenEHR();
           console.log('GETTING DATA BACK FROM OPENEHR!!!!!!!!!');
           getDataFromOpenEHR ();

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

function sendGad7DataToOpenEHR (general_question_1, general_question_2, general_question_3, gad7_code_1, gad7_code_2, gad7_code_3, gad7_code_4, gad7_code_5, gad7_code_6, gad7_code_7, questionnaire_total_score){

var options = { method: 'POST',
  url: 'https://test.operon.systems/rest/v1/composition',
  qs: 
   { ehrId: 'c831fe4d-0ce9-4a63-8bfa-2c51007f97e5',
     //templateId: 'Mental%20Health%20Triage-v0',
     templateId: 'Mental Health Triage-v0',
     committerName: 'Mental Health Chatbot',
     format: 'FLAT' },
  headers: 
   { //'Postman-Token': 'c64b6cc5-bc13-41cf-886f-1a7b166d2995',
     'Cache-Control': 'no-cache',
     'Content-Type': 'application/json',
     'Ehr-Session-disabled': 'e38eb2c7-85ba-40cd-9a9c-9e4cbca50fb8',
     Authorization: 'Basic b3Bybl9qYXJyb2Q6WmF5RllDaU82NDQ=' },
  body: 
   { 'ctx/language': 'en',
     'ctx/territory': 'GB',
     'ctx/composer_name': 'Mental Health Chatbot',
     'ctx/time': '2018-05-29T16:18:14.444+02:00',
     'ctx/id_namespace': 'PARTY_SELF',
     'ctx/id_scheme': 'PARTY_SELF',
     'ctx/health_care_facility|name': 'Home',
     'ctx/health_care_facility|id': '0000',
     'mental_health_triage/story_history:0/symptom_sign:0/symptom_sign_name': 'ANXIETY',
     'mental_health_triage/story_history:0/symptom_sign:0/description': `${general_question_1}`,
     'mental_health_triage/story_history:0/symptom_sign:0/precipitating_factor:0/trigger': `${general_question_2}`,
     'mental_health_triage/story_history:0/symptom_sign:0/precipitating_factor:0/description': `${general_question_3}`,
     'mental_health_triage/gad-7/feeling_nervous_anxious_or_on_edge|code': `${gad7_code_1}`,
     'mental_health_triage/gad-7/not_being_able_to_stop_or_control_worrying|code': `${gad7_code_2}`,
     'mental_health_triage/gad-7/worrying_too_much_about_different_things|code': `${gad7_code_3}`,
     'mental_health_triage/gad-7/trouble_relaxing|code': `${gad7_code_4}`,
     'mental_health_triage/gad-7/being_so_restless_it_is_hard_to_sit_still|code': `${gad7_code_5}`,
     'mental_health_triage/gad-7/becoming_easily_annoyed_or_irritable|code': `${gad7_code_5}`,
     'mental_health_triage/gad-7/feeling_afraid_as_it_something_awful_might_happen|code': `${gad7_code_7}`,
     'mental_health_triage/gad-7/total_score': questionnaire_total_score },

  json: true };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});

}

function sendPhq9DataToOpenEHR (){


  var options = { method: 'POST',
    url: 'https://test.operon.systems/rest/v1/composition',
    qs: 
     { ehrId: 'c831fe4d-0ce9-4a63-8bfa-2c51007f97e5',
       //templateId: 'Mental%20Health%20Triage-v0',
       templateId: 'Mental Health Triage-v0',
       committerName: 'Mental Health Chatbot',
       format: 'FLAT' },
    headers: 
     { //'Postman-Token': 'c64b6cc5-bc13-41cf-886f-1a7b166d2995',
       'Cache-Control': 'no-cache',
       'Content-Type': 'application/json',
       'Ehr-Session-disabled': 'e38eb2c7-85ba-40cd-9a9c-9e4cbca50fb8',
       Authorization: 'Basic b3Bybl9qYXJyb2Q6WmF5RllDaU82NDQ=' },
    body: 
     { 'ctx/language': 'en',
       'ctx/territory': 'GB',
       'ctx/composer_name': 'Mental Health Chatbot',
       'ctx/time': '2018-05-29T16:18:14.444+02:00',
       'ctx/id_namespace': 'PARTY_SELF',
       'ctx/id_scheme': 'PARTY_SELF',
       'ctx/health_care_facility|name': 'Home',
       'ctx/health_care_facility|id': '0000',
       'mental_health_triage/story_history:0/symptom_sign:1/symptom_sign_name': 'Feeling down',
       'mental_health_triage/story_history:0/symptom_sign:1/description': 'I have been feeling very down and depressed',
       'mental_health_triage/story_history:0/symptom_sign:1/precipitating_factor:0/trigger': 'Job worries',
       'mental_health_triage/story_history:0/symptom_sign:1/precipitating_factor:0/description': 'My job is under threat',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/interest_pleasure|code': 'at0005',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/feeling_down|code': 'at0007',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/sleep_issues|code': 'at0008',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/tired_little_energy|code': 'at0006',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/appetite|code': 'at0008',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/feeling_bad_about_yourself|code': 'at0006',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/trouble_concentrating|code': 'at0008',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/slowness_fidgety|code': 'at0008',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/death_self-harm|code': 'at0008',
       'mental_health_triage/patient_health_questionnaire-9_phq-9/phq-9_score': 19 },
    json: true };
  
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
  
    console.log(body);
  });
  
  }


function getDataFromOpenEHR () {
  var options = { method: 'GET',
  url: 'https://test.operon.systems/rest/v1/composition/96180551-2554-4164-ac12-20bc36b7edd7::jarrod.oprn.ehrscape.com::1',
  qs: { format: 'FLAT' },
  headers: 
   { //'Postman-Token': 'f4f486f3-1e6d-4b83-a504-13408dcb0187',
     'Cache-Control': 'no-cache',
     'Auth-Token': '{{Auth-Token}}',
     'Ehr-Session-disabled': 'e38eb2c7-85ba-40cd-9a9c-9e4cbca50fb8',
     Authorization: 'Basic b3Bybl9qYXJyb2Q6WmF5RllDaU82NDQ=',
     'Content-Type': 'application/json' } };

request(options, function (error, response, body) {
  if (error) throw new Error(error);

  console.log(body);
});



}


//UPDATES THESE NEED THE CORRECT ATCODES EHRE!!!!!!!!!!
// this function associate the entities indentified in the gad7/phq9 questionnaire answers to their international codes that need to be stored in the openEHR clinical data repository 
function mapScoresToOpenEHRcodes(entity){
	// each entity identified corresponds to a particular score
  // 'not at all' corresponds to the code at0005
  //'several days corresponds to the code at0006
  //'more than half the days' corresponds to the code at0007
  // 'nearly every day' corresponds to the code at0008

	switch(entity){
		case 'not at all':
			return 'at0034';
			break;
		case 'several days':
			return 'at0010';
			break;
		case 'more than half the days':
			return 'at0031';
			break;
		case 'nearly every day':
			return 'at0042';
			break;
		default:
			return 'at0034';
	}
}