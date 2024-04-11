import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { EC2Client, RunInstancesCommand } from "@aws-sdk/client-ec2";

const client = new DynamoDBClient({});


async function launchEC2Instance(id) {
    const ec2Client = new EC2Client({ region: 'us-east-2' });

    const script = `#!/bin/bash
                    cd home/ec2-user
                    aws s3 cp s3://fovusclgbucket/server.js server.js
                    node server.js ${id}
                    instance_id=$(ec2-metadata -i | cut -d ' ' -f 2)
                    echo "$instance_id"
                    aws ec2 terminate-instances --instance-ids $instance_id
                    `;

    const userData = Buffer.from(script).toString('base64');

    const params = {
        ImageId: 'ami-00ba7f889f4e78e66',
        InstanceType: 't2.micro',
        MinCount: 1,
        MaxCount: 1,
        UserData: userData,
        IamInstanceProfile: {
            Arn: 'arn:aws:iam::058264389781:instance-profile/EC2AccessToS3Role'
        }
    };

    const command = new RunInstancesCommand(params);

    try {
        const response = await ec2Client.send(command);
        const instanceId = response.Instances[0].InstanceId;
        console.log(`EC2 instance ${instanceId} launched.`);
        return instanceId;
    } catch (error) {
        console.error('Error launching EC2 instance:', error);
        throw error;
    }
}

export async function handler(event, context){
    try {
        console.log(event)
        
        const item = marshall({
            'id': event['id'],
            'input_text': event['textValue'],
            'input_file_path': event['filePath']
        });
        
        const params = {
            TableName: 'FileTable',
            Item: item
        };
        
        const command = new PutItemCommand(params);
      
        await client.send(command);
        
        const instanceId = await launchEC2Instance(event['id']);  

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Data saved successfully!', instanceId: instanceId })
        };
    } catch (error) {
        console.error('Error saving data to DynamoDB:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal server error' })
        };
    }
}