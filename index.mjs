import { GetItemCommand, ScanCommand, PutItemCommand, DeleteItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall} from "@aws-sdk/util-dynamodb";
import { ddbClient } from "./ddbClient.mjs"
import { v4 as uuidv4 } from 'uuid';



    export const handler = async function(event) {
        console.log("event:", JSON.stringify(event, undefined, 2));

        // log.error(JSON.stringify(event))
        let body;
        try {
          switch (event.httpMethod) {
            case "POST": //POST ONE 

          
              body = await createReminder(event);
              break;
    
              case "GET": 
                //GET ONE BY ID
                  if (event.pathParameters != null) {
                      body = await getReminderbyId(event.pathParameters.id);
                  }
                  else {
                    //GET ALL 
                      body = await getAllReminders();
                  }
                  break;

            default:
              throw new Error(`Unsupported route: "${event.httpMethod}"`);

          }
          //outside switches
          console.log(body);
    
          //return correct headers and payload 
          return {
            statusCode: 200,
            body: JSON.stringify({
              message: `Successfully finished operation: "${event.httpMethod}"`,
              body: body
            }),
            'headers': {
                "Content-Type" : "application/json",
                "Access-Control-Allow-Origin" : "*",
                "Allow" : "GET, OPTIONS, POST",
                "Access-Control-Allow-Methods" : "GET, OPTIONS, POST",
                "Access-Control-Allow-Headers" : "*"
            }
          };      
        } catch (e) {
          console.error(e);
          return {
            statusCode: 500,
            body: JSON.stringify({
              message: "Failed to perform operation.",
              errorMsg: e.message,
              errorStack: e.stack,
            })
          };
        }  
    };


const createReminder = async (event) => {
    try {
        console.log(`createReminder function. event : "${event}"`);
        //parse json object 
        const reminderRequest = JSON.parse(event.body);
        // set id inside the json object 
        const uuid = uuidv4();
        reminderRequest.uuid = uuid;
        const epoch = Math.floor(reminderRequest.ttl / 1000)
       reminderRequest.ttl = epoch;

        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            Item: marshall(reminderRequest || {})
        };

        const createResult = await ddbClient.send(new PutItemCommand(params));
        console.log(createResult);
        return createResult;

    } catch (e) {
        console.error(e);
        throw e;
    }
}
      //uuid unique identitifer : partition key 
      //user_id : string email address of the  user 
      // ttl : number that is remaining time for the reminder in seconds 
      // message: string 
// 1709362152927  timestamp in one month => 1709362152 timestamp in one month unix timestamp


const getReminderbyId = async (userid) => {
    console.log("getReminderbyId"); // shows up in cloudwatch logs  
    try {

        let emailId;
        emailId = userid;

        const params = {
            TableName: process.env.DYNAMODB_TABLE_NAME,
            
            ExpressionAttributeNames: {
                "#M": "message", 
                "#T": "ttl"
               }, 
            ExpressionAttributeValues: {
                ":a": {
                  S: emailId
                 }
               }, 
               FilterExpression: "user_id = :a", 
               ProjectionExpression: "#M, #T", 

            // ProjectionExpression:"user_id, message, #ttl",
            // ExpressionAttributeValues: {
            //     "#ttl": "ttl"
            //   },
            // KeyConditionExpression:Key("user_id").eq(emailId),            
          };
        

          console.log("this is the params" + JSON.stringify(params))


    
    const { Items } = await ddbClient.send(new ScanCommand(params));    
    console.log("response for specific id "+ JSON.stringify(Items))

    return (Items) ? Items.map((item) => unmarshall(item)) : {};

    } catch(e) {
      console.error(e);
      throw e;
    }
  }


const getAllReminders = async () => {
    try {
      const params = {
        TableName: process.env.DYNAMODB_TABLE_NAME //environment variables defined
      };
   
      //DynamoDBClient: abstract class to send and receive information 
      const { Items } = await ddbClient.send(new ScanCommand(params));    

      console.log(Items); // cloudwatch logs 
      return (Items) ? Items.map((item) => unmarshall(item)) : {};
      //https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-util-dynamodb/Variable/unmarshall/
      //unmarshall documentation: converts a dynamodb record into a js object 
      

    } catch(e) {
      console.error(e);
      throw e;
    }
  }