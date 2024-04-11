const { DynamoDBClient, GetItemCommand, UpdateItemCommand } = require("@aws-sdk/client-dynamodb");
const { S3Client, GetObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require('fs');
const { Readable } = require('stream');

const REGION = 'us-east-2';

const s3 = new S3Client({ region: REGION });
const dynamodb = new DynamoDBClient({ region: REGION });

async function downloadFileFromS3(bucketName, objectKey, localFilePath) {
    try {
        const params = { Bucket: bucketName, Key: objectKey };
        const response = await s3.send(new GetObjectCommand(params));
        
        if (response.Body instanceof Readable) {
            const chunks = [];
            for await (const chunk of response.Body) {
                chunks.push(chunk);
            }
            const fileContent = Buffer.concat(chunks);
            fs.writeFileSync(localFilePath, fileContent);
        } else {
            fs.writeFileSync(localFilePath, response.Body);
        }

        console.log(`File downloaded successfully from S3 bucket '${bucketName}'`);
    } catch (error) {
        console.error(`Error downloading file from S3: ${error}`);
    }
}

async function uploadFileToS3(bucketName, objectKey, localFilePath) {
    try {
        const fileContent = fs.readFileSync(localFilePath);
        const params = { Bucket: bucketName, Key: objectKey, Body: fileContent };
        await s3.send(new PutObjectCommand(params));
        console.log(`File uploaded successfully to S3 bucket '${bucketName}'`);
    } catch (error) {
        console.error(`Error uploading file to S3: ${error}`);
    }
}

async function updateDynamodbItem(tableName, id, outputFilePath) {
    try {
        const params = {
            TableName: tableName,
            Key: { 'id': { 'S': id } },
            UpdateExpression: 'SET output_file_path = :val',
            ExpressionAttributeValues: { ':val': { 'S': outputFilePath } }
        };
        await dynamodb.send(new UpdateItemCommand(params));
        console.log(`Output file path '${outputFilePath}' added to DynamoDB item '${id}'`);
    } catch (error) {
        console.error(`Error updating DynamoDB item: ${error}`);
    }
}

async function getItemFromDynamodb(table, id) {
    try {
        const params = { TableName: table, Key: { 'id': { 'S': id } } };
        const response = await dynamodb.send(new GetItemCommand(params));
        return response.Item;
    } catch (error) {
        console.error(`Error getting item from DynamoDB table: ${error}`);
        return null;
    }
}

async function main(itemId) {
    const table = 'FileTable';
    const item = await getItemFromDynamodb(table, itemId);

    if (item) {
        console.log("Item retrieved successfully:");
        console.log(item);

        const inputFilePath = item.input_file_path?.S;
        if (inputFilePath) {
            const [S3_BUCKET, fileName] = inputFilePath.split('/');
            const localFilePath = fileName;
            await downloadFileFromS3(S3_BUCKET, inputFilePath, localFilePath);

            let fileContents = fs.readFileSync(localFilePath, 'utf-8');
            const inputText = item.input_text?.S;
            if (inputText) {
                fileContents += ` : ${inputText}`;
            }

            const outputFilePath = 'output.txt';
            fs.writeFileSync(outputFilePath, fileContents);
            const outputObjectKey = `${S3_BUCKET}/output.txt`;

            await uploadFileToS3(S3_BUCKET, outputObjectKey, outputFilePath);
            await updateDynamodbItem(table, itemId, outputObjectKey);
        } else {
            console.log("No input_file_path found in the DynamoDB item.");
        }
    }
}

if (process.argv.length < 3) {
    console.error("Usage: node script.js <itemId>");
    process.exit(1);
}

const itemId = process.argv[2];
main(itemId);
